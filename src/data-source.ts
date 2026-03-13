import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Challenge } from './database/entities/challenge.entity';
import { Match } from './database/entities/match.entity';
import { Player } from './database/entities/player.entity';
import { RankHistory } from './database/entities/rank-history.entity';

const useUrl = Boolean(process.env.DATABASE_URL);

export default new DataSource({
  type: 'postgres',
  ...(useUrl
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  entities: [Player, Challenge, Match, RankHistory],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    family: 4,
  },
});
