import { NextResponse } from "next/server";
import prisma from "@/lib/clients/prisma";
import { getDemoCampaigns, isDemoMode } from "@/lib/demo";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(getDemoCampaigns());

  try {
    const campaigns = await prisma.campaigns.findMany({
      orderBy: {
        created_at: "desc",
      },
      include: {
        _count: {
          select: { nfts_minted: true },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
