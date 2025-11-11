/**
 * Farcaster Service - Wrapper Híbrido
 *
 * Este servicio permite usar Farcaster Hub (gratis) o Neynar (pago)
 * mediante un feature flag, facilitando la transición gradual.
 *
 * Ventajas:
 * - Switch fácil entre proveedores
 * - Fallback automático
 * - Testing A/B
 * - Reducción de costos gradual
 */

import * as hubService from "./farcaster-hub.service";
import * as neynar from "./neynar.service";
import { castLikesCache, userDataCache } from "./cache.service";

/**
 * Feature flags de configuración
 */
const USE_HUB = process.env.USE_FARCASTER_HUB === "true";
const HUB_AS_FALLBACK = process.env.HUB_AS_FALLBACK === "true"; // Usar hub si Neynar falla

/**
 * Obtiene datos de usuario con fallback automático
 *
 * Flujo:
 * 1. Si USE_HUB=true → Usar Farcaster Hub (gratis)
 * 2. Si USE_HUB=false → Usar Neynar (pago)
 * 3. Si HUB_AS_FALLBACK=true → Intentar Neynar, fallback a Hub
 */
export async function getUserData(fid: number): Promise<{ address: string; username: string } | null> {
  // Cache primero (ahorro en ambos casos)
  return userDataCache.getOrSet(fid.toString(), async () => {
    if (USE_HUB) {
      console.log(`[Farcaster Service] Using Hub for user ${fid}`);

      try {
        const hubData = await hubService.getUserFromHub(fid);
        if (!hubData) return null;

        return {
          address: hubData.address,
          username: hubData.username,
        };
      } catch (error) {
        console.error(`[Farcaster Service] Hub failed for user ${fid}:`, error);

        // Si hub falla y tenemos fallback, usar Neynar
        if (HUB_AS_FALLBACK) {
          console.log(`[Farcaster Service] Falling back to Neynar for user ${fid}`);
          return await neynar.getUserDataFromFid(fid);
        }

        return null;
      }
    } else {
      console.log(`[Farcaster Service] Using Neynar for user ${fid}`);

      try {
        return await neynar.getUserDataFromFid(fid);
      } catch (error) {
        console.error(`[Farcaster Service] Neynar failed for user ${fid}:`, error);

        // Si Neynar falla y tenemos fallback, usar Hub
        if (HUB_AS_FALLBACK) {
          console.log(`[Farcaster Service] Falling back to Hub for user ${fid}`);

          try {
            const hubData = await hubService.getUserFromHub(fid);
            if (!hubData) return null;

            return {
              address: hubData.address,
              username: hubData.username,
            };
          } catch (hubError) {
            console.error(`[Farcaster Service] Both providers failed for user ${fid}`);
            return null;
          }
        }

        return null;
      }
    }
  });
}

/**
 * Obtiene el conteo de likes de un cast
 *
 * NOTA: Requiere castFid para Hub (Neynar no lo necesita)
 */
export async function getCastLikes(castHash: string, castFid?: number): Promise<number> {
  return castLikesCache.getOrSet(
    castHash,
    async () => {
      if (USE_HUB) {
        if (!castFid) {
          console.warn(
            `[Farcaster Service] castFid required for Hub. Falling back to Neynar or returning 0.`,
          );
          if (!HUB_AS_FALLBACK) return 0;
        } else {
          console.log(`[Farcaster Service] Using Hub for cast ${castHash}`);

          try {
            const reactions = await hubService.getReactionsFromHub(castHash, castFid);
            return reactions.totalLikes;
          } catch (error) {
            console.error(`[Farcaster Service] Hub failed for cast ${castHash}:`, error);
            if (!HUB_AS_FALLBACK) return 0;
          }
        }

        // Fallback a Neynar
        console.log(`[Farcaster Service] Falling back to Neynar for cast ${castHash}`);
        return await neynar.getCastLikesCount(castHash);
      } else {
        console.log(`[Farcaster Service] Using Neynar for cast ${castHash}`);

        try {
          return await neynar.getCastLikesCount(castHash);
        } catch (error) {
          console.error(`[Farcaster Service] Neynar failed for cast ${castHash}:`, error);

          if (HUB_AS_FALLBACK && castFid) {
            console.log(`[Farcaster Service] Falling back to Hub for cast ${castHash}`);
            const reactions = await hubService.getReactionsFromHub(castHash, castFid);
            return reactions.totalLikes;
          }

          return 0;
        }
      }
    },
    60 * 1000,
  ); // 1 min TTL
}

/**
 * Verifica si un usuario dio like a un cast
 *
 * NOTA: Requiere castFid para Hub
 */
export async function didUserLike(fid: number, castHash: string, castFid?: number): Promise<boolean> {
  if (USE_HUB) {
    if (!castFid) {
      console.warn(`[Farcaster Service] castFid required for Hub. Using Neynar.`);
      return await neynar.didUserLikeCast(fid, castHash);
    }

    console.log(`[Farcaster Service] Using Hub to check like for user ${fid}`);

    try {
      return await hubService.didUserLikeCastHub(fid, castHash, castFid);
    } catch (error) {
      console.error(`[Farcaster Service] Hub failed checking like:`, error);

      if (HUB_AS_FALLBACK) {
        console.log(`[Farcaster Service] Falling back to Neynar`);
        return await neynar.didUserLikeCast(fid, castHash);
      }

      return false;
    }
  } else {
    console.log(`[Farcaster Service] Using Neynar to check like for user ${fid}`);

    try {
      return await neynar.didUserLikeCast(fid, castHash);
    } catch (error) {
      console.error(`[Farcaster Service] Neynar failed checking like:`, error);

      if (HUB_AS_FALLBACK && castFid) {
        console.log(`[Farcaster Service] Falling back to Hub`);
        return await hubService.didUserLikeCastHub(fid, castHash, castFid);
      }

      return false;
    }
  }
}

/**
 * Publica un cast
 *
 * NOTA: Esto siempre usa Neynar porque requiere un signer
 * En el futuro se puede implementar con Hub propio
 */
export async function publishCast(text: string, options: any = {}) {
  console.log(`[Farcaster Service] Publishing cast (always uses Neynar)`);
  return await neynar.publishCast(text, options);
}

/**
 * Stats del servicio híbrido
 */
export function getProviderInfo() {
  return {
    primary: USE_HUB ? "Farcaster Hub (FREE)" : "Neynar (PAID)",
    fallbackEnabled: HUB_AS_FALLBACK,
    estimatedMonthlyCost: USE_HUB ? "$0" : "$25-300",
    savings: USE_HUB ? "100%" : "0%",
  };
}
