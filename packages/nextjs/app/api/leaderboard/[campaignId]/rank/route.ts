import { NextRequest, NextResponse } from "next/server";
import * as leaderboardService from "~~/services/leaderboard.service";

/**
 * GET /api/leaderboard/[campaignId]/rank
 *
 * Obtiene el rank de un usuario específico en una campaña
 *
 * Query params:
 * - address: dirección del usuario (requerido)
 *
 * Ejemplo:
 * - /api/leaderboard/1/rank?address=0x123...
 */
export async function GET(request: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const campaignId = parseInt(params.campaignId);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
    }

    console.log(`[API Leaderboard Rank] Obteniendo rank para ${address} en campaña ${campaignId}`);

    const rankData = await leaderboardService.getUserRank(campaignId, address);

    if (!rankData) {
      return NextResponse.json({ error: "User not found in this campaign" }, { status: 404 });
    }

    return NextResponse.json({
      campaignId,
      address,
      ...rankData,
    });
  } catch (error: any) {
    console.error("[API Leaderboard Rank] Error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
