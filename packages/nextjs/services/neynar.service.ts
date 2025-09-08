import { personalNeynarClient, readOnlyNeynarClient } from "~~/lib/clients/neynar";

interface CastOptions {
  embeds?: { url: string }[];
  channelId?: string;
  replyTo?: string;
}

export async function getWalletFromFid(fid: number): Promise<string | null> {
  try {
    const userResponse = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
    const user = userResponse.users[0];

    if (!user) return null;

    // Priorizamos wallets verificadas, luego la de custodia
    let address = user.verified_addresses?.eth_addresses?.[0];
    if (!address) {
      address = user.custody_address;
    }
    return address || null;
  } catch (error) {
    console.error("Error fetching user from Neynar:", error);
    return null;
  }
}

/**
 * Obtiene los datos clave de un usuario de Farcaster a partir de su FID.
 * @param fid - El Farcaster ID del usuario.
 * @returns Un objeto con la dirección de la wallet y el nombre de usuario, o null si no se encuentra.
 */
export async function getUserDataFromFid(fid: number): Promise<{ address: string; username: string } | null> {
  try {
    console.log(`[Neynar Service] Buscando datos para el FID: ${fid}`);
    const userResponse = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
    const user = userResponse.users[0];

    if (!user) {
      console.warn(`[Neynar Service] No se encontró usuario para el FID: ${fid}`);
      return null;
    }

    // Lógica para seleccionar la wallet
    let address = user.verified_addresses?.eth_addresses?.[0];
    if (!address) {
      address = user.custody_address;
    }

    // Si no encontramos una dirección de wallet, no podemos continuar.
    if (!address) {
      console.warn(`[Neynar Service] No se encontró wallet para el FID: ${fid}`);
      return null;
    }

    // Devolvemos el objeto completo con los datos que necesitamos.
    return {
      address,
      username: user.username,
    };
  } catch (error) {
    console.error("[Neynar Service] Error al obtener datos del usuario:", error);
    return null;
  }
}

export async function didUserLikeCast(fid: number, castHash: string): Promise<boolean> {
  try {
    const response = await readOnlyNeynarClient.fetchCastReactions({
      hash: castHash,
      types: ["likes"],
      viewerFid: fid,
    });

    return response.reactions.some(reaction => reaction.user.fid === fid);
  } catch (error) {
    console.error("[Neynar Service] Error al verificar la reacción del cast:", error);
    return false;
  }
}

/**
 * Publica un cast en Farcaster usando Neynar.
 * @param text - El contenido del cast.
 * @param options - Opciones adicionales como embeds para Frames.
 * @returns El hash del cast publicado.
 */
export async function publishCast(text: string, options: CastOptions = {}) {
  const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
  if (!SIGNER_UUID) {
    throw new Error("NEYNAR_SIGNER_UUID no está configurado en .env. La publicación del cast ha sido cancelada.");
  }

  try {
    console.log(`[Farcaster Service] Publicando cast...`);

    const response = await personalNeynarClient.publishCast({
      signerUuid: SIGNER_UUID, // TypeScript ahora sabe que esto es un 'string'
      text,
      ...options,
    });

    const hash = response.cast.hash;

    console.log(`[Farcaster Service] Cast publicado exitosamente. Hash: ${hash}`);
    return { success: true, hash: hash };
  } catch (error) {
    console.error("[Farcaster Service] Error al publicar el cast:", error);
    return { success: false, hash: null };
  }
}
