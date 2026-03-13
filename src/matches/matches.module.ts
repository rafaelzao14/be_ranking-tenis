import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '../database/entities/challenge.entity';
import { Match } from '../database/entities/match.entity';
import { Player } from '../database/entities/player.entity';
import { RankHistory } from '../database/entities/rank-history.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Player, Challenge, Match, RankHistory])],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
