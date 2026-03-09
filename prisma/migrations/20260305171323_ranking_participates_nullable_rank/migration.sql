/*
  Warnings:

  - The values [EXPIRED,WO] on the enum `ChallengeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `matchId` on the `Challenge` table. All the data in the column will be lost.
  - The primary key for the `RankHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ChallengeStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELED');
ALTER TABLE "Challenge" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Challenge" ALTER COLUMN "status" TYPE "ChallengeStatus_new" USING ("status"::text::"ChallengeStatus_new");
ALTER TYPE "ChallengeStatus" RENAME TO "ChallengeStatus_old";
ALTER TYPE "ChallengeStatus_new" RENAME TO "ChallengeStatus";
DROP TYPE "ChallengeStatus_old";
ALTER TABLE "Challenge" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "matchId";

-- AlterTable
ALTER TABLE "RankHistory" DROP CONSTRAINT "RankHistory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RankHistory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RankHistory_id_seq";

-- CreateIndex
CREATE INDEX "RankHistory_playerId_createdAt_idx" ON "RankHistory"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankHistory_matchId_idx" ON "RankHistory"("matchId");
