import { NextRequest, NextResponse } from "next/server";
import * as evolutionService from "~~/services/evolution.service";

/**
 * Endpoint de cron job para procesar evoluciones automáticas de NFTs
 *
 * Este endpoint debe ser llamado periódicamente (cada 5-10 minutos) por:
 * - Vercel Cron (https://vercel.com/docs/cron-jobs)
 * - Un servicio externo de cron (cron-job.org, EasyCron, etc)
 * - Manualmente para testing
 *
 * Seguridad: Usa CRON_SECRET para validar que solo fuentes autorizadas puedan ejecutarlo
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Validar que la petición viene de una fuente autorizada
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron - Evolution] Intento de acceso no autorizado");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron - Evolution] ⏰ Iniciando proceso de evolución automática...");

    // 2. Procesar todas las evoluciones pendientes
    const results = await evolutionService.processAllEvolutions();

    // 3. Filtrar solo las evoluciones exitosas
    const successfulEvolutions = results.filter(r => r.success);
    const failedEvolutions = results.filter(r => !r.success);

    const executionTime = Date.now() - startTime;

    console.log(
      `[Cron - Evolution] ✅ Proceso completado en ${executionTime}ms. Exitosas: ${successfulEvolutions.length}, Fallidas: ${failedEvolutions.length}`,
    );

    // 4. Retornar resumen detallado
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      summary: {
        total: results.length,
        successful: successfulEvolutions.length,
        failed: failedEvolutions.length,
      },
      evolutions: successfulEvolutions.map(r => ({
        tokenId: r.tokenId,
        username: r.username,
        campaign: r.campaignName,
        evolution: `Level ${r.previousLevel} → ${r.newLevel}`,
      })),
      errors: failedEvolutions.map(r => ({
        tokenId: r.tokenId,
        campaign: r.campaignName,
        error: r.error,
      })),
    });
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error("[Cron - Evolution] ❌ Error crítico:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        error: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint para procesar evoluciones de una campaña específica
 * Útil para testing o procesamiento manual
 */
export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId || typeof campaignId !== "number") {
      return NextResponse.json({ error: "campaignId is required and must be a number" }, { status: 400 });
    }

    console.log(`[Cron - Evolution] Procesando evoluciones manuales para campaña ${campaignId}...`);

    const results = await evolutionService.processEvolutionsForCampaign(campaignId);
    const successfulEvolutions = results.filter(r => r.success);

    return NextResponse.json({
      success: true,
      campaignId,
      summary: {
        total: results.length,
        successful: successfulEvolutions.length,
      },
      evolutions: successfulEvolutions,
    });
  } catch (error: any) {
    console.error("[Cron - Evolution] Error en POST:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
