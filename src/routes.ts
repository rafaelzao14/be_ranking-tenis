import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prismaClient";

export const router = Router();
type RankedPlayer = { id: string; currentRank: number | null };

router.get("/", (_req, res) => {
  res.json({ ok: true, name: "ranking-tenis-backend" });
});

/** =========================
 *  PLAYERS (Atletas)
 *  ========================= */

// Lista geral
router.get("/players", async (_req, res) => {
  const players = await prisma.player.findMany({ orderBy: { createdAt: "desc" } });
  res.json(players);
});

// Buscar 1 atleta (tela de edição)
router.get("/players/:id", async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) return res.status(400).json({ error: "ID inválido." });

  const p = await prisma.player.findUnique({ where: { id: parsedId.data } });
  if (!p) return res.status(404).json({ error: "Atleta não encontrada." });
  return res.json(p);
});

// Criar atleta (permite TBD: currentRank null)
router.post("/players", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    active: z.boolean().optional(),
    participates: z.boolean().optional(),
    currentRank: z.number().int().min(1).optional().nullable(), // null = TBD
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const participates = parsed.data.participates ?? true;

  // ✅ se não participa: rank sempre null
  // ✅ se participa: rank pode ser número OU null (TBD)
  const requestedRank = participates ? (parsed.data.currentRank ?? null) : null;

  const birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;
  if (parsed.data.birthDate && Number.isNaN(birthDate?.getTime())) {
    return res.status(400).json({ error: "birthDate inválido." });
  }

  try {
    // ✅ valida unique rank só se vier número
    if (requestedRank !== null) {
      const exists = await prisma.player.findUnique({ where: { currentRank: requestedRank } });
      if (exists) return res.status(400).json({ error: "Já existe atleta com esse rank." });
    }

    const created = await prisma.player.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        birthDate,
        active: parsed.data.active ?? true,
        participates,
        currentRank: requestedRank, // null = TBD
      },
    });

    return res.status(201).json(created);
  } catch (e: any) {
    return res.status(500).json({ error: "Erro ao criar atleta." });
  }
});

// Update handler (PATCH e PUT)
const updatePlayerHandler = async (req: any, res: any) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) return res.status(400).json({ error: "ID inválido." });

  const schema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    active: z.boolean().optional(),
    participates: z.boolean().optional(),
    currentRank: z.number().int().min(1).optional().nullable(), // pode virar null (TBD)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // se virar "não participa", zera ranking
  if (parsed.data.participates === false) {
    parsed.data.currentRank = null;
  }

  // unique rank (somente se vier número)
  if (parsed.data.currentRank !== undefined && parsed.data.currentRank !== null) {
    const exists = await prisma.player.findUnique({ where: { currentRank: parsed.data.currentRank } });
    if (exists && exists.id !== parsedId.data) {
      return res.status(400).json({ error: "Já existe atleta com esse rank." });
    }
  }

  // valida birthDate quando enviado
  if (parsed.data.birthDate !== undefined && parsed.data.birthDate !== null) {
    const d = new Date(parsed.data.birthDate);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "birthDate inválido." });
  }

  try {
    const updated = await prisma.player.update({
      where: { id: parsedId.data },
      data: {
        ...parsed.data,
        ...(parsed.data.birthDate !== undefined
          ? { birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null }
          : {}),
      },
    });

    return res.json(updated);
  } catch {
    return res.status(404).json({ error: "Atleta não encontrada." });
  }
};

router.patch("/players/:id", updatePlayerHandler);
router.put("/players/:id", updatePlayerHandler);

/** =========================
 *  RANKING MENSAL (somente participates=true)
 *  ========================= */
router.get("/ranking/monthly", async (req, res) => {
  const monthStr = String(req.query.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    return res.status(400).json({ error: 'Parâmetro "month" inválido. Use YYYY-MM.' });
  }

  const [y, m] = monthStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0));

  const rows = await prisma.$queryRaw<any[]>`
    WITH
    rank_start_prev AS (
      SELECT DISTINCT ON (rh."playerId")
        rh."playerId",
        rh."rankAfter" AS "rankStartPrev"
      FROM "RankHistory" rh
      WHERE rh."createdAt" < ${start}
      ORDER BY rh."playerId", rh."createdAt" DESC, rh.id DESC
    ),
    rank_end AS (
      SELECT DISTINCT ON (rh."playerId")
        rh."playerId",
        rh."rankAfter" AS "rankEnd"
      FROM "RankHistory" rh
      WHERE rh."createdAt" < ${endExclusive}
      ORDER BY rh."playerId", rh."createdAt" DESC, rh.id DESC
    ),
    first_in_month AS (
      SELECT DISTINCT ON (rh."playerId")
        rh."playerId",
        rh."rankBefore" AS "rankStartFromMonth"
      FROM "RankHistory" rh
      WHERE rh."createdAt" >= ${start}
        AND rh."createdAt" < ${endExclusive}
      ORDER BY rh."playerId", rh."createdAt" ASC, rh.id ASC
    ),
    delta_month AS (
      SELECT
        rh."playerId",
        SUM(rh."rankBefore" - rh."rankAfter")::int AS "delta"
      FROM "RankHistory" rh
      WHERE rh."createdAt" >= ${start}
        AND rh."createdAt" < ${endExclusive}
      GROUP BY rh."playerId"
    )
    SELECT
      p.id,
      p.name,
      p.active,

      p."currentRank"::int AS "rank",

      -- Start/End do mês (para histórico)
      COALESCE(rsp."rankStartPrev", fim."rankStartFromMonth", p."currentRank")::int AS "rankStart",
      COALESCE(re."rankEnd", p."currentRank")::int AS "rankEnd",
      COALESCE(dm."delta", 0)::int AS "delta",  

      COUNT(mh.id)::int AS "totalGames",
      COALESCE(SUM(CASE WHEN mh."winnerId" = p.id THEN 1 ELSE 0 END), 0)::int AS wins,
      (COUNT(mh.id) - COALESCE(SUM(CASE WHEN mh."winnerId" = p.id THEN 1 ELSE 0 END), 0))::int AS losses,

      COALESCE((
        SELECT COUNT(*) FROM "Challenge" c
        WHERE (c."challengerId" = p.id OR c."challengedId" = p.id)
          AND c."createdAt" >= ${start}
          AND c."createdAt" < ${endExclusive}
      ), 0)::int AS "totalChallenges",

      COALESCE((
        SELECT COUNT(*) FROM "Match" mm
        WHERE mm.type = 'CHALLENGE'
          AND mm."player1Id" = p.id
          AND mm."winnerId" = p.id
          AND mm."playedAt" >= ${start}
          AND mm."playedAt" < ${endExclusive}
      ), 0)::int AS attacks,

      COALESCE((
        SELECT COUNT(*) FROM "Match" mm
        WHERE mm.type = 'CHALLENGE'
          AND mm."player2Id" = p.id
          AND mm."winnerId" = p.id
          AND mm."playedAt" >= ${start}
          AND mm."playedAt" < ${endExclusive}
      ), 0)::int AS defenses

    FROM "Player" p
    LEFT JOIN rank_start_prev rsp ON rsp."playerId" = p.id
    LEFT JOIN first_in_month fim ON fim."playerId" = p.id
    LEFT JOIN rank_end re ON re."playerId" = p.id
    LEFT JOIN delta_month dm ON dm."playerId" = p.id

    LEFT JOIN "Match" mh
      ON (mh."player1Id" = p.id OR mh."player2Id" = p.id)
     AND mh."playedAt" >= ${start}
     AND mh."playedAt" < ${endExclusive}

    WHERE p."participates" = true
      
    GROUP BY
      p.id, p.name, p.active,
      rsp."rankStartPrev", fim."rankStartFromMonth", re."rankEnd", p."currentRank",
      dm."delta"
    ORDER BY (p."currentRank" IS NULL) ASC, p."currentRank" ASC;
  `;

  res.json({
    month: monthStr,
    start: start.toISOString(),
    endExclusive: endExclusive.toISOString(),
    players: rows,
  });
});

/** =========================
 *  CHALLENGES
 *  ========================= */
/** =========================
 *  CHALLENGES
 *  ========================= */
router.get("/challenges", async (req, res) => {
  const status = req.query.status as string | undefined;

  const challenges = await prisma.challenge.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    include: { challenger: true, challenged: true, match: true },
  });

  res.json(challenges);
});

router.post("/challenges", async (req, res) => {
  const schema = z.object({
    challengerId: z.string().uuid(),
    challengedId: z.string().uuid(),
    expiresInDays: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { challengerId, challengedId, expiresInDays } = parsed.data;

  if (challengerId === challengedId) {
    return res.status(400).json({ error: "Desafiante e desafiada não podem ser a mesma." });
  }

  const [challenger, challenged] = await Promise.all([
    prisma.player.findUnique({ where: { id: challengerId } }),
    prisma.player.findUnique({ where: { id: challengedId } }),
  ]);

  if (!challenger || !challenged) {
    return res.status(404).json({ error: "Atleta não encontrada." });
  }

  if (!challenger.active || !challenged.active) {
    return res.status(400).json({ error: "Atleta inativa." });
  }

  if (!challenger.participates || !challenged.participates) {
    return res.status(400).json({ error: "Atleta não participa do ranking do ano." });
  }

  // ✅ a desafiada precisa ter ranking definido
  if (challenged.currentRank == null) {
    return res.status(400).json({ error: "A desafiada precisa ter ranking definido." });
  }

  // ✅ a desafiante pode ser TBD (currentRank null)
  const maxAbove = 6;

  if (challenger.currentRank != null) {
    // regra normal
    if (challenger.currentRank <= challenged.currentRank) {
      return res.status(400).json({ error: "Desafio inválido: desafiada precisa estar acima." });
    }

    const diff = challenger.currentRank - challenged.currentRank;
    if (diff > maxAbove) {
      return res.status(400).json({ error: `Só pode desafiar até ${maxAbove} posições acima.` });
    }
  } else {
    // ✅ TBD pode desafiar qualquer atleta ranqueada
    // se quiser limitar depois, ajustamos aqui
  }

  const activeChallenge = await prisma.challenge.findFirst({
    where: {
      challengerId,
      status: { in: ["PENDING", "ACCEPTED"] as any },
    },
  });
  if (activeChallenge) {
    return res.status(400).json({ error: "Essa atleta já tem um desafio ativo." });
  }

  const days = expiresInDays ?? 10;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const created = await prisma.challenge.create({
    data: {
      challengerId,
      challengedId,
      expiresAt,
      status: "PENDING" as any,
    },
    include: { challenger: true, challenged: true },
  });

  res.status(201).json(created);
});

router.delete("/challenges/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: "Desafio não encontrado." });

    if (challenge.status === ("COMPLETED" as any)) {
      return res.status(400).json({ error: "Não é possível excluir um desafio já finalizado." });
    }

    await prisma.challenge.delete({ where: { id } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Erro ao excluir desafio." });
  }
});

/** =========================
 *  MATCHES
 *  ========================= */
router.get("/matches", async (req, res) => {
  const playerId = (req.query.playerId as string | undefined) ?? undefined;
  const type = (req.query.type as string | undefined) ?? undefined;
  const month = (req.query.month as string | undefined) ?? undefined;

  let start: Date | undefined;
  let endExclusive: Date | undefined;

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Parâmetro "month" inválido. Use YYYY-MM.' });
    }
    const [y, m] = month.split("-").map(Number);
    start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  }

  const matches = await prisma.match.findMany({
    where: {
      ...(type ? { type: type as any } : {}),
      ...(playerId ? { OR: [{ player1Id: playerId }, { player2Id: playerId }] } : {}),
      ...(start && endExclusive ? { playedAt: { gte: start, lt: endExclusive } } : {}),
    },
    orderBy: { playedAt: "desc" },
    include: {
      player1: true,
      player2: true,
      winner: true,
      challenge: true,
    },
  });

  res.json(matches);
});

router.post("/matches", async (req, res) => {
  const schema = z.object({
    type: z.enum(["CHALLENGE", "LEAGUE", "FRIENDLY"]),
    challengeId: z.string().uuid().optional(),
    player1Id: z.string().uuid(),
    player2Id: z.string().uuid(),
    sets1: z.number().int().min(0),
    sets2: z.number().int().min(0),
    winnerId: z.string().uuid(),
    wo: z.boolean().optional(),
    playedAt: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const dto = parsed.data;
  const wo = dto.wo ?? false;

  const playedAt = dto.playedAt ? new Date(dto.playedAt) : new Date();
  if (Number.isNaN(playedAt.getTime())) {
    return res.status(400).json({ error: "playedAt inválido." });
  }

  if (dto.player1Id === dto.player2Id) {
    return res.status(400).json({ error: "Partida inválida." });
  }

  if (dto.winnerId !== dto.player1Id && dto.winnerId !== dto.player2Id) {
    return res.status(400).json({ error: "winnerId deve ser player1Id ou player2Id." });
  }

  if (dto.type === "CHALLENGE" && !dto.challengeId) {
    return res.status(400).json({ error: "challengeId é obrigatório." });
  }

  if (!wo && dto.sets1 === dto.sets2) {
    return res.status(400).json({ error: "Placar inválido: empate." });
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [p1, p2] = await Promise.all([
        tx.player.findUnique({ where: { id: dto.player1Id } }),
        tx.player.findUnique({ where: { id: dto.player2Id } }),
      ]);

      if (!p1 || !p2) throw new Error("Atleta não encontrada.");

      if (dto.type === "CHALLENGE") {
        const ch = await tx.challenge.findUnique({ where: { id: dto.challengeId! } });
        if (!ch) throw new Error("Desafio não encontrado.");
        if (ch.status !== ("PENDING" as any) && ch.status !== ("ACCEPTED" as any)) {
          throw new Error("Desafio não está ativo.");
        }
        if (ch.challengerId !== dto.player1Id || ch.challengedId !== dto.player2Id) {
          throw new Error("Desafio não corresponde às atletas (player1=desafiante, player2=desafiada).");
        }
      }

      const match = await tx.match.create({
        data: {
          type: dto.type as any,
          challengeId: dto.challengeId ?? null,
          player1Id: dto.player1Id,
          player2Id: dto.player2Id,
          sets1: dto.sets1,
          sets2: dto.sets2,
          winnerId: dto.winnerId,
          wo,
          playedAt,
        },
      });

      let ladder: any = null;

      // =========================================================
      // ESCADA - DESAFIO COM VITÓRIA DA DESAFIANTE (player1)
      // =========================================================
      if (dto.type === "CHALLENGE" && dto.winnerId === dto.player1Id) {
        if (p2.currentRank == null) throw new Error("A desafiada está sem ranking.");

        // -------------------------------------------------------
        // CASO 1: desafiante já tem rank (regra normal)
        // -------------------------------------------------------
        if (p1.currentRank != null) {
          const rb = p1.currentRank; // antes
          const ra = p2.currentRank; // antes

          if (rb <= ra) throw new Error("Ranking inconsistente: desafiante não está abaixo.");

          const affectedBefore = await tx.player.findMany({
            where: { currentRank: { gte: ra, lte: rb } },
            select: { id: true, currentRank: true },
          });

          const beforeMap = new Map(affectedBefore.map((x: RankedPlayer) => [x.id, x.currentRank]));

          // tira desafiante temporariamente
          await tx.player.update({
            where: { id: dto.player1Id },
            data: { currentRank: null },
          });

          const agg = await tx.player.aggregate({ _max: { currentRank: true } });
          const maxRank = agg._max.currentRank ?? 0;
          const OFFSET = maxRank + 1000;

          // joga intervalo [ra..rb-1] pra longe
          await tx.player.updateMany({
            where: { currentRank: { gte: ra, lt: rb } },
            data: { currentRank: { increment: OFFSET } },
          });

          // volta já com +1
          await tx.player.updateMany({
            where: { currentRank: { gte: ra + OFFSET, lt: rb + OFFSET } },
            data: { currentRank: { decrement: OFFSET - 1 } },
          });

          // coloca desafiante no rank da desafiada
          await tx.player.update({
            where: { id: dto.player1Id },
            data: { currentRank: ra },
          });

          const affectedAfter = await tx.player.findMany({
            where: { id: { in: affectedBefore.map((x: RankedPlayer) => x.id) } },
            select: { id: true, currentRank: true },
          });
          const afterMap = new Map(affectedAfter.map((x: RankedPlayer) => [x.id, x.currentRank]));

          await tx.rankHistory.createMany({
            data: affectedBefore.map((b: RankedPlayer) => ({
              matchId: match.id,
              playerId: b.id,
              rankBefore: beforeMap.get(b.id) ?? b.currentRank ?? 0,
              rankAfter: afterMap.get(b.id) ?? b.currentRank ?? 0,
            })),
          });

          ladder = {
            type: "RANKED_CHALLENGER_WIN",
            rankBefore: { challenger: rb, challenged: ra },
            rankAfter: { challenger: ra, challenged: ra + 1 },
          };
        } else {
          // -------------------------------------------------------
          // CASO 2: desafiante é TBD e venceu
          // entra na escada na posição da desafiada
          // todos de ra para baixo descem 1
          // -------------------------------------------------------
          const ra = p2.currentRank;

          const affectedBefore = await tx.player.findMany({
            where: { currentRank: { gte: ra } },
            select: { id: true, currentRank: true },
            orderBy: { currentRank: "asc" },
          });

          const beforeMap = new Map(affectedBefore.map((x: RankedPlayer) => [x.id, x.currentRank]));

          const agg = await tx.player.aggregate({ _max: { currentRank: true } });
          const maxRank = agg._max.currentRank ?? 0;
          const OFFSET = maxRank + 1000;

          // joga todo mundo de ra para baixo pra longe
          await tx.player.updateMany({
            where: { currentRank: { gte: ra } },
            data: { currentRank: { increment: OFFSET } },
          });

          // volta todo mundo já com +1
          await tx.player.updateMany({
            where: { currentRank: { gte: ra + OFFSET } },
            data: { currentRank: { decrement: OFFSET - 1 } },
          });

          // TBD assume a posição da desafiada
          await tx.player.update({
            where: { id: dto.player1Id },
            data: { currentRank: ra },
          });

          const affectedIds = [...affectedBefore.map((x: RankedPlayer) => x.id), dto.player1Id];

          const affectedAfter = await tx.player.findMany({
            where: { id: { in: affectedIds } },
            select: { id: true, currentRank: true },
          });
          const afterMap = new Map(affectedAfter.map((x: RankedPlayer) => [x.id, x.currentRank]));

          // history dos jogadores afetados
          await tx.rankHistory.createMany({
            data: affectedBefore.map((b: RankedPlayer) => ({
              matchId: match.id,
              playerId: b.id,
              rankBefore: beforeMap.get(b.id) ?? b.currentRank ?? 0,
              rankAfter: afterMap.get(b.id) ?? b.currentRank ?? 0,
            })),
          });

          // history da TBD entrando no ranking
          await tx.rankHistory.create({
            data: {
              matchId: match.id,
              playerId: dto.player1Id,
              rankBefore: 0, // TBD
              rankAfter: ra,
            },
          });

          ladder = {
            type: "TBD_CHALLENGER_WIN",
            rankBefore: { challenger: null, challenged: ra },
            rankAfter: { challenger: ra, challenged: ra + 1 },
          };
        }
      } else {
        // =========================================================
        // SEM MUDANÇA DE ESCADA
        // =========================================================
        await tx.rankHistory.createMany({
          data: [
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
          ],
        });
      }

      if (dto.type === "CHALLENGE") {
        await tx.challenge.update({
          where: { id: dto.challengeId! },
          data: { status: "COMPLETED" as any },
        });
      }

      return { matchId: match.id, ladder };
    });

    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Erro ao registrar partida." });
  }
});

/** =========================
 *  DASHBOARD (somente participates=true)
 *  ========================= */
router.get("/dashboard/overview", async (_req, res) => {
  const mostPlayed = await prisma.$queryRaw`
    SELECT p.id as player_id, p.name,
           COUNT(m.id)::int as games
    FROM "Player" p
    JOIN "Match" m ON (m."player1Id" = p.id OR m."player2Id" = p.id)
    WHERE p."participates" = true AND p."currentRank" IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY games DESC
    LIMIT 10;
  `;

  const mostWins = await prisma.$queryRaw`
    SELECT p.id as player_id, p.name,
           COUNT(m.id)::int as wins
    FROM "Player" p
    JOIN "Match" m ON m."winnerId" = p.id
    WHERE p."participates" = true AND p."currentRank" IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY wins DESC
    LIMIT 10;
  `;

  const mostAttacks = await prisma.$queryRaw`
    SELECT p.id as player_id, p.name,
           COUNT(m.id)::int as attacks
    FROM "Player" p
    JOIN "Match" m ON m."player1Id" = p.id
    WHERE p."participates" = true AND p."currentRank" IS NOT NULL
      AND m.type = 'CHALLENGE' AND m."winnerId" = m."player1Id"
    GROUP BY p.id, p.name
    ORDER BY attacks DESC
    LIMIT 10;
  `;

  const mostDefenses = await prisma.$queryRaw`
    SELECT p.id as player_id, p.name,
           COUNT(m.id)::int as defenses
    FROM "Player" p
    JOIN "Match" m ON m."player2Id" = p.id
    WHERE p."participates" = true AND p."currentRank" IS NOT NULL
      AND m.type = 'CHALLENGE' AND m."winnerId" = m."player2Id"
    GROUP BY p.id, p.name
    ORDER BY defenses DESC
    LIMIT 10;
  `;

  const mostClimbed = await prisma.$queryRaw`
    SELECT p.id as player_id, p.name,
           SUM(GREATEST(rh."rankBefore" - rh."rankAfter", 0))::int as climbed
    FROM "Player" p
    JOIN "RankHistory" rh ON rh."playerId" = p.id
    WHERE p."participates" = true AND p."currentRank" IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY climbed DESC
    LIMIT 10;
  `;

  res.json({ mostPlayed, mostWins, mostAttacks, mostDefenses, mostClimbed });
});
