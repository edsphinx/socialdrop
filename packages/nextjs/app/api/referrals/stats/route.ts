import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~~/services/database/client";

/**
 * API endpoint para estadísticas de referidos
 *
 * GET /api/referrals/stats?address=0x...
 *
 * Returns:
 * {
 *   totalReferrals: number,
 *   activeReferrals: number,
 *   rewardsEarned: number,
 *   rank: number
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }

    // TODO: Implementar lógica real de referidos
    // Por ahora, retornar datos mock

    // En una implementación real:
    // 1. Buscar usuario por address
    // 2. Contar referidos (usuarios que usaron su código)
    // 3. Filtrar referidos activos (que han hecho al menos 1 claim)
    // 4. Calcular rewards ganados
    // 5. Determinar rank en leaderboard

    const stats = {
      totalReferrals: 0, // await prisma.user.count({ where: { referredBy: address } })
      activeReferrals: 0, // await prisma.user.count({ where: { referredBy: address, claimCount: { gt: 0 } } })
      rewardsEarned: 0, // totalReferrals * 10 (10 puntos por referido)
      rank: undefined, // Posición en leaderboard
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Referrals] Error fetching stats:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch referral stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
