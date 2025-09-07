import { neynarClient } from "~~/lib/clients/neynar";

export async function getWalletFromFid(fid: number): Promise<string | null> {
  try {
    const userResponse = await neynarClient.fetchBulkUsers({ fids: [fid] });
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
    const userResponse = await neynarClient.fetchBulkUsers({ fids: [fid] });
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
