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
