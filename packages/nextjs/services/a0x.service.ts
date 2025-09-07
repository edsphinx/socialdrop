import { campaigns } from "@prisma/client";
import { a0xClient } from "~~/lib/clients/a0x";

// Importamos el tipo desde Prisma

const AGENT_ID = process.env.A0X_AGENT_ID!; // Tu ID de agente de A0X

export async function announceCampaignStart(campaign: campaigns, frameUrl: string) {
  console.log(frameUrl);
  const text = `🚀 ¡Nueva campaña de Airdrop Mágico lanzada! ✨

"${campaign.name}" está en vivo.

Interactúa con el Frame para ver el progreso y cómo participar. ¡Los NFTs se entregan automáticamente! #SocialDrop #Base #Farcaster`;

  // A0X publicará el cast principal que contiene el Frame
  return await a0xClient.publishCast(AGENT_ID, text);
  // NOTA: La API de A0X debería soportar adjuntar Frames, esto es una simplificación.
}

export async function announceNewWinner(winnerUsername: string, campaignName: string) {
  const text = `🔥 ¡Boom! @${winnerUsername} acaba de recibir un NFT de la campaña "${campaignName}"! 

La magia está ocurriendo en tiempo real. ¿Quién será el siguiente? 👀`;

  // A0X publicará un cast para generar FOMO
  return await a0xClient.publishCast(AGENT_ID, text, { channelId: "socialdrop" });
}

export async function announceCampaignEnd(campaignName: string) {
  const text = `🎉 ¡La campaña "${campaignName}" ha finalizado! 🎉

Todos los ${100} NFTs han encontrado a sus dueños. ¡Felicidades a todos los ganadores y gracias por participar! Estén atentos para el próximo SocialDrop.`;

  return await a0xClient.publishCast(AGENT_ID, text);
}
