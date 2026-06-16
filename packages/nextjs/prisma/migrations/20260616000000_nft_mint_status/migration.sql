-- CreateEnum
CREATE TYPE "MintStatus" AS ENUM ('pending', 'minted', 'failed');

-- AlterTable
ALTER TABLE "nfts_minted" ALTER COLUMN "token_id" DROP NOT NULL,
  ADD COLUMN "status" "MintStatus" NOT NULL DEFAULT 'pending';

-- Backfill existing rows that already have a token_id
UPDATE "nfts_minted" SET "status" = 'minted' WHERE "token_id" IS NOT NULL;
