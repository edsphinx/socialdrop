import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";
import { getSocialDataProvider } from "@/lib/social";
import * as db from "@/services/database.service";

export async function POST(request: NextRequest) {
  let userFid: number;
  try {
    userFid = await getVerifiedFid(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { campaignId, castHash } = body;

    if (!campaignId || !castHash) {
      return NextResponse.json({ error: "userFid, campaignId, and castHash are required." }, { status: 400 });
    }

    const social = getSocialDataProvider();

    // 1. Get user's wallet address from FID
    const userData = await social.getUserByFid(userFid);
    if (!userData?.address) {
      return NextResponse.json({ error: "Could not find user wallet." }, { status: 404 });
    }

    // 2. Verify user has minted an NFT for this campaign
    const userMint = await db.findUserMint(campaignId, userData.address);
    if (!userMint) {
      return NextResponse.json({ error: "You must claim an NFT for this campaign before competing." }, { status: 403 });
    }

    // 3. Verify the cast exists on Farcaster by fetching its like count
    const initialScore = await social.getCastLikesCount(castHash);

    // 4. Register for gamification (upsert)
    await db.registerForGamification(campaignId, userData.address, userFid, castHash, initialScore);

    return NextResponse.json({
      success: true,
      message: "Registered for War of Influence!",
      score: initialScore,
    });
  } catch (error) {
    console.error("Error in /api/gamification/register:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
