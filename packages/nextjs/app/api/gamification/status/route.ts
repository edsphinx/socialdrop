import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/clients/prisma";
import { getDemoGamificationStatus, isDemoMode } from "@/lib/demo";
import { getLevelOf } from "@/services/blockchain.service";
import { getCastLikesCount, getUserDataFromFid } from "@/services/neynar.service";

const LEVEL_IMAGES: Record<number, string> = {
  1: "https://ipfs.io/ipfs/bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
  2: "https://ipfs.io/ipfs/bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4",
  3: "https://ipfs.io/ipfs/bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm",
  4: "https://ipfs.io/ipfs/bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = Number(searchParams.get("fid"));
  const campaignId = Number(searchParams.get("campaignId"));

  if (!fid || !campaignId) {
    return NextResponse.json({ error: "FID and campaignId are required" }, { status: 400 });
  }

  if (isDemoMode()) return NextResponse.json(getDemoGamificationStatus());

  try {
    const userData = await getUserDataFromFid(fid);
    if (!userData?.address) {
      return NextResponse.json({ error: "Could not find user wallet." }, { status: 404 });
    }
    const userAddress = userData.address;

    // 1. Find user's NFT for this campaign
    const userMint = await prisma.nfts_minted.findFirst({
      where: { recipient_address: userAddress, campaign_id: campaignId, status: "minted" },
    });
    if (!userMint || userMint.token_id === null) {
      return NextResponse.json({ error: "NFT not found for this user and campaign" }, { status: 404 });
    }

    // 2. Find their gamification entry
    const gameScore = await prisma.gamification_scores.findFirst({
      where: { nft_holder_address: userAddress, campaign_id: campaignId },
    });
    if (!gameScore || !gameScore.tracked_cast_hash) {
      return NextResponse.json({ error: "User not registered in gamification." }, { status: 404 });
    }

    // 3. Get real-time score (likes) and on-chain level
    const score = await getCastLikesCount(gameScore.tracked_cast_hash);
    const level = await getLevelOf(userMint.token_id);

    // 4. Resolve image directly (no self-fetch)
    const imageUrl = LEVEL_IMAGES[level] || LEVEL_IMAGES[1];

    return NextResponse.json({
      tokenId: userMint.token_id,
      name: `SocialDrop NFT - Level ${level}`,
      imageUrl,
      score,
      level,
    });
  } catch (error) {
    console.error("Error in /api/gamification/status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
