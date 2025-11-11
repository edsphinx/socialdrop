/**
 * Airstack Service - Alternativa PROBADA y gratis a Neynar
 *
 * Airstack es un servicio que indexa Farcaster, Lens, y XMTP.
 * Free tier: 100,000 requests/mes (suficiente para MVP)
 *
 * Ventajas vs Farcaster Hub:
 * - ✅ Más fácil de usar (GraphQL)
 * - ✅ Probado por muchos proyectos
 * - ✅ Mejor documentación
 * - ✅ Incluye datos adicionales (ENS, XMTP, etc)
 *
 * Instalación:
 * yarn add @airstack/node
 *
 * Configuración:
 * 1. Obtener API key en https://app.airstack.xyz (gratis)
 * 2. Agregar a .env: AIRSTACK_API_KEY=tu_key
 * 3. Descomentar líneas de import abajo
 */

// PASO 1: Descomentar cuando instales @airstack/node
// import { init, fetchQuery } from "@airstack/node";

// PASO 2: Descomentar para inicializar
// Inicializar con API key (free tier disponible en https://app.airstack.xyz)
// if (process.env.AIRSTACK_API_KEY) {
//   init(process.env.AIRSTACK_API_KEY);
// }

/**
 * Obtiene datos de usuario desde Airstack
 *
 * Reemplaza: neynar.getUserDataFromFid()
 * Costo: $0 (free tier hasta 100k requests/mes)
 */
export async function getUserFromAirstack(fid: number): Promise<{ address: string; username: string } | null> {
  // Descomentar cuando instales @airstack/node
  throw new Error("@airstack/node not installed. Run: yarn add @airstack/node");

  /*
  const query = `
    query GetFarcasterUser {
      Socials(
        input: {
          filter: {
            dappName: { _eq: farcaster },
            userId: { _eq: "${fid}" }
          }
          blockchain: ethereum
        }
      ) {
        Social {
          userId
          profileName
          profileDisplayName
          profileImage
          profileBio
          connectedAddresses {
            address
            blockchain
          }
          userAssociatedAddresses
        }
      }
    }
  `;

  const { data, error } = await fetchQuery(query);

  if (error) {
    console.error("[Airstack] Error fetching user:", error);
    return null;
  }

  const social = data?.Socials?.Social?.[0];

  if (!social) {
    console.warn(`[Airstack] User ${fid} not found`);
    return null;
  }

  return {
    address: social.connectedAddresses?.[0]?.address || social.userAssociatedAddresses?.[0] || "",
    username: social.profileName || "",
  };
  */
}

/**
 * Obtiene reacciones de un cast desde Airstack
 *
 * Reemplaza: neynar.getCastLikesCount()
 * Costo: $0 (free tier)
 */
export async function getCastLikesAirstack(castHash: string): Promise<number> {
  throw new Error("@airstack/node not installed");

  /*
  const query = `
    query GetReactions {
      FarcasterReactions(
        input: {
          filter: {
            castHash: { _eq: "${castHash}" }
            reactionType: { _eq: like }
          }
          blockchain: ALL
        }
      ) {
        Reaction {
          castHash
          reactionType
          reactedBy {
            userId
            profileName
          }
        }
      }
    }
  `;

  const { data, error } = await fetchQuery(query);

  if (error) {
    console.error("[Airstack] Error fetching reactions:", error);
    return 0;
  }

  return data?.FarcasterReactions?.Reaction?.length || 0;
  */
}

/**
 * Verifica si un usuario dio like a un cast
 */
export async function didUserLikeAirstack(fid: number, castHash: string): Promise<boolean> {
  throw new Error("@airstack/node not installed");

  /*
  const query = `
    query CheckLike {
      FarcasterReactions(
        input: {
          filter: {
            castHash: { _eq: "${castHash}" }
            reactedBy: { userId: { _eq: "${fid}" } }
            reactionType: { _eq: like }
          }
          blockchain: ALL
        }
      ) {
        Reaction {
          reactionType
        }
      }
    }
  `;

  const { data, error } = await fetchQuery(query);

  if (error) return false;

  return (data?.FarcasterReactions?.Reaction?.length || 0) > 0;
  */
}

/**
 * BONUS: Obtiene trending casts (función extra gratis)
 */
export async function getTrendingCasts(limit: number = 10) {
  throw new Error("@airstack/node not installed");

  /*
  const query = `
    query TrendingCasts {
      FarcasterCasts(
        input: {
          filter: {
            castedAtTimestamp: { _gte: "${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}" }
          }
          blockchain: ALL
          order: { numberOfLikes: DESC }
          limit: ${limit}
        }
      ) {
        Cast {
          castHash
          castedBy {
            userId
            profileName
          }
          text
          numberOfLikes
          numberOfRecasts
        }
      }
    }
  `;

  const { data } = await fetchQuery(query);
  return data?.FarcasterCasts?.Cast || [];
  */
}

/**
 * Setup instructions:
 *
 * 1. Get free API key:
 *    https://app.airstack.xyz
 *
 * 2. Install:
 *    yarn add @airstack/node
 *
 * 3. Add to .env:
 *    AIRSTACK_API_KEY=your_key_here
 *
 * 4. Uncomment code above
 *
 * Free tier limits:
 * - 100,000 requests/month
 * - Rate limit: 50 requests/second
 * - Perfect for MVP/Beta
 */
