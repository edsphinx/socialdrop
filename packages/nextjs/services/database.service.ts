import prisma from "~~/lib/clients/prisma";

export async function findCampaignByCastHash(castHash: string) {
  return await prisma.campaigns.findUnique({
    where: { target_cast_hash: castHash },
  });
}

export async function hasUserMinted(campaignId: number, recipientAddress: string) {
  const existingMint = await prisma.nfts_minted.findUnique({
    where: {
      campaign_id_recipient_address: {
        campaign_id: campaignId,
        recipient_address: recipientAddress,
      },
    },
  });
  return existingMint !== null;
}

export async function getMintCount(campaignId: number) {
  return await prisma.nfts_minted.count({
    where: { campaign_id: campaignId },
  });
}

export async function recordMint(campaignId: number, tokenId: number, recipientAddress: string, userFid?: number) {
  await prisma.nfts_minted.create({
    data: {
      campaign_id: campaignId,
      token_id: tokenId,
      recipient_address: recipientAddress,
      user_fid: userFid ?? null,
    },
  });
}

export async function findCampaignById(campaignId: number) {
  return await prisma.campaigns.findUnique({
    where: { id: campaignId },
  });
}

/**
 * Registers (or updates) a user for the War of Influence gamification.
 * Uses upsert so calling multiple times just updates the tracked cast hash.
 */
export async function registerForGamification(
  campaignId: number,
  address: string,
  fid: number,
  castHash: string,
  initialScore: number = 0,
) {
  return await prisma.gamification_scores.upsert({
    where: {
      campaign_id_nft_holder_address: {
        campaign_id: campaignId,
        nft_holder_address: address,
      },
    },
    update: {
      tracked_cast_hash: castHash,
      score: initialScore,
    },
    create: {
      campaign_id: campaignId,
      nft_holder_address: address,
      nft_holder_fid: fid,
      tracked_cast_hash: castHash,
      score: initialScore,
    },
  });
}

/**
 * Finds a user's minted NFT for a specific campaign.
 */
export async function findUserMint(campaignId: number, recipientAddress: string) {
  return await prisma.nfts_minted.findFirst({
    where: { campaign_id: campaignId, recipient_address: recipientAddress },
  });
}

/**
 * Finds a user's gamification entry for a specific campaign.
 */
export async function findGamificationEntry(campaignId: number, address: string) {
  return await prisma.gamification_scores.findFirst({
    where: { campaign_id: campaignId, nft_holder_address: address },
  });
}

/**
 * Updates a gamification score in the database.
 */
export async function updateGamificationScore(id: number, score: number) {
  return await prisma.gamification_scores.update({
    where: { id },
    data: { score },
  });
}

/**
 * Updates the level of a minted NFT in the database.
 */
export async function updateMintLevel(id: number, level: number) {
  return await prisma.nfts_minted.update({
    where: { id },
    data: { level },
  });
}

/**
 * Gets the most recent N minters for a campaign to display as recent winners.
 * @param campaignId - The campaign ID.
 * @param limit - Number of winners to return.
 */
export async function getRecentWinners(campaignId: number, limit: number = 5) {
  return await prisma.nfts_minted.findMany({
    where: { campaign_id: campaignId },
    orderBy: {
      minted_at: "desc",
    },
    take: limit,
  });
}
