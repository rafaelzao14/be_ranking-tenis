import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './entities/challenge.entity';
import { Match } from './entities/match.entity';
import { Player } from './entities/player.entity';
import { RankHistory } from './entities/rank-history.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Player, Challenge, Match, RankHistory],
      synchronize: false,
      logging: false,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
