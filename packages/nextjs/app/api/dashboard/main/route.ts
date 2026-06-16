import { NextResponse } from "next/server";
import prisma from "@/lib/clients/prisma";
import { demoFallbackAllowed, getDemoDashboard, isDemoMode } from "@/lib/demo";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(getDemoDashboard());

  try {
    // Get the 4 most recent active campaigns as "trending"
    const trendingCampaigns = await prisma.campaigns.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
      take: 4,
      include: {
        _count: {
          select: { nfts_minted: true },
        },
      },
    });

    // Get the top 4 scores as "featured duels"
    const topScores = await prisma.gamification_scores.findMany({
      orderBy: { score: "desc" },
      take: 4,
      include: {
        campaign: {
          select: { name: true },
        },
      },
    });

    const featuredDuels = topScores.map((score: (typeof topScores)[number]) => ({
      id: score.id,
      name: `Influencer FID #${score.nft_holder_fid}`,
      score: score.score,
      campaignName: score.campaign.name,
    }));

    return NextResponse.json({ trendingCampaigns, featuredDuels });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    if (demoFallbackAllowed()) return NextResponse.json(getDemoDashboard());
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
