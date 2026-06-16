import { NextResponse } from "next/server";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";
import { isDemoMode } from "@/lib/demo";
import { checkRateLimit } from "@/lib/ratelimit";
import { getSocialDataProvider } from "@/lib/social";
import { claimSchema } from "@/lib/validation/schemas";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";

export async function POST(request: Request) {
  if (isDemoMode())
    return NextResponse.json({
      success: true,
      message: "NFT claimed successfully!",
      tokenId: 1,
      transactionHash: "0xdemo",
    });

  let userFid: number;
  try {
    userFid = await getVerifiedFid(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }

  if (!(await checkRateLimit(`fid:${userFid}`)))
    return NextResponse.json({ success: false, message: "Too many requests." }, { status: 429 });

  try {
    const parsed = claimSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    const { campaignId } = parsed.data;

    const social = getSocialDataProvider();

    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ success: false, message: "Campaign not found." }, { status: 404 });

    const userData = await social.getUserByFid(userFid);
    if (!userData) return NextResponse.json({ success: false, message: "Farcaster user not found." }, { status: 404 });
    const { address: recipientAddress, username } = userData;

    // --- Eligibility checks ---
    const mintCount = await db.getMintCount(campaign.id);
    if (mintCount >= campaign.max_mints) {
      return NextResponse.json({ success: false, message: "Campaign has reached its mint limit." }, { status: 409 });
    }

    const hasLiked = await social.didUserLikeCast(userFid, campaign.target_cast_hash);
    if (!hasLiked) {
      return NextResponse.json(
        { success: false, message: "You must like the original cast to claim." },
        { status: 403 },
      );
    }

    // --- Minting (reserve-before-mint to close the claim race) ---
    let reservation;
    try {
      reservation = await db.reserveMint(campaign.id, recipientAddress, userFid);
    } catch (e: any) {
      if (e?.code === "P2002")
        return NextResponse.json({ success: false, message: "You have already claimed this NFT." }, { status: 409 });
      throw e;
    }
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      await db.failMint(reservation.id);
      throw new Error("Mint transaction failed.");
    }
    await db.finalizeMint(reservation.id, mintResult.tokenId);

    const castText = `🎉 @${username} just claimed NFT #${mintResult.tokenId} from the "${campaign.name}" drop!`;
    await social.publishCast(castText);

    return NextResponse.json({
      success: true,
      message: "NFT claimed successfully!",
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.hash,
    });
  } catch (error: any) {
    console.error("Error in claim endpoint:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
