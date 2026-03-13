import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChallengeStatus, MatchType } from '../database/enums';
import { Challenge } from '../database/entities/challenge.entity';
import { Match } from '../database/entities/match.entity';
import { Player } from '../database/entities/player.entity';
import { RankHistory } from '../database/entities/rank-history.entity';
import { CreateMatchDto, MatchesQueryDto } from './dto/matches.dto';

type RankedPlayer = { id: string; currentRank: number | null };

@Injectable()
export class MatchesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  async list(query: MatchesQueryDto) {
    let start: Date | undefined;
    let endExclusive: Date | undefined;

    if (query.month) {
      const [y, m] = query.month.split('-').map(Number);
      start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    }

    const qb = this.matchRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.player1', 'player1')
      .leftJoinAndSelect('m.player2', 'player2')
      .leftJoinAndSelect('m.winner', 'winner')
      .leftJoinAndSelect('m.challenge', 'challenge')
      .orderBy('m.playedAt', 'DESC');

    if (query.type) {
      qb.andWhere('m.type = :type', { type: query.type });
    }

    if (query.playerId) {
      qb.andWhere('(m.player1Id = :playerId OR m.player2Id = :playerId)', { playerId: query.playerId });
    }

    if (start && endExclusive) {
      qb.andWhere('m.playedAt >= :start AND m.playedAt < :endExclusive', { start, endExclusive });
    }

    return qb.getMany();
  }

  async create(dto: CreateMatchDto) {
    const wo = dto.wo ?? false;
    const playedAt = dto.playedAt ? new Date(dto.playedAt) : new Date();

    if (Number.isNaN(playedAt.getTime())) {
      throw new BadRequestException('playedAt inválido.');
    }

    if (dto.player1Id === dto.player2Id) {
      throw new BadRequestException('Partida inválida.');
    }

    if (dto.winnerId !== dto.player1Id && dto.winnerId !== dto.player2Id) {
      throw new BadRequestException('winnerId deve ser player1Id ou player2Id.');
    }

    if (dto.type === MatchType.CHALLENGE && !dto.challengeId) {
      throw new BadRequestException('challengeId é obrigatório.');
    }

    if (!wo && dto.sets1 === dto.sets2) {
      throw new BadRequestException('Placar inválido: empate.');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const playerRepo = manager.getRepository(Player);
      const challengeRepo = manager.getRepository(Challenge);
      const matchRepo = manager.getRepository(Match);
      const rankHistoryRepo = manager.getRepository(RankHistory);

      const [p1, p2] = await Promise.all([
        playerRepo.findOne({ where: { id: dto.player1Id } }),
        playerRepo.findOne({ where: { id: dto.player2Id } }),
      ]);

      if (!p1 || !p2) {
        throw new BadRequestException('Atleta não encontrada.');
      }

      if (dto.type === MatchType.CHALLENGE) {
        const challenge = await challengeRepo.findOne({ where: { id: dto.challengeId } });
        if (!challenge) {
          throw new BadRequestException('Desafio não encontrado.');
        }

        if (challenge.status !== ChallengeStatus.PENDING && challenge.status !== ChallengeStatus.ACCEPTED) {
          throw new BadRequestException('Desafio não está ativo.');
        }

        if (challenge.challengerId !== dto.player1Id || challenge.challengedId !== dto.player2Id) {
          throw new BadRequestException('Desafio não corresponde às atletas (player1=desafiante, player2=desafiada).');
        }
      }

      const match = await matchRepo.save(
        matchRepo.create({
          type: dto.type,
          challengeId: dto.challengeId ?? null,
          player1Id: dto.player1Id,
          player2Id: dto.player2Id,
          sets1: dto.sets1,
          sets2: dto.sets2,
          winnerId: dto.winnerId,
          wo,
          playedAt,
        }),
      );

      let ladder: {
        type: 'RANKED_CHALLENGER_WIN' | 'TBD_CHALLENGER_WIN';
        rankBefore: { challenger: number | null; challenged: number };
        rankAfter: { challenger: number; challenged: number };
      } | null = null;

      if (dto.type === MatchType.CHALLENGE && dto.winnerId === dto.player1Id) {
        if (p2.currentRank == null) {
          throw new BadRequestException('A desafiada está sem ranking.');
        }

        if (p1.currentRank != null) {
          const rb = p1.currentRank;
          const ra = p2.currentRank;

          if (rb <= ra) {
            throw new BadRequestException('Ranking inconsistente: desafiante não está abaixo.');
          }

          const affectedBefore = await playerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.currentRank AS "currentRank"'])
            .where('p.currentRank >= :ra AND p.currentRank <= :rb', { ra, rb })
            .getRawMany<RankedPlayer>();

          const beforeMap = new Map(affectedBefore.map((x) => [x.id, x.currentRank]));

          await playerRepo.update({ id: dto.player1Id }, { currentRank: null });

          const maxRow = await playerRepo
            .createQueryBuilder('p')
            .select('MAX(p.currentRank)', 'max')
            .getRawOne<{ max: string | null }>();
          const maxRank = Number(maxRow?.max ?? 0);
          const offset = maxRank + 1000;

          await manager.query(
            'UPDATE "Player" SET "currentRank" = "currentRank" + $1 WHERE "currentRank" >= $2 AND "currentRank" < $3',
            [offset, ra, rb],
          );

          await manager.query(
            'UPDATE "Player" SET "currentRank" = "currentRank" - $1 WHERE "currentRank" >= $2 AND "currentRank" < $3',
            [offset - 1, ra + offset, rb + offset],
          );

          await playerRepo.update({ id: dto.player1Id }, { currentRank: ra });

          const affectedAfter = await playerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.currentRank AS "currentRank"'])
            .where('p.id IN (:...ids)', { ids: affectedBefore.map((x) => x.id) })
            .getRawMany<RankedPlayer>();
          const afterMap = new Map(affectedAfter.map((x) => [x.id, x.currentRank]));

          await rankHistoryRepo.insert(
            affectedBefore.map((item) => ({
              matchId: match.id,
              playerId: item.id,
              rankBefore: beforeMap.get(item.id) ?? item.currentRank ?? 0,
              rankAfter: afterMap.get(item.id) ?? item.currentRank ?? 0,
            })),
          );

          ladder = {
            type: 'RANKED_CHALLENGER_WIN',
            rankBefore: { challenger: rb, challenged: ra },
            rankAfter: { challenger: ra, challenged: ra + 1 },
          };
        } else {
          const ra = p2.currentRank;

          const affectedBefore = await playerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.currentRank AS "currentRank"'])
            .where('p.currentRank >= :ra', { ra })
            .orderBy('p.currentRank', 'ASC')
            .getRawMany<RankedPlayer>();

          const beforeMap = new Map(affectedBefore.map((x) => [x.id, x.currentRank]));

          const maxRow = await playerRepo
            .createQueryBuilder('p')
            .select('MAX(p.currentRank)', 'max')
            .getRawOne<{ max: string | null }>();
          const maxRank = Number(maxRow?.max ?? 0);
          const offset = maxRank + 1000;

          await manager.query('UPDATE "Player" SET "currentRank" = "currentRank" + $1 WHERE "currentRank" >= $2', [
            offset,
            ra,
          ]);

          await manager.query('UPDATE "Player" SET "currentRank" = "currentRank" - $1 WHERE "currentRank" >= $2', [
            offset - 1,
            ra + offset,
          ]);

          await playerRepo.update({ id: dto.player1Id }, { currentRank: ra });

          const affectedIds = [...affectedBefore.map((x) => x.id), dto.player1Id];
          const affectedAfter = await playerRepo
            .createQueryBuilder('p')
            .select(['p.id AS id', 'p.currentRank AS "currentRank"'])
            .where('p.id IN (:...ids)', { ids: affectedIds })
            .getRawMany<RankedPlayer>();
          const afterMap = new Map(affectedAfter.map((x) => [x.id, x.currentRank]));

          await rankHistoryRepo.insert(
            affectedBefore.map((item) => ({
              matchId: match.id,
              playerId: item.id,
              rankBefore: beforeMap.get(item.id) ?? item.currentRank ?? 0,
              rankAfter: afterMap.get(item.id) ?? item.currentRank ?? 0,
            })),
          );

          await rankHistoryRepo.insert({
            matchId: match.id,
            playerId: dto.player1Id,
            rankBefore: 0,
            rankAfter: ra,
          });

          ladder = {
            type: 'TBD_CHALLENGER_WIN',
            rankBefore: { challenger: null, challenged: ra },
            rankAfter: { challenger: ra, challenged: ra + 1 },
          };
        }
      } else {
        await rankHistoryRepo.insert([
          {
            matchId: match.id,
            playerId: dto.player1Id,
            rankBefore: p1.currentRank ?? 0,
            rankAfter: p1.currentRank ?? 0,
          },
          {
            matchId: match.id,
            playerId: dto.player2Id,
            rankBefore: p2.currentRank ?? 0,
            rankAfter: p2.currentRank ?? 0,
          },
        ]);
      }

      if (dto.type === MatchType.CHALLENGE && dto.challengeId) {
        await challengeRepo.update({ id: dto.challengeId }, { status: ChallengeStatus.COMPLETED });
      }

      return { matchId: match.id, ladder };
    });

    return result;
  }
}
