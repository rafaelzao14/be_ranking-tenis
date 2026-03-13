import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '../database/entities/challenge.entity';
import { Player } from '../database/entities/player.entity';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge, Player])],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
