import { NextResponse } from "next/server";
import { neynarClient } from "~~/lib/clients/neynar";
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
    // Obtenemos los 10 puntajes más altos como nuestros "duelos activos"
    const topScores = await prisma.gamification_scores.findMany({
      orderBy: { score: "desc" },
      take: 10,
      include: {
        campaign: {
          select: { name: true, id: true },
        },
      },
    });

    // Extraemos los FIDs de los duelistas para obtener sus perfiles
    const duelistFids = topScores.map(score => score.nft_holder_fid).filter((fid): fid is number => fid !== null);

    let duels: Duel[] = [];
    if (duelistFids.length > 0) {
      const usersResponse = await neynarClient.fetchBulkUsers({ fids: duelistFids });
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
    console.error("Error al obtener la lista de duelos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
