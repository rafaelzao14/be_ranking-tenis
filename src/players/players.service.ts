import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../database/entities/player.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
  ) {}

  async list() {
    return this.playerRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getById(id: string) {
    const player = await this.playerRepo.findOne({ where: { id } });
    if (!player) {
      throw new NotFoundException('Atleta não encontrada.');
    }
    return player;
  }

  async create(dto: CreatePlayerDto) {
    const participates = dto.participates ?? true;
    const requestedRank = participates ? (dto.currentRank ?? null) : null;

    const birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.birthDate && Number.isNaN(birthDate?.getTime())) {
      throw new BadRequestException('birthDate inválido.');
    }

    if (requestedRank !== null) {
      const existingRank = await this.playerRepo.findOne({ where: { currentRank: requestedRank } });
      if (existingRank) {
        throw new BadRequestException('Já existe atleta com esse rank.');
      }
    }

    const created = this.playerRepo.create({
      name: dto.name,
      phone: dto.phone ?? null,
      birthDate,
      active: dto.active ?? true,
      participates,
      currentRank: requestedRank,
    });

    return this.playerRepo.save(created);
  }

  async update(id: string, dto: UpdatePlayerDto) {
    const player = await this.playerRepo.findOne({ where: { id } });
    if (!player) {
      throw new NotFoundException('Atleta não encontrada.');
    }

    const payload: UpdatePlayerDto = { ...dto };

    if (payload.participates === false) {
      payload.currentRank = null;
    }

    if (payload.currentRank !== undefined && payload.currentRank !== null) {
      const existingRank = await this.playerRepo.findOne({ where: { currentRank: payload.currentRank } });
      if (existingRank && existingRank.id !== id) {
        throw new BadRequestException('Já existe atleta com esse rank.');
      }
    }

    if (payload.birthDate !== undefined && payload.birthDate !== null) {
      const parsedDate = new Date(payload.birthDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException('birthDate inválido.');
      }
    }

    player.name = payload.name ?? player.name;
    player.phone = payload.phone === undefined ? player.phone : payload.phone;
    player.active = payload.active ?? player.active;
    player.participates = payload.participates ?? player.participates;
    player.currentRank = payload.currentRank === undefined ? player.currentRank : payload.currentRank;

    if (payload.birthDate !== undefined) {
      player.birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
    }

    return this.playerRepo.save(player);
  }
}
