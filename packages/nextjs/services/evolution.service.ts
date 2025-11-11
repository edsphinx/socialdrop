import prisma from "~~/lib/clients/prisma";
import * as blockchain from "./blockchain.service";
import * as neynar from "./neynar.service";

/**
 * Thresholds de likes para cada nivel de evolución
 */
export const EVOLUTION_THRESHOLDS = {
  1: 10, // Level 1 → Level 2: 10 likes
  2: 50, // Level 2 → Level 3: 50 likes
  3: 100, // Level 3 → Level 4: 100 likes
  // Agregar más niveles aquí si es necesario
};

export interface EvolutionResult {
  tokenId: number;
  previousLevel: number;
  newLevel: number;
  username: string;
  campaignName: string;
  success: boolean;
  error?: string;
}

/**
 * Procesa todos los NFTs elegibles para evolución basándose en sus likes actuales
 * @returns Array de resultados de evolución
 */
export async function processAllEvolutions(): Promise<EvolutionResult[]> {
  const results: EvolutionResult[] = [];

  try {
    console.log("[Evolution Service] Iniciando proceso de evolución automática...");

    // 1. Obtener todos los registros de gamification con tracked_cast_hash
    const gamificationRecords = await prisma.gamification_scores.findMany({
      where: {
        tracked_cast_hash: {
          not: null,
        },
      },
      include: {
        campaign: true,
      },
    });

    console.log(`[Evolution Service] Encontrados ${gamificationRecords.length} registros para revisar.`);

    // 2. Procesar cada registro
    for (const record of gamificationRecords) {
      if (!record.tracked_cast_hash) continue;

      try {
        const result = await processEvolutionForUser(record);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(
          `[Evolution Service] Error procesando evolución para usuario ${record.nft_holder_address}:`,
          error,
        );
        results.push({
          tokenId: -1,
          previousLevel: 0,
          newLevel: 0,
          username: "unknown",
          campaignName: record.campaign.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(`[Evolution Service] Proceso completado. ${results.length} resultados.`);
    return results;
  } catch (error) {
    console.error("[Evolution Service] Error crítico en processAllEvolutions:", error);
    throw error;
  }
}

/**
 * Procesa la evolución para un usuario específico
 */
async function processEvolutionForUser(
  record: any, // gamification_scores con campaign incluido
): Promise<EvolutionResult | null> {
  const { campaign_id, nft_holder_address, tracked_cast_hash, nft_holder_fid, campaign } = record;

  // 1. Obtener el NFT del usuario
  const nftRecord = await prisma.nfts_minted.findFirst({
    where: {
      campaign_id: campaign_id,
      recipient_address: nft_holder_address,
    },
  });

  if (!nftRecord) {
    console.warn(
      `[Evolution Service] No se encontró NFT para ${nft_holder_address} en campaña ${campaign_id}. Skipping.`,
    );
    return null;
  }

  const currentLevel = nftRecord.level;

  // 2. Verificar si el nivel actual puede evolucionar
  const nextLevel = currentLevel + 1;
  const threshold = EVOLUTION_THRESHOLDS[currentLevel as keyof typeof EVOLUTION_THRESHOLDS];

  if (!threshold) {
    // Ya alcanzó el nivel máximo
    console.log(
      `[Evolution Service] Token ${nftRecord.token_id} ya está en nivel máximo (${currentLevel}). Skipping.`,
    );
    return null;
  }

  // 3. Obtener los likes actuales del cast del usuario
  const currentLikes = await neynar.getCastLikesCount(tracked_cast_hash!);

  console.log(
    `[Evolution Service] Token ${nftRecord.token_id}: Level ${currentLevel}, Likes: ${currentLikes}/${threshold}`,
  );

  // 4. Verificar si alcanzó el threshold para evolucionar
  if (currentLikes < threshold) {
    // Aún no alcanza el threshold
    return null;
  }

  // 5. ¡Debe evolucionar! Ejecutar evolución on-chain
  console.log(`[Evolution Service] 🔥 Token ${nftRecord.token_id} alcanzó threshold! Evolucionando...`);

  const evolveResult = await blockchain.evolveNFT(nftRecord.token_id);

  if (!evolveResult.success) {
    return {
      tokenId: nftRecord.token_id,
      previousLevel: currentLevel,
      newLevel: currentLevel,
      username: "unknown",
      campaignName: campaign.name,
      success: false,
      error: "Blockchain evolution failed",
    };
  }

  // 6. Actualizar el nivel en la base de datos
  await prisma.nfts_minted.update({
    where: {
      id: nftRecord.id,
    },
    data: {
      level: nextLevel,
    },
  });

  // 7. Actualizar el score en gamification (opcional, para tracking)
  await prisma.gamification_scores.update({
    where: {
      id: record.id,
    },
    data: {
      score: currentLikes,
    },
  });

  // 8. Obtener datos del usuario para el cast de celebración
  let username = "unknown";
  if (nft_holder_fid) {
    const userData = await neynar.getUserDataFromFid(nft_holder_fid);
    if (userData) {
      username = userData.username;
    }
  }

  // 9. Publicar cast de celebración
  await publishEvolutionCast(username, nftRecord.token_id, currentLevel, nextLevel, campaign.name);

  console.log(`[Evolution Service] ✅ Token ${nftRecord.token_id} evolucionó de nivel ${currentLevel} a ${nextLevel}`);

  return {
    tokenId: nftRecord.token_id,
    previousLevel: currentLevel,
    newLevel: nextLevel,
    username,
    campaignName: campaign.name,
    success: true,
  };
}

/**
 * Publica un cast celebrando la evolución de un NFT
 */
async function publishEvolutionCast(
  username: string,
  tokenId: number,
  previousLevel: number,
  newLevel: number,
  campaignName: string,
): Promise<void> {
  const castText = `🎊 ¡EVOLUCIÓN! @${username} acaba de evolucionar su NFT #${tokenId} de nivel ${previousLevel} a nivel ${newLevel} en la campaña "${campaignName}"! 🔥

¡Sigue acumulando likes para seguir evolucionando! 💪`;

  try {
    await neynar.publishCast(castText, { channelId: "socialdrop" });
    console.log(`[Evolution Service] Cast de evolución publicado para token ${tokenId}`);
  } catch (error) {
    console.error(`[Evolution Service] Error publicando cast de evolución:`, error);
    // No lanzamos el error porque la evolución ya fue exitosa
  }
}

/**
 * Procesa la evolución para una campaña específica (útil para testing o procesamiento manual)
 */
export async function processEvolutionsForCampaign(campaignId: number): Promise<EvolutionResult[]> {
  const results: EvolutionResult[] = [];

  try {
    console.log(`[Evolution Service] Procesando evoluciones para campaña ${campaignId}...`);

    const gamificationRecords = await prisma.gamification_scores.findMany({
      where: {
        campaign_id: campaignId,
        tracked_cast_hash: {
          not: null,
        },
      },
      include: {
        campaign: true,
      },
    });

    for (const record of gamificationRecords) {
      const result = await processEvolutionForUser(record);
      if (result) {
        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.error(`[Evolution Service] Error procesando evoluciones para campaña ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Obtiene el progreso de evolución de un usuario en una campaña
 */
export async function getUserEvolutionProgress(
  userAddress: string,
  campaignId: number,
): Promise<{
  currentLevel: number;
  currentLikes: number;
  nextThreshold: number | null;
  canEvolve: boolean;
} | null> {
  try {
    const nftRecord = await prisma.nfts_minted.findFirst({
      where: {
        campaign_id: campaignId,
        recipient_address: userAddress,
      },
    });

    if (!nftRecord) return null;

    const gameRecord = await prisma.gamification_scores.findFirst({
      where: {
        campaign_id: campaignId,
        nft_holder_address: userAddress,
      },
    });

    if (!gameRecord || !gameRecord.tracked_cast_hash) {
      return {
        currentLevel: nftRecord.level,
        currentLikes: 0,
        nextThreshold: EVOLUTION_THRESHOLDS[nftRecord.level as keyof typeof EVOLUTION_THRESHOLDS] || null,
        canEvolve: false,
      };
    }

    const currentLikes = await neynar.getCastLikesCount(gameRecord.tracked_cast_hash);
    const nextThreshold = EVOLUTION_THRESHOLDS[nftRecord.level as keyof typeof EVOLUTION_THRESHOLDS] || null;

    return {
      currentLevel: nftRecord.level,
      currentLikes,
      nextThreshold,
      canEvolve: nextThreshold !== null && currentLikes >= nextThreshold,
    };
  } catch (error) {
    console.error("[Evolution Service] Error obteniendo progreso de evolución:", error);
    return null;
  }
}
