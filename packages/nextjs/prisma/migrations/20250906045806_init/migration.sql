-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "target_cast_hash" TEXT NOT NULL,
    "max_mints" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nfts_minted" (
    "id" SERIAL NOT NULL,
    "token_id" INTEGER NOT NULL,
    "recipient_address" TEXT NOT NULL,
    "minted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaign_id" INTEGER NOT NULL,

    CONSTRAINT "nfts_minted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gamification_scores" (
    "id" SERIAL NOT NULL,
    "nft_holder_address" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tracked_cast_hash" TEXT,
    "campaign_id" INTEGER NOT NULL,

    CONSTRAINT "gamification_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_target_cast_hash_key" ON "public"."campaigns"("target_cast_hash");

-- CreateIndex
CREATE UNIQUE INDEX "nfts_minted_campaign_id_recipient_address_key" ON "public"."nfts_minted"("campaign_id", "recipient_address");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_scores_campaign_id_nft_holder_address_key" ON "public"."gamification_scores"("campaign_id", "nft_holder_address");

-- AddForeignKey
ALTER TABLE "public"."nfts_minted" ADD CONSTRAINT "nfts_minted_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gamification_scores" ADD CONSTRAINT "gamification_scores_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
