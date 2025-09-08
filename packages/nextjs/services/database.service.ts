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

export async function recordMint(campaignId: number, tokenId: number, recipientAddress: string) {
  await prisma.nfts_minted.create({
    data: {
      campaign_id: campaignId,
      token_id: tokenId,
      recipient_address: recipientAddress,
    },
  });
}

export async function findCampaignById(campaignId: number) {
  return await prisma.campaigns.findUnique({
    where: { id: campaignId },
  });
}

/**
 * Obtiene los últimos N minters de una campaña para mostrar como ganadores recientes.
 * @param {number} campaignId - El ID de la campaña.
 * @param {number} limit - El número de ganadores a devolver.
 * @returns {Promise<Array<import('@prisma/client').nfts_minted>>} - Una lista de los registros de mints recientes.
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
