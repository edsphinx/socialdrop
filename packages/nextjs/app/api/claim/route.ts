import { NextResponse } from "next/server";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";
import * as neynar from "@/services/neynar.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return new NextResponse("Invalid request body.", { status: 400 });
    }

    const { userFid, campaignId } = body;

    if (!userFid) {
      return new NextResponse("Invalid request body.", { status: 400 });
    }

    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ success: false, message: "Campaign not found." }, { status: 404 });

    const userData = await neynar.getUserDataFromFid(userFid);
    if (!userData) return NextResponse.json({ success: false, message: "Farcaster user not found." }, { status: 404 });
    const { address: recipientAddress, username } = userData;

    // --- Eligibility checks ---
    const mintCount = await db.getMintCount(campaign.id);
    if (mintCount >= campaign.max_mints) {
      return NextResponse.json({ success: false, message: "Campaign has reached its mint limit." }, { status: 409 });
    }

    if (await db.hasUserMinted(campaign.id, recipientAddress)) {
      return NextResponse.json({ success: false, message: "You have already claimed this NFT." }, { status: 409 });
    }

    const hasLiked = await neynar.didUserLikeCast(userFid, campaign.target_cast_hash);
    if (!hasLiked) {
      return NextResponse.json(
        { success: false, message: "You must like the original cast to claim." },
        { status: 403 },
      );
    }

    // --- Minting ---
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      throw new Error("Mint transaction failed.");
    }

    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress, userFid);

    const castText = `🎉 @${username} just claimed NFT #${mintResult.tokenId} from the "${campaign.name}" drop!`;
    await neynar.publishCast(castText);

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
