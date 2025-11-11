import { createCache, InMemoryCache } from "~~/lib/cache";

/**
 * Instancias de cache para diferentes tipos de datos
 * Cada una tiene su propia configuración de TTL y tamaño
 */

// Cache para campaigns (5 minutos TTL, hasta 100 campaigns)
export const campaignsCache = createCache<any>("campaigns", {
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutos
});

// Cache para datos de usuarios de Neynar (10 minutos TTL, hasta 500 usuarios)
export const userDataCache = createCache<{ address: string; username: string }>("users", {
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutos
});

// Cache para leaderboards (30 segundos TTL, hasta 50 leaderboards)
export const leaderboardCache = createCache<any>("leaderboard", {
  maxSize: 50,
  defaultTTL: 30 * 1000, // 30 segundos
});

// Cache para likes count de casts (1 minuto TTL, hasta 200 casts)
export const castLikesCache = createCache<number>("cast-likes", {
  maxSize: 200,
  defaultTTL: 60 * 1000, // 1 minuto
});

// Cache para niveles de NFTs (5 minutos TTL, hasta 1000 NFTs)
export const nftLevelCache = createCache<number>("nft-levels", {
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutos
});

// Cache para stats de gamification (2 minutos TTL, hasta 200 registros)
export const gameStatsCache = createCache<any>("game-stats", {
  maxSize: 200,
  defaultTTL: 2 * 60 * 1000, // 2 minutos
});

/**
 * Cleanup job - ejecutar periódicamente para limpiar entradas expiradas
 * Puede ser llamado desde un cron job o endpoint de mantenimiento
 */
export function cleanupAllCaches(): {
  campaigns: number;
  users: number;
  leaderboard: number;
  castLikes: number;
  nftLevels: number;
  gameStats: number;
  total: number;
} {
  const stats = {
    campaigns: campaignsCache.cleanup(),
    users: userDataCache.cleanup(),
    leaderboard: leaderboardCache.cleanup(),
    castLikes: castLikesCache.cleanup(),
    nftLevels: nftLevelCache.cleanup(),
    gameStats: gameStatsCache.cleanup(),
    total: 0,
  };

  stats.total =
    stats.campaigns + stats.users + stats.leaderboard + stats.castLikes + stats.nftLevels + stats.gameStats;

  if (stats.total > 0) {
    console.log(`[Cache Service] Cleaned up ${stats.total} expired entries`);
  }

  return stats;
}

/**
 * Obtiene estadísticas consolidadas de todos los caches
 */
export function getAllCacheStats() {
  return {
    campaigns: campaignsCache.getStats(),
    users: userDataCache.getStats(),
    leaderboard: leaderboardCache.getStats(),
    castLikes: castLikesCache.getStats(),
    nftLevels: nftLevelCache.getStats(),
    gameStats: gameStatsCache.getStats(),
  };
}

/**
 * Limpia todos los caches (útil para testing o mantenimiento)
 */
export function clearAllCaches(): void {
  campaignsCache.clear();
  userDataCache.clear();
  leaderboardCache.clear();
  castLikesCache.clear();
  nftLevelCache.clear();
  gameStatsCache.clear();
  console.log("[Cache Service] All caches cleared");
}

/**
 * Helper: Invalida el cache de una campaña específica
 */
export function invalidateCampaign(campaignId: number): void {
  campaignsCache.delete(campaignId.toString());
  campaignsCache.delete(`hash:${campaignId}`);
  // También invalidar el leaderboard de esta campaña
  leaderboardCache.delete(`campaign:${campaignId}`);
  console.log(`[Cache Service] Invalidated cache for campaign ${campaignId}`);
}

/**
 * Helper: Invalida el cache de un usuario específico
 */
export function invalidateUser(fid: number): void {
  userDataCache.delete(fid.toString());
  console.log(`[Cache Service] Invalidated cache for user ${fid}`);
}

/**
 * Helper: Invalida el cache de un cast específico
 */
export function invalidateCast(castHash: string): void {
  castLikesCache.delete(castHash);
  console.log(`[Cache Service] Invalidated cache for cast ${castHash}`);
}
