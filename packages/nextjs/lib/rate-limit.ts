/**
 * Rate Limiting con algoritmo Token Bucket
 *
 * Implementación simple y efectiva de rate limiting sin dependencias externas.
 * Ideal para Next.js edge functions y serverless environments.
 *
 * Características:
 * - Token Bucket algorithm para suavizar bursts
 * - Tracking por IP address
 * - Múltiples límites configurables
 * - Auto-cleanup de entradas antiguas
 * - Headers informativos (X-RateLimit-*)
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxRequests: number; // Máximo de requests permitidos
  windowMs: number; // Ventana de tiempo en millisegundos
  message?: string; // Mensaje personalizado cuando se excede
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp cuando se resetea
  retryAfter?: number; // Segundos para reintentar
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Verifica si una request está permitida
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    // Si no existe el bucket, crear uno nuevo
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests - 1, // Restar 1 por esta request
        lastRefill: now,
      };
      this.buckets.set(identifier, bucket);

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: bucket.tokens,
        reset: now + this.config.windowMs,
      };
    }

    // Calcular tokens a recargar basándose en el tiempo transcurrido
    const timePassed = now - bucket.lastRefill;
    const refillRate = this.config.maxRequests / this.config.windowMs;
    const tokensToAdd = timePassed * refillRate;

    // Recargar tokens (máximo hasta el límite)
    bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Verificar si hay tokens disponibles
    if (bucket.tokens < 1) {
      // Rate limit excedido
      const resetTime = now + this.config.windowMs;
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate / 1000);

      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        reset: resetTime,
        retryAfter,
      };
    }

    // Consumir un token
    bucket.tokens -= 1;

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: Math.floor(bucket.tokens),
      reset: now + this.config.windowMs,
    };
  }

  /**
   * Limpia entradas antiguas (ejecutar periódicamente)
   */
  cleanup(): number {
    const now = Date.now();
    const threshold = now - this.config.windowMs * 2; // 2x la ventana
    let removed = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < threshold) {
        this.buckets.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Rate Limiter] Cleaned up ${removed} old entries`);
    }

    return removed;
  }

  /**
   * Obtiene el tamaño actual del tracking
   */
  size(): number {
    return this.buckets.size;
  }

  /**
   * Limpia todo el tracking
   */
  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Rate limiters predefinidos para diferentes endpoints
 */
export const rateLimiters = {
  // APIs públicas - límite moderado
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests por minuto
    message: "Too many requests, please try again later.",
  }),

  // Webhooks - límite alto (tráfico legítimo)
  webhook: new RateLimiter({
    maxRequests: 500,
    windowMs: 60 * 1000, // 500 requests por minuto
    message: "Webhook rate limit exceeded.",
  }),

  // Claim endpoint - límite más estricto (operación costosa)
  claim: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 claims por minuto por IP
    message: "Too many claim attempts, please wait before trying again.",
  }),

  // Admin endpoints - límite conservador
  admin: new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests por minuto
    message: "Admin endpoint rate limit exceeded.",
  }),

  // Leaderboard - límite moderado
  leaderboard: new RateLimiter({
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 requests por minuto
    message: "Leaderboard rate limit exceeded.",
  }),
};

/**
 * Helper function para obtener el identificador de la request (IP o user ID)
 */
export function getRequestIdentifier(request: Request): string {
  // Intentar obtener IP de headers comunes
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  const ip = forwarded?.split(",")[0] || realIp || cfConnectingIp || "unknown";

  return ip.trim();
}

/**
 * Wrapper function para aplicar rate limiting a un endpoint
 *
 * Uso:
 * ```ts
 * export async function GET(request: Request) {
 *   const rateLimit = applyRateLimit(request, rateLimiters.api);
 *   if (!rateLimit.success) {
 *     return NextResponse.json(
 *       { error: rateLimit.message },
 *       { status: 429, headers: rateLimit.headers }
 *     );
 *   }
 *
 *   // Tu lógica aquí...
 * }
 * ```
 */
export function applyRateLimit(
  request: Request,
  limiter: RateLimiter,
  identifier?: string,
): {
  success: boolean;
  message?: string;
  headers: Record<string, string>;
} {
  const id = identifier || getRequestIdentifier(request);
  const result = limiter.check(id);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };

  if (!result.success && result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return {
    success: result.success,
    message: result.success
      ? undefined
      : (limiter as any).config.message || "Rate limit exceeded, please try again later.",
    headers,
  };
}

/**
 * Cron job para limpiar rate limiters
 * Ejecutar cada 10-15 minutos
 */
export function cleanupRateLimiters(): {
  [key: string]: number;
  total: number;
} {
  const stats = {
    api: rateLimiters.api.cleanup(),
    webhook: rateLimiters.webhook.cleanup(),
    claim: rateLimiters.claim.cleanup(),
    admin: rateLimiters.admin.cleanup(),
    leaderboard: rateLimiters.leaderboard.cleanup(),
    total: 0,
  };

  stats.total = stats.api + stats.webhook + stats.claim + stats.admin + stats.leaderboard;

  return stats;
}
