import { NextResponse } from "next/server";
import prisma from "@/lib/clients/prisma";
import { demoFallbackAllowed, getDemoDuels, isDemoMode } from "@/lib/demo";
import { getSocialDataProvider } from "@/lib/social";

interface Duel {
  id: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignId: number;
  campaignName: string;
}

export async function GET() {
  if (isDemoMode()) return NextResponse.json(getDemoDuels());

  try {
    // Get the top 10 scores as "active duels"
    const topScores = await prisma.gamification_scores.findMany({
      orderBy: { score: "desc" },
      take: 10,
      include: {
        campaign: {
          select: { name: true, id: true },
        },
      },
    });

    // Extract FIDs to fetch their profiles
    const duelistFids = topScores
      .map((score: (typeof topScores)[number]) => score.nft_holder_fid)
      .filter((fid: number | null): fid is number => fid !== null);

    let duels: Duel[] = [];
    if (duelistFids.length > 0) {
      const social = getSocialDataProvider();
      const users = await social.getBulkUsers(duelistFids);
      const usersMap = new Map(users.map(u => [u.fid, u]));

      duels = topScores.map((score: (typeof topScores)[number]) => {
        const user = usersMap.get(score.nft_holder_fid!);
        return {
          id: score.id,
          name: user ? `@${user.username}` : `Influencer FID #${score.nft_holder_fid}`,
          pfpUrl: user?.pfpUrl || "/default-avatar.svg",
          score: score.score,
          campaignId: score.campaign.id,
          campaignName: score.campaign.name,
        };
      });
    }

    return NextResponse.json({ duels });
  } catch (error) {
    console.error("Error fetching duels list:", error);
    if (demoFallbackAllowed()) return NextResponse.json(getDemoDuels());
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
