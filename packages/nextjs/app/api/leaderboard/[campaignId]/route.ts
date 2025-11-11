import { NextRequest, NextResponse } from "next/server";
import * as leaderboardService from "~~/services/leaderboard.service";

/**
 * GET /api/leaderboard/[campaignId]
 *
 * Obtiene el leaderboard de una campaña con paginación
 *
 * Query params:
 * - page: número de página (default: 1)
 * - limit: resultados por página (default: 10, max: 100)
 *
 * Ejemplos:
 * - /api/leaderboard/1
 * - /api/leaderboard/1?page=2&limit=20
 */
export async function GET(request: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const campaignId = parseInt(params.campaignId);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    // Obtener query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    console.log(`[API Leaderboard] Solicitando leaderboard para campaña ${campaignId}, página ${page}`);

    // Obtener leaderboard
    const leaderboard = await leaderboardService.getLeaderboard(campaignId, page, limit);

    if (!leaderboard) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(leaderboard, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("[API Leaderboard] Error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
