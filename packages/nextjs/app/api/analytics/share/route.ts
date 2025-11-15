import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/services/database/client";

/**
 * API endpoint para tracking de shares
 *
 * POST /api/analytics/share
 *
 * Body:
 * {
 *   campaignId: number,
 *   nftLevel: number,
 *   castHash: string,
 *   userAddress: string,
 *   template: string,
 *   timestamp: string
 * }
 *
 * Métricas trackeadas:
 * - Shares por campaña
 * - Shares por nivel de NFT
 * - Templates más efectivos
 * - Viralidad por usuario
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { campaignId, nftLevel, castHash, userAddress, template, timestamp } = body;

    // Validación
    if (!campaignId || !nftLevel || !castHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Guardar share en base de datos
    // (opcional - puedes usar una tabla separada para analytics)
    // await prisma.share.create({
    //   data: {
    //     campaignId,
    //     nftLevel,
    //     castHash,
    //     userAddress,
    //     template,
    //     timestamp: new Date(timestamp),
    //   },
    // });

    // Por ahora, solo loggear
    console.log("[Analytics] Share tracked:", {
      campaignId,
      nftLevel,
      castHash,
      userAddress: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "anon",
      template,
    });

    // Opcional: Incrementar contador de shares en campaña
    if (campaignId) {
      try {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            // Asumiendo que tienes un campo shareCount
            // shareCount: { increment: 1 },
          },
        });
      } catch (error) {
        console.error("[Analytics] Failed to update campaign share count:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Share tracked successfully",
    });
  } catch (error) {
    console.error("[Analytics] Error tracking share:", error);

    return NextResponse.json(
      {
        error: "Failed to track share",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/analytics/share?campaignId=X
 *
 * Obtener estadísticas de shares de una campaña
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    // Obtener stats de la campaña
    // const shares = await prisma.share.findMany({
    //   where: { campaignId: parseInt(campaignId) },
    //   select: {
    //     nftLevel: true,
    //     template: true,
    //     timestamp: true,
    //   },
    // });

    // Calcular métricas
    const stats = {
      totalShares: 0, // shares.length
      sharesByLevel: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
      },
      sharesByTemplate: {},
      recentShares: [], // shares.slice(0, 10)
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Analytics] Error fetching share stats:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
