import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "~~/lib/webhook-verify";
import * as blockchain from "~~/services/blockchain.service";
import * as db from "~~/services/database.service";
import * as neynar from "~~/services/neynar.service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-neynar-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    const userFid = webhookData?.data?.fid;
    const castHash = webhookData?.data?.cast?.hash;

    if (!userFid || !castHash) {
      return NextResponse.json({ message: "Invalid webhook data." }, { status: 400 });
    }

    console.log(`Webhook: Processing like from FID ${userFid} on cast ${castHash}`);

    const campaign = await db.findCampaignByCastHash(castHash);
    if (!campaign) {
      console.log(`Webhook: No campaign found for cast ${castHash}. Ignoring.`);
      return NextResponse.json({ message: "Campaign not found." }, { status: 200 });
    }

    const userData = await neynar.getUserDataFromFid(userFid);
    if (!userData) {
      console.log(`Webhook: Could not get data (wallet/user) for FID ${userFid}.`);
      return NextResponse.json({ message: "Could not get user data from Neynar." }, { status: 200 });
    }

    const { address: recipientAddress, username } = userData;

    if (await db.hasUserMinted(campaign.id, recipientAddress)) {
      console.log(`Webhook: User ${username} (${recipientAddress}) has already minted in this campaign.`);
      return NextResponse.json({ message: "User has already minted." }, { status: 200 });
    }

    const mintCount = await db.getMintCount(campaign.id);
    if (mintCount >= campaign.max_mints) {
      console.log(`Webhook: Campaign "${campaign.name}" has reached its mint limit.`);
      return NextResponse.json({ message: "Campaign has ended." }, { status: 200 });
    }

    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      throw new Error("Mint transaction failed.");
    }

    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress, userFid);
    console.log(
      `Success! NFT ${mintResult.tokenId} minted for ${username} (${recipientAddress}) in tx ${mintResult.hash}`,
    );

    const castText = `🔥 @${username} just received an NFT from the "${campaign.name}" campaign! The magic is happening in real time. Who's next? 👀`;
    await neynar.publishCast(castText, { channelId: "socialdrop" });

    return NextResponse.json(
      { message: `NFT minted and announcement cast published for @${username}!` },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in webhook handler:", error);
    return NextResponse.json({ message: "Internal server error.", error: error.message }, { status: 500 });
  }
}
