import { neynarClient } from "~~/lib/clients/neynar";

// This check is good for initial setup, but we'll add another inside the function for better type safety.
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

interface CastOptions {
  embeds?: { url: string }[];
  channelId?: string;
  replyTo?: string;
}

/**
 * Publica un cast en Farcaster usando Neynar.
 * @param text - El contenido del cast.
 * @param options - Opciones adicionales como embeds para Frames.
 * @returns El hash del cast publicado.
 */
export async function publishCast(text: string, options: CastOptions = {}) {
  // --- CORRECCIÓN APLICADA AQUÍ ---
  // Añadimos una validación al inicio de la función.
  // Esto le asegura a TypeScript que SIGNER_UUID es un string a partir de este punto.
  if (!SIGNER_UUID) {
    throw new Error("NEYNAR_SIGNER_UUID no está configurado en .env. La publicación del cast ha sido cancelada.");
  }

  try {
    console.log(`[Farcaster Service] Publicando cast...`);

    const response = await neynarClient.publishCast({
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
