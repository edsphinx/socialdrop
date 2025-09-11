import { NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";

export async function GET() {
  try {
    // Obtenemos las 4 campañas activas más recientes para mostrar como "del momento"
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

    // Obtenemos los 4 puntajes más altos para mostrarlos como "duelos destacados"
    const topScores = await prisma.gamification_scores.findMany({
      orderBy: { score: "desc" },
      take: 4,
      include: {
        campaign: {
          select: { name: true },
        },
      },
    });

    // Transformamos los datos para el frontend
    const featuredDuels = topScores.map(score => ({
      id: score.id,
      // En una app real, aquí usaríamos el FID para obtener el @username
      name: `Influencer FID #${score.nft_holder_fid}`,
      score: score.score,
      campaignName: score.campaign.name,
    }));

    return NextResponse.json({ trendingCampaigns, featuredDuels });
  } catch (error) {
    console.error("Error al obtener los datos del dashboard:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
