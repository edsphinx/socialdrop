import prisma from "~~/lib/clients/prisma";
import * as neynar from "./neynar.service";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  fid: number;
  address: string;
  score: number;
  tokenId: number;
  level: number;
  imageUrl: string;
  profilePicture?: string;
}

export interface LeaderboardResponse {
  campaignId: number;
  campaignName: string;
  totalParticipants: number;
  leaderboard: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Obtiene el leaderboard de una campaña con datos enriquecidos
 *
 * @param campaignId - ID de la campaña
 * @param page - Página actual (empieza en 1)
 * @param limit - Cantidad de resultados por página
 * @returns Leaderboard completo con paginación
 */
export async function getLeaderboard(campaignId: number, page: number = 1, limit: number = 10): Promise<LeaderboardResponse | null> {
  try {
    // Validar parámetros
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Máximo 100 por página

    const offset = (page - 1) * limit;

    console.log(`[Leaderboard Service] Obteniendo leaderboard para campaña ${campaignId}, página ${page}`);

    // 1. Obtener información de la campaña
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      console.warn(`[Leaderboard Service] Campaña ${campaignId} no encontrada`);
      return null;
    }

    // 2. Obtener total de participantes
    const totalParticipants = await prisma.gamification_scores.count({
      where: { campaign_id: campaignId },
    });

    // 3. Obtener scores ordenados con paginación
    const gameScores = await prisma.gamification_scores.findMany({
      where: { campaign_id: campaignId },
      orderBy: { score: "desc" },
      skip: offset,
      take: limit,
    });

    // 4. Enriquecer cada entry con datos de NFT y usuario
    const leaderboardEntries = await Promise.all(
      gameScores.map(async (score, index) => {
        const rank = offset + index + 1;

        // Obtener NFT del usuario
        const nft = await prisma.nfts_minted.findFirst({
          where: {
            campaign_id: campaignId,
            recipient_address: score.nft_holder_address,
          },
        });

        // Datos por defecto
        let username = "anonymous";
        let profilePicture = undefined;
        const fid = score.nft_holder_fid || 0;

        // Obtener datos del usuario de Farcaster si tenemos FID
        if (score.nft_holder_fid) {
          try {
            const userData = await neynar.getUserDataFromFid(score.nft_holder_fid);
            if (userData) {
              username = userData.username;
              // Si Neynar devuelve más datos (como pfp), los extraemos aquí
              // profilePicture = userData.pfp_url; // Dependiendo de tu cliente Neynar
            }
          } catch (error) {
            console.warn(`[Leaderboard Service] Error obteniendo datos de usuario ${score.nft_holder_fid}:`, error);
          }
        }

        // Construir URL de la imagen del NFT
        const imageUrl = await getNFTImageUrl(nft?.level || 1, campaign);

        return {
          rank,
          username,
          fid,
          address: score.nft_holder_address,
          score: score.score,
          tokenId: nft?.token_id || 0,
          level: nft?.level || 1,
          imageUrl,
          profilePicture,
        };
      }),
    );

    // 5. Construir respuesta
    return {
      campaignId,
      campaignName: campaign.name,
      totalParticipants,
      leaderboard: leaderboardEntries,
      pagination: {
        page,
        limit,
        total: totalParticipants,
        hasMore: offset + limit < totalParticipants,
      },
    };
  } catch (error) {
    console.error(`[Leaderboard Service] Error obteniendo leaderboard para campaña ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Obtiene la posición de un usuario en el leaderboard
 */
export async function getUserRank(campaignId: number, userAddress: string): Promise<{
  rank: number;
  score: number;
  totalParticipants: number;
} | null> {
  try {
    // Obtener el score del usuario
    const userScore = await prisma.gamification_scores.findFirst({
      where: {
        campaign_id: campaignId,
        nft_holder_address: userAddress,
      },
    });

    if (!userScore) {
      return null;
    }

    // Contar cuántos usuarios tienen un score mayor
    const betterScores = await prisma.gamification_scores.count({
      where: {
        campaign_id: campaignId,
        score: {
          gt: userScore.score,
        },
      },
    });

    // El rank es la cantidad de usuarios con mejor score + 1
    const rank = betterScores + 1;

    // Total de participantes
    const totalParticipants = await prisma.gamification_scores.count({
      where: { campaign_id: campaignId },
    });

    return {
      rank,
      score: userScore.score,
      totalParticipants,
    };
  } catch (error) {
    console.error(`[Leaderboard Service] Error obteniendo rank de usuario:`, error);
    return null;
  }
}

/**
 * Obtiene el top N del leaderboard (útil para mostrar en dashboards)
 */
export async function getTopPerformers(campaignId: number, limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const result = await getLeaderboard(campaignId, 1, limit);
    return result?.leaderboard || [];
  } catch (error) {
    console.error(`[Leaderboard Service] Error obteniendo top performers:`, error);
    return [];
  }
}

/**
 * Actualiza el score de un usuario (llamado por el sistema de tracking)
 */
export async function updateUserScore(campaignId: number, userAddress: string, newScore: number): Promise<void> {
  try {
    await prisma.gamification_scores.updateMany({
      where: {
        campaign_id: campaignId,
        nft_holder_address: userAddress,
      },
      data: {
        score: newScore,
      },
    });

    console.log(`[Leaderboard Service] Score actualizado para ${userAddress}: ${newScore}`);
  } catch (error) {
    console.error(`[Leaderboard Service] Error actualizando score:`, error);
    throw error;
  }
}

/**
 * Helper: Obtiene la URL de la imagen del NFT basándose en el nivel
 */
async function getNFTImageUrl(level: number, campaign: any): Promise<string> {
  // Usar las URLs configuradas en la campaña
  switch (level) {
    case 1:
      return campaign.nft_image_url_level_1 || "";
    case 2:
      return campaign.nft_image_url_level_2 || campaign.nft_image_url_level_1 || "";
    case 3:
      return campaign.nft_image_url_level_3 || campaign.nft_image_url_level_2 || "";
    default:
      // Para niveles superiores, usar la última disponible
      return campaign.nft_image_url_level_3 || campaign.nft_image_url_level_2 || campaign.nft_image_url_level_1 || "";
  }
}
