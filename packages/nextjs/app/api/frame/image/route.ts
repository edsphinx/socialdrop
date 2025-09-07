import { NextRequest, NextResponse } from "next/server";
import * as db from "~~/services/database.service";
import { getProgressImage } from "~~/services/image.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = Number(searchParams.get("campaignId"));

  const campaign = await db.findCampaignById(campaignId);

  if (!campaign) {
    return new NextResponse("Campaña no encontrada", { status: 404 });
  }
  const mintCount = await db.getMintCount(campaign.id);

  return getProgressImage(mintCount, campaign.max_mints, campaign.name);
}
