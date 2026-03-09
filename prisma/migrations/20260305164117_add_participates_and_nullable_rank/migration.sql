-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "participates" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "currentRank" DROP NOT NULL;
