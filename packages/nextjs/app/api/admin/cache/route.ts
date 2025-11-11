import { NextRequest, NextResponse } from "next/server";
import * as cacheService from "~~/services/cache.service";

/**
 * GET /api/admin/cache
 *
 * Obtiene estadísticas de todos los caches
 *
 * Útil para monitoreo y debugging
 */
export async function GET(request: NextRequest) {
  try {
    const stats = cacheService.getAllCacheStats();

    // Calcular totales
    const totals = Object.values(stats).reduce(
      (acc, stat) => {
        acc.hits += stat.hits;
        acc.misses += stat.misses;
        acc.size += stat.size;
        acc.maxSize += stat.maxSize;
        return acc;
      },
      { hits: 0, misses: 0, size: 0, maxSize: 0 },
    );

    const totalRequests = totals.hits + totals.misses;
    const overallHitRate = totalRequests > 0 ? totals.hits / totalRequests : 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      totals: {
        ...totals,
        hitRate: Math.round(overallHitRate * 100) / 100,
        requests: totalRequests,
      },
    });
  } catch (error: any) {
    console.error("[API Cache Stats] Error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/cache
 *
 * Ejecuta operaciones de mantenimiento del cache
 *
 * Body:
 * - action: "cleanup" | "clear"
 *
 * "cleanup": Elimina entradas expiradas
 * "clear": Limpia todo el cache (usar con cuidado)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required (cleanup or clear)" }, { status: 400 });
    }

    if (action === "cleanup") {
      const cleanupStats = cacheService.cleanupAllCaches();

      return NextResponse.json({
        success: true,
        action: "cleanup",
        timestamp: new Date().toISOString(),
        removed: cleanupStats,
        message: `Removed ${cleanupStats.total} expired entries`,
      });
    }

    if (action === "clear") {
      cacheService.clearAllCaches();

      return NextResponse.json({
        success: true,
        action: "clear",
        timestamp: new Date().toISOString(),
        message: "All caches cleared successfully",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[API Cache Maintenance] Error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
