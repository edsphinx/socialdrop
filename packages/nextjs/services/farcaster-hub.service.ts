/**
 * Farcaster Hub Service - Alternativa gratuita a Neynar
 *
 * Este servicio se conecta directamente a un Farcaster Hub público
 * para obtener datos de usuarios, casts y reacciones SIN costo.
 *
 * Ventajas:
 * - 100% gratis (no API keys necesarias)
 * - Sin rate limits
 * - Descentralizado
 * - Datos en tiempo real
 *
 * Instalación requerida:
 * yarn add @farcaster/hub-nodejs
 */

// NOTA: Descomentar cuando instales la dependencia
// import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";

/**
 * Configuración de hubs públicos disponibles
 * Fuente: https://www.farcaster.network/
 */
const PUBLIC_HUBS = {
  // Hub de Neynar (gratis, irónico pero funciona)
  neynar: "nemes.farcaster.xyz:2283",

  // Hub de Warpcast
  warpcast: "hoyt.farcaster.xyz:2283",

  // Hub de Pinata
  pinata: "hub.pinata.cloud",
};

// Usar hub de Neynar por defecto (más confiable)
const HUB_URL = process.env.FARCASTER_HUB_URL || PUBLIC_HUBS.neynar;

/**
 * Cliente de Hub (lazy initialization)
 */
let hubClient: any = null;

function getHubClient() {
  if (hubClient) return hubClient;

  // Descomentar cuando instales la dependencia:
  // hubClient = getSSLHubRpcClient(HUB_URL);

  // Mientras tanto, throw error
  throw new Error(
    "@farcaster/hub-nodejs not installed. Run: yarn add @farcaster/hub-nodejs\n" +
      "This service provides FREE alternative to Neynar API!",
  );

  return hubClient;
}

/**
 * Interfaz de datos de usuario
 */
export interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  verifiedAddresses: string[];
  custodyAddress?: string;
  address: string; // Prioriza verified, sino custody
  followerCount?: number;
  followingCount?: number;
}

/**
 * Obtiene datos completos de un usuario desde Farcaster Hub
 *
 * Reemplaza: neynar.getUserDataFromFid()
 * Costo: $0 (vs $0.01 con Neynar)
 *
 * @param fid - Farcaster ID del usuario
 * @returns Datos del usuario o null si no existe
 */
export async function getUserFromHub(fid: number): Promise<FarcasterUser | null> {
  try {
    const client = getHubClient();

    console.log(`[Farcaster Hub] Fetching user data for FID ${fid}`);

    // 1. Obtener user data (username, pfp, bio)
    const userDataResult = await client.getUserData({ fid });

    if (userDataResult.isErr()) {
      console.warn(`[Farcaster Hub] User ${fid} not found:`, userDataResult.error.message);
      return null;
    }

    const messages = userDataResult.value.messages;

    // Parsear mensajes de user data
    let username = "";
    let displayName = "";
    let pfpUrl = "";
    let bio = "";

    for (const msg of messages) {
      const data = msg.data?.userDataBody;
      if (!data) continue;

      switch (data.type) {
        case 1: // USER_DATA_TYPE_USERNAME
          username = data.value;
          break;
        case 2: // USER_DATA_TYPE_PFP
          pfpUrl = data.value;
          break;
        case 3: // USER_DATA_TYPE_BIO
          bio = data.value;
          break;
        case 5: // USER_DATA_TYPE_DISPLAY
          displayName = data.value;
          break;
      }
    }

    // 2. Obtener wallets verificadas
    const verificationsResult = await client.getVerificationsByFid({ fid });

    const verifiedAddresses: string[] = [];

    if (verificationsResult.isOk()) {
      for (const msg of verificationsResult.value.messages) {
        const address = msg.data?.verificationAddAddressBody?.address;
        if (address) {
          // Convertir de bytes a hex
          const hexAddress = "0x" + Buffer.from(address).toString("hex");
          verifiedAddresses.push(hexAddress);
        }
      }
    }

    // 3. Obtener custody address (wallet principal)
    const custodyResult = await client.getCustodyAddress({ fid });
    const custodyAddress = custodyResult.isOk() ? "0x" + Buffer.from(custodyResult.value).toString("hex") : undefined;

    // 4. Obtener stats de follows (opcional, puede ser lento)
    // const linksResult = await client.getLinksByFid({ fid });

    return {
      fid,
      username,
      displayName,
      pfpUrl,
      bio,
      verifiedAddresses,
      custodyAddress,
      // Priorizar wallet verificada, sino custody
      address: verifiedAddresses[0] || custodyAddress || "",
    };
  } catch (error) {
    console.error(`[Farcaster Hub] Error fetching user ${fid}:`, error);
    return null;
  }
}

/**
 * Interfaz de reacciones de cast
 */
export interface CastReactions {
  totalLikes: number;
  totalRecasts: number;
  likedByFids: number[];
  recastedByFids: number[];
}

/**
 * Obtiene las reacciones de un cast desde Farcaster Hub
 *
 * Reemplaza: neynar.getCastLikesCount()
 * Costo: $0 (vs $0.005 con Neynar)
 *
 * @param castHash - Hash del cast (con o sin 0x)
 * @param castFid - FID del autor del cast
 * @returns Información de reacciones
 */
export async function getReactionsFromHub(castHash: string, castFid: number): Promise<CastReactions> {
  try {
    const client = getHubClient();

    // Limpiar hash (quitar 0x si existe)
    const cleanHash = castHash.replace("0x", "");
    const hashBuffer = Buffer.from(cleanHash, "hex");

    console.log(`[Farcaster Hub] Fetching reactions for cast ${castHash}`);

    const result = await client.getReactionsByTarget({
      targetCastId: {
        fid: castFid,
        hash: hashBuffer,
      },
    });

    if (result.isErr()) {
      console.warn(`[Farcaster Hub] Error fetching reactions:`, result.error.message);
      return {
        totalLikes: 0,
        totalRecasts: 0,
        likedByFids: [],
        recastedByFids: [],
      };
    }

    const reactions = result.value.messages;

    // Separar por tipo de reacción
    const likedByFids: number[] = [];
    const recastedByFids: number[] = [];

    for (const reaction of reactions) {
      const fid = reaction.data?.fid;
      const type = reaction.data?.reactionBody?.type;

      if (!fid) continue;

      if (type === 1) {
        // REACTION_TYPE_LIKE
        likedByFids.push(fid);
      } else if (type === 2) {
        // REACTION_TYPE_RECAST
        recastedByFids.push(fid);
      }
    }

    return {
      totalLikes: likedByFids.length,
      totalRecasts: recastedByFids.length,
      likedByFids,
      recastedByFids,
    };
  } catch (error) {
    console.error(`[Farcaster Hub] Error fetching reactions:`, error);
    return {
      totalLikes: 0,
      totalRecasts: 0,
      likedByFids: [],
      recastedByFids: [],
    };
  }
}

/**
 * Verifica si un usuario dio like a un cast
 *
 * Reemplaza: neynar.didUserLikeCast()
 * Costo: $0 (vs $0.005 con Neynar)
 *
 * @param fid - FID del usuario
 * @param castHash - Hash del cast
 * @param castFid - FID del autor del cast
 * @returns true si el usuario dio like, false si no
 */
export async function didUserLikeCastHub(fid: number, castHash: string, castFid: number): Promise<boolean> {
  try {
    const reactions = await getReactionsFromHub(castHash, castFid);
    return reactions.likedByFids.includes(fid);
  } catch (error) {
    console.error(`[Farcaster Hub] Error checking like:`, error);
    return false;
  }
}

/**
 * Obtiene información de un cast
 *
 * BONUS: Función que Neynar cobra pero el Hub ofrece gratis
 *
 * @param castHash - Hash del cast
 * @param castFid - FID del autor
 * @returns Datos del cast o null
 */
export async function getCastFromHub(castHash: string, castFid: number): Promise<any | null> {
  try {
    const client = getHubClient();

    const cleanHash = castHash.replace("0x", "");
    const hashBuffer = Buffer.from(cleanHash, "hex");

    const result = await client.getCast({
      fid: castFid,
      hash: hashBuffer,
    });

    if (result.isErr()) {
      return null;
    }

    const cast = result.value;
    const castData = cast.data?.castAddBody;

    if (!castData) return null;

    return {
      hash: castHash,
      fid: castFid,
      text: castData.text,
      mentions: castData.mentions,
      mentionsPositions: castData.mentionsPositions,
      embeds: castData.embeds,
      timestamp: cast.data?.timestamp,
      parentCastId: castData.parentCastId,
      parentUrl: castData.parentUrl,
    };
  } catch (error) {
    console.error(`[Farcaster Hub] Error fetching cast:`, error);
    return null;
  }
}

/**
 * Health check del hub
 *
 * @returns true si el hub está disponible, false si no
 */
export async function isHubAvailable(): Promise<boolean> {
  try {
    const client = getHubClient();
    const result = await client.getHubInfo();
    return result.isOk();
  } catch (error) {
    console.error(`[Farcaster Hub] Hub unavailable:`, error);
    return false;
  }
}

/**
 * Obtiene información del hub (para debugging)
 */
export async function getHubInfo(): Promise<any> {
  try {
    const client = getHubClient();
    const result = await client.getHubInfo();

    if (result.isErr()) {
      return null;
    }

    return {
      version: result.value.version,
      isSyncing: result.value.isSyncing,
      nickname: result.value.nickname,
      rootHash: result.value.rootHash,
    };
  } catch (error) {
    console.error(`[Farcaster Hub] Error getting hub info:`, error);
    return null;
  }
}

/**
 * NOTA IMPORTANTE:
 *
 * Para usar este servicio, instala la dependencia:
 * ```bash
 * yarn add @farcaster/hub-nodejs
 * ```
 *
 * Luego descomenta las líneas de import al inicio del archivo.
 *
 * Opcional: Agrega a .env
 * ```
 * FARCASTER_HUB_URL=nemes.farcaster.xyz:2283
 * ```
 *
 * Para habilitar en producción, usa feature flag:
 * ```
 * USE_FARCASTER_HUB=true
 * ```
 */
