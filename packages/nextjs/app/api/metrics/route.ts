import { NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";

export async function GET() {
  try {
    const [totalCampaigns, activeCampaigns, totalMints, uniqueParticipants, registeredCompetitors] = await Promise.all([
      prisma.campaigns.count(),
      prisma.campaigns.count({ where: { is_active: true } }),
      prisma.nfts_minted.count(),
      prisma.nfts_minted.groupBy({ by: ["recipient_address"], _count: true }).then((r: unknown[]) => r.length),
      prisma.gamification_scores.count(),
    ]);

    return NextResponse.json({
      totalCampaigns,
      activeCampaigns,
      totalMints,
      uniqueParticipants,
      registeredCompetitors,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
