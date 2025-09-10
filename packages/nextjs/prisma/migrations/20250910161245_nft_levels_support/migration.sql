/*
  Warnings:

  - Added the required column `nft_image_url_level_1` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."campaigns" ADD COLUMN     "creator_fid" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nft_image_url_level_1" TEXT NOT NULL,
ADD COLUMN     "nft_image_url_level_2" TEXT,
ADD COLUMN     "nft_image_url_level_3" TEXT;

-- AlterTable
ALTER TABLE "public"."gamification_scores" ADD COLUMN     "nft_holder_fid" INTEGER;

-- AlterTable
ALTER TABLE "public"."nfts_minted" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "user_fid" INTEGER;
