import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async overview() {
    const mostPlayed = await this.dataSource.query(`
      SELECT p.id as player_id, p.name,
            COUNT(m.id)::int as games
      FROM "Player" p
      JOIN "Match" m ON (m."player1Id" = p.id OR m."player2Id" = p.id)
      WHERE p."participates" = true AND p."currentRank" IS NOT NULL
      GROUP BY p.id, p.name
      ORDER BY games DESC
      LIMIT 10;
    `);

    const mostWins = await this.dataSource.query(`
      SELECT p.id as player_id, p.name,
            COUNT(m.id)::int as wins
      FROM "Player" p
      JOIN "Match" m ON m."winnerId" = p.id
      WHERE p."participates" = true AND p."currentRank" IS NOT NULL
      GROUP BY p.id, p.name
      ORDER BY wins DESC
      LIMIT 10;
    `);

    const mostAttacks = await this.dataSource.query(`
      SELECT p.id as player_id, p.name,
            COUNT(m.id)::int as attacks
      FROM "Player" p
      JOIN "Match" m ON m."player1Id" = p.id
      WHERE p."participates" = true AND p."currentRank" IS NOT NULL
        AND m.type = 'CHALLENGE' AND m."winnerId" = m."player1Id"
      GROUP BY p.id, p.name
      ORDER BY attacks DESC
      LIMIT 10;
    `);

    const mostDefenses = await this.dataSource.query(`
      SELECT p.id as player_id, p.name,
            COUNT(m.id)::int as defenses
      FROM "Player" p
      JOIN "Match" m ON m."player2Id" = p.id
      WHERE p."participates" = true AND p."currentRank" IS NOT NULL
        AND m.type = 'CHALLENGE' AND m."winnerId" = m."player2Id"
      GROUP BY p.id, p.name
      ORDER BY defenses DESC
      LIMIT 10;
    `);

    const mostClimbed = await this.dataSource.query(`
      SELECT p.id as player_id, p.name,
            SUM(GREATEST(rh."rankBefore" - rh."rankAfter", 0))::int as climbed
      FROM "Player" p
      JOIN "RankHistory" rh ON rh."playerId" = p.id
      WHERE p."participates" = true AND p."currentRank" IS NOT NULL
      GROUP BY p.id, p.name
      ORDER BY climbed DESC
      LIMIT 10;
    `);

    return { mostPlayed, mostWins, mostAttacks, mostDefenses, mostClimbed };
  }
}
