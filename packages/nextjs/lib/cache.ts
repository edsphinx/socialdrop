/**
 * Sistema de caché in-memory con LRU (Least Recently Used) eviction
 *
 * Este cache es útil para:
 * - Reducir llamadas a la base de datos
 * - Reducir llamadas a APIs externas (Neynar)
 * - Mejorar tiempos de respuesta
 *
 * Características:
 * - TTL (Time To Live) configurable por entrada
 * - LRU eviction cuando se alcanza el límite
 * - Namespace support para diferentes tipos de datos
 * - Thread-safe (single-threaded Node.js environment)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export class InMemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number; // en milisegundos
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Obtiene un valor del cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar si expiró
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Actualizar último acceso (para LRU)
    entry.accessedAt = Date.now();
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Guarda un valor en el cache
   */
  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Si el cache está lleno, eliminar la entrada menos recientemente usada
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      accessedAt: now,
    });
  }

  /**
   * Verifica si una key existe y no ha expirado
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Elimina una entrada del cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Obtiene las estadísticas del cache
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Elimina todas las entradas expiradas
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Obtiene el tamaño actual del cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Elimina la entrada menos recientemente usada (LRU eviction)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[Cache] Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Get or Set pattern: intenta obtener del cache, si no existe ejecuta la función y cachea el resultado
   */
  async getOrSet(key: string, fetchFn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    // Intentar obtener del cache
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Si no existe, ejecutar la función
    const value = await fetchFn();

    // Cachear el resultado
    this.set(key, value, ttl);

    return value;
  }
}

/**
 * Factory function para crear caches con configuraciones predefinidas
 */
export function createCache<T>(namespace: string, options?: { maxSize?: number; defaultTTL?: number }) {
  const cache = new InMemoryCache<T>(options?.maxSize, options?.defaultTTL);

  return {
    get: (key: string) => cache.get(`${namespace}:${key}`),
    set: (key: string, value: T, ttl?: number) => cache.set(`${namespace}:${key}`, value, ttl),
    has: (key: string) => cache.has(`${namespace}:${key}`),
    delete: (key: string) => cache.delete(`${namespace}:${key}`),
    clear: () => cache.clear(),
    getStats: () => cache.getStats(),
    cleanup: () => cache.cleanup(),
    getOrSet: (key: string, fetchFn: () => Promise<T>, ttl?: number) =>
      cache.getOrSet(`${namespace}:${key}`, fetchFn, ttl),
  };
}
