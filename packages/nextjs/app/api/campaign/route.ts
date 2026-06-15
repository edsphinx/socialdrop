import { NextRequest, NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";
import { publishCast } from "~~/services/neynar.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, castContent, nftCount, creatorFid, nftImageUrl } = body;

    if (!name || !castContent || !nftCount || !creatorFid || !nftImageUrl) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    const publishResult = await publishCast(castContent);
    if (!publishResult.success || !publishResult.hash) {
      throw new Error("Could not publish the cast on Farcaster.");
    }
    const castHash = publishResult.hash;
    console.log(`[Campaign API] Cast published successfully. Hash: ${castHash}`);

    const newCampaign = await prisma.campaigns.create({
      data: {
        name: name,
        target_cast_hash: castHash,
        max_mints: nftCount,
        creator_fid: creatorFid,
        is_active: true,
        nft_image_url_level_1: nftImageUrl,
      },
    });

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    console.error("Error in /api/campaign:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
