import prisma from "~~/lib/clients/prisma";
import * as neynar from "./neynar.service";

export interface CampaignStats {
  campaignId: number;
  campaignName: string;
  totalMints: number;
  totalParticipants: number;
  topPerformers: Array<{
    username: string;
    fid: number;
    score: number;
    tokenId: number;
    level: number;
  }>;
  averageLevel: number;
}

/**
 * Completa una campaña cuando alcanza su límite de mints
 * @param campaignId El ID de la campaña a completar
 * @returns Las estadísticas finales de la campaña
 */
export async function completeCampaign(campaignId: number): Promise<CampaignStats> {
  try {
    console.log(`[Campaign Completion] Finalizando campaña ${campaignId}...`);

    // 1. Obtener datos de la campaña
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // 2. Marcar campaña como inactiva
    await prisma.campaigns.update({
      where: { id: campaignId },
      data: { is_active: false },
    });

    // 3. Recopilar estadísticas
    const stats = await generateCampaignStats(campaignId, campaign.name);

    // 4. Publicar cast de anuncio
    await publishCompletionCast(stats);

    // 5. Notificar a top performers (opcional)
    await notifyTopPerformers(stats.topPerformers, campaign.name);

    console.log(`[Campaign Completion] ✅ Campaña "${campaign.name}" finalizada exitosamente`);

    return stats;
  } catch (error) {
    console.error(`[Campaign Completion] Error completando campaña ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Genera estadísticas completas de una campaña
 */
async function generateCampaignStats(campaignId: number, campaignName: string): Promise<CampaignStats> {
  // 1. Total de mints
  const totalMints = await prisma.nfts_minted.count({
    where: { campaign_id: campaignId },
  });

  // 2. Obtener todos los NFTs con su información
  const allNFTs = await prisma.nfts_minted.findMany({
    where: { campaign_id: campaignId },
  });

  // 3. Calcular nivel promedio
  const averageLevel = allNFTs.length > 0 ? allNFTs.reduce((sum, nft) => sum + nft.level, 0) / allNFTs.length : 1;

  // 4. Obtener top performers del leaderboard
  const topGameScores = await prisma.gamification_scores.findMany({
    where: { campaign_id: campaignId },
    orderBy: { score: "desc" },
    take: 10,
  });

  // 5. Enriquecer top performers con datos de NFT
  const topPerformers = await Promise.all(
    topGameScores.map(async score => {
      const nft = allNFTs.find(n => n.recipient_address === score.nft_holder_address);
      let username = "unknown";

      if (score.nft_holder_fid) {
        const userData = await neynar.getUserDataFromFid(score.nft_holder_fid);
        if (userData) {
          username = userData.username;
        }
      }

      return {
        username,
        fid: score.nft_holder_fid || 0,
        score: score.score,
        tokenId: nft?.token_id || 0,
        level: nft?.level || 1,
      };
    }),
  );

  return {
    campaignId,
    campaignName,
    totalMints,
    totalParticipants: topGameScores.length,
    topPerformers,
    averageLevel: Math.round(averageLevel * 10) / 10, // Redondear a 1 decimal
  };
}

/**
 * Publica un cast anunciando la finalización de la campaña
 */
async function publishCompletionCast(stats: CampaignStats): Promise<void> {
  const { campaignName, totalMints, topPerformers } = stats;

  // Obtener top 3 para mencionar
  const top3 = topPerformers.slice(0, 3);
  const top3Text =
    top3.length > 0
      ? `

🏆 Top 3 Influencers:
${top3.map((p, i) => `${i + 1}. @${p.username} - ${p.score} likes (Level ${p.level})`).join("\n")}`
      : "";

  const castText = `🎉 ¡CAMPAÑA FINALIZADA! 🎉

"${campaignName}" acaba de completarse con éxito!

📊 Estadísticas Finales:
• ${totalMints} NFTs distribuidos
• ${stats.totalParticipants} guerreros de influencia
• Nivel promedio: ${stats.averageLevel}${top3Text}

¡Gracias a todos los participantes! Estén atentos para el próximo SocialDrop 💧`;

  try {
    await neynar.publishCast(castText, { channelId: "socialdrop" });
    console.log(`[Campaign Completion] Cast de finalización publicado para "${campaignName}"`);
  } catch (error) {
    console.error("[Campaign Completion] Error publicando cast de finalización:", error);
    // No lanzamos el error porque la campaña ya se marcó como completa
  }
}

/**
 * Notifica a los top performers de su posición final
 */
async function notifyTopPerformers(
  topPerformers: CampaignStats["topPerformers"],
  campaignName: string,
): Promise<void> {
  // Solo notificar al top 3
  const top3 = topPerformers.slice(0, 3);

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < top3.length; i++) {
    const performer = top3[i];
    const position = i + 1;

    const notificationText = `${medals[i]} ¡Felicidades @${performer.username}!

Terminaste en el puesto #${position} de la campaña "${campaignName}"!

📈 Tu desempeño:
• ${performer.score} likes totales
• NFT Level ${performer.level}
• Token ID: #${performer.tokenId}

¡Eres un verdadero influencer de SocialDrop! 🔥`;

    try {
      await neynar.publishCast(notificationText, { channelId: "socialdrop" });
      console.log(`[Campaign Completion] Notificación enviada a @${performer.username} (posición ${position})`);

      // Pequeño delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Campaign Completion] Error notificando a @${performer.username}:`, error);
      // Continuamos con el siguiente
    }
  }
}

/**
 * Verifica si una campaña debería ser completada
 * @returns true si la campaña alcanzó su límite y debe ser completada
 */
export async function shouldCompleteCampaign(campaignId: number): Promise<boolean> {
  try {
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.is_active) {
      return false;
    }

    const mintCount = await prisma.nfts_minted.count({
      where: { campaign_id: campaignId },
    });

    return mintCount >= campaign.max_mints;
  } catch (error) {
    console.error(`[Campaign Completion] Error verificando si debe completar campaña ${campaignId}:`, error);
    return false;
  }
}
