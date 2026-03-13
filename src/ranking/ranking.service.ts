import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RankingService {
  constructor(private readonly dataSource: DataSource) {}

  async monthly(monthStr: string) {
    const [y, m] = monthStr.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    const rows = await this.dataSource.query(
      `
      WITH
      rank_start_prev AS (
        SELECT DISTINCT ON (rh."playerId")
          rh."playerId",
          rh."rankAfter" AS "rankStartPrev"
        FROM "RankHistory" rh
        WHERE rh."createdAt" < $1
        ORDER BY rh."playerId", rh."createdAt" DESC, rh.id DESC
      ),
      rank_end AS (
        SELECT DISTINCT ON (rh."playerId")
          rh."playerId",
          rh."rankAfter" AS "rankEnd"
        FROM "RankHistory" rh
        WHERE rh."createdAt" < $2
        ORDER BY rh."playerId", rh."createdAt" DESC, rh.id DESC
      ),
      first_in_month AS (
        SELECT DISTINCT ON (rh."playerId")
          rh."playerId",
          rh."rankBefore" AS "rankStartFromMonth"
        FROM "RankHistory" rh
        WHERE rh."createdAt" >= $3
          AND rh."createdAt" < $4
        ORDER BY rh."playerId", rh."createdAt" ASC, rh.id ASC
      ),
      delta_month AS (
        SELECT
          rh."playerId",
          SUM(rh."rankBefore" - rh."rankAfter")::int AS "delta"
        FROM "RankHistory" rh
        WHERE rh."createdAt" >= $5
          AND rh."createdAt" < $6
        GROUP BY rh."playerId"
      )
      SELECT
        p.id,
        p.name,
        p.active,
        p."currentRank"::int AS "rank",
        COALESCE(rsp."rankStartPrev", fim."rankStartFromMonth", p."currentRank")::int AS "rankStart",
        COALESCE(re."rankEnd", p."currentRank")::int AS "rankEnd",
        COALESCE(dm."delta", 0)::int AS "delta",
        COUNT(mh.id)::int AS "totalGames",
        COALESCE(SUM(CASE WHEN mh."winnerId" = p.id THEN 1 ELSE 0 END), 0)::int AS wins,
        (COUNT(mh.id) - COALESCE(SUM(CASE WHEN mh."winnerId" = p.id THEN 1 ELSE 0 END), 0))::int AS losses,
        COALESCE((
          SELECT COUNT(*) FROM "Challenge" c
          WHERE (c."challengerId" = p.id OR c."challengedId" = p.id)
            AND c."createdAt" >= $7
            AND c."createdAt" < $8
        ), 0)::int AS "totalChallenges",
        COALESCE((
          SELECT COUNT(*) FROM "Match" mm
          WHERE mm.type = 'CHALLENGE'
            AND mm."player1Id" = p.id
            AND mm."winnerId" = p.id
            AND mm."playedAt" >= $9
            AND mm."playedAt" < $10
        ), 0)::int AS attacks,
        COALESCE((
          SELECT COUNT(*) FROM "Match" mm
          WHERE mm.type = 'CHALLENGE'
            AND mm."player2Id" = p.id
            AND mm."winnerId" = p.id
            AND mm."playedAt" >= $11
            AND mm."playedAt" < $12
        ), 0)::int AS defenses
      FROM "Player" p
      LEFT JOIN rank_start_prev rsp ON rsp."playerId" = p.id
      LEFT JOIN first_in_month fim ON fim."playerId" = p.id
      LEFT JOIN rank_end re ON re."playerId" = p.id
      LEFT JOIN delta_month dm ON dm."playerId" = p.id
      LEFT JOIN "Match" mh
        ON (mh."player1Id" = p.id OR mh."player2Id" = p.id)
      AND mh."playedAt" >= $13
      AND mh."playedAt" < $14
      WHERE p."participates" = true
      GROUP BY
        p.id, p.name, p.active,
        rsp."rankStartPrev", fim."rankStartFromMonth", re."rankEnd", p."currentRank",
        dm."delta"
      ORDER BY (p."currentRank" IS NULL) ASC, p."currentRank" ASC;
      `,
      [
        start,
        endExclusive,
        start,
        endExclusive,
        start,
        endExclusive,
        start,
        endExclusive,
        start,
        endExclusive,
        start,
        endExclusive,
        start,
        endExclusive,
      ],
    );

    return {
      month: monthStr,
      start: start.toISOString(),
      endExclusive: endExclusive.toISOString(),
      players: rows,
    };
  }
}
