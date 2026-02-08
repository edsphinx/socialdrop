import { NextResponse } from "next/server";
import { personalNeynarClient } from "~~/lib/clients/neynar";
import prisma from "~~/lib/clients/prisma";

interface Duel {
  id: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignId: number;
  campaignName: string;
}

export async function GET() {
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
    const duelistFids = topScores.map(score => score.nft_holder_fid).filter((fid): fid is number => fid !== null);

    let duels: Duel[] = [];
    if (duelistFids.length > 0) {
      const usersResponse = await personalNeynarClient.fetchBulkUsers({ fids: duelistFids });
      const usersMap = new Map(usersResponse.users.map(user => [user.fid, user]));

      duels = topScores.map(score => {
        const user = usersMap.get(score.nft_holder_fid!);
        return {
          id: score.id,
          name: user ? `@${user.username}` : `Influencer FID #${score.nft_holder_fid}`,
          pfpUrl: user?.pfp_url || "https://placehold.co/64",
          score: score.score,
          campaignId: score.campaign.id,
          campaignName: score.campaign.name,
        };
      });
    }

    return NextResponse.json({ duels });
  } catch (error) {
    console.error("Error fetching duels list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
