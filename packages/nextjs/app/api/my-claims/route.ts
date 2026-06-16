import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/clients/prisma";
import { getDemoMyClaims, isDemoMode } from "@/lib/demo";
import { hasUserMinted } from "@/services/database.service";
import { didUserLikeCast, getUserDataFromFid } from "@/services/neynar.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = Number(searchParams.get("fid"));

  if (!fid) {
    return NextResponse.json({ error: "FID is required" }, { status: 400 });
  }

  if (isDemoMode()) return NextResponse.json(getDemoMyClaims());

  try {
    const allCampaigns = await prisma.campaigns.findMany({ where: { is_active: true } });
    const userData = await getUserDataFromFid(fid);

    if (!userData?.address) {
      return NextResponse.json({ eligibleCampaigns: [] });
    }

    const eligibleCampaigns = [];

    for (const campaign of allCampaigns) {
      const hasLiked = await didUserLikeCast(fid, campaign.target_cast_hash);
      if (hasLiked) {
        const alreadyMinted = await hasUserMinted(campaign.id, userData.address);
        if (!alreadyMinted) {
          eligibleCampaigns.push(campaign);
        }
      }
    }

    return NextResponse.json({ eligibleCampaigns });
  } catch (error) {
    console.error("Error fetching user claims:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
