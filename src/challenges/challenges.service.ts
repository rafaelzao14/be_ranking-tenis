import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChallengeStatus } from '../database/enums';
import { Challenge } from '../database/entities/challenge.entity';
import { Player } from '../database/entities/player.entity';
import { CreateChallengeDto } from './dto/challenges.dto';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
  ) {}

  async list(status?: ChallengeStatus) {
    return this.challengeRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      relations: { challenger: true, challenged: true, match: true },
    });
  }

  async create(dto: CreateChallengeDto) {
    const { challengerId, challengedId } = dto;

    if (challengerId === challengedId) {
      throw new BadRequestException('Desafiante e desafiada não podem ser a mesma.');
    }

    const [challenger, challenged] = await Promise.all([
      this.playerRepo.findOne({ where: { id: challengerId } }),
      this.playerRepo.findOne({ where: { id: challengedId } }),
    ]);

    if (!challenger || !challenged) {
      throw new NotFoundException('Atleta não encontrada.');
    }

    if (!challenger.active || !challenged.active) {
      throw new BadRequestException('Atleta inativa.');
    }

    if (!challenger.participates || !challenged.participates) {
      throw new BadRequestException('Atleta não participa do ranking do ano.');
    }

    if (challenged.currentRank == null) {
      throw new BadRequestException('A desafiada precisa ter ranking definido.');
    }

    const maxAbove = 6;
    if (challenger.currentRank != null) {
      if (challenger.currentRank <= challenged.currentRank) {
        throw new BadRequestException('Desafio inválido: desafiada precisa estar acima.');
      }

      const diff = challenger.currentRank - challenged.currentRank;
      if (diff > maxAbove) {
        throw new BadRequestException(`Só pode desafiar até ${maxAbove} posições acima.`);
      }
    }

    const activeChallenge = await this.challengeRepo.findOne({
      where: {
        challengerId,
        status: In([ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED]),
      },
    });

    if (activeChallenge) {
      throw new BadRequestException('Essa atleta já tem um desafio ativo.');
    }

    const days = dto.expiresInDays ?? 10;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const created = this.challengeRepo.create({
      challengerId,
      challengedId,
      expiresAt,
      status: ChallengeStatus.PENDING,
    });

    const saved = await this.challengeRepo.save(created);
    return this.challengeRepo.findOne({
      where: { id: saved.id },
      relations: { challenger: true, challenged: true },
    });
  }

  async remove(id: string) {
    const challenge = await this.challengeRepo.findOne({ where: { id } });
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }

    if (challenge.status === ChallengeStatus.COMPLETED) {
      throw new BadRequestException('Não é possível excluir um desafio já finalizado.');
    }

    await this.challengeRepo.delete({ id });
    return { ok: true };
  }
}
