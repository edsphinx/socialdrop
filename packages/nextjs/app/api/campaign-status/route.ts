import { NextRequest, NextResponse } from "next/server";
import * as db from "~~/services/database.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = Number(searchParams.get("id"));

  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  try {
    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const mintCount = await db.getMintCount(campaignId);
    // Podrías añadir una función en tu db.service para obtener los últimos minters
    // const recentWinners = await db.getRecentWinners(campaignId, 5);

    const responseData = {
      name: campaign.name,
      progress: mintCount,
      total: campaign.max_mints,
      // recentWinners: recentWinners,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching campaign status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
