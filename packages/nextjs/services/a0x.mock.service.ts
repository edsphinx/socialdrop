import * as farcasterService from "./farcaster.service";
import { campaigns } from "@prisma/client";

// --- VERSIÓN MOCK (SIMULADA) DEL SERVICIO A0X ---
// Úsala mientras consigues tus claves de API para no detener el desarrollo.

const MOCK_AGENT_ID = "mock-agent-123";

async function mockPublish(text: string) {
  console.log("--- MOCK A0X ---");
  console.log(`Llamada para publicar el siguiente cast con el agente ${MOCK_AGENT_ID}:`);
  console.log(text);
  console.log("------------------");
  // Simulamos una respuesta exitosa
  return Promise.resolve({ success: true, hash: `0x_mock_hash_${Math.random()}` });
}

export async function announceCampaignStart(campaign: campaigns, frameUrl: string) {
  const text = `🚀 ¡Nueva campaña de Airdrop Mágico lanzada! ✨

"${campaign.name}" está en vivo.

Interactúa con el Frame para ver el progreso y cómo participar. ¡Los NFTs se entregan automáticamente! #SocialDrop #Base #Farcaster`;

  // Usamos el servicio de Farcaster para publicar, adjuntando el Frame
  return await farcasterService.publishCast(text, {
    embeds: [{ url: frameUrl }],
  });
}

export async function announceNewWinner(winnerUsername: string, campaignName: string) {
  const text = `🔥 ¡Boom! @${winnerUsername} acaba de recibir un NFT de la campaña "${campaignName}"! 

La magia está ocurriendo en tiempo real. ¿Quién será el siguiente? 👀`;

  return await farcasterService.publishCast(text, { channelId: "socialdrop" });
}

export async function announceCampaignEnd(campaignName: string) {
  const text = `🎉 ¡La campaña "${campaignName}" ha finalizado! 🎉

Todos los NFTs han encontrado a sus dueños. ¡Felicidades a todos los ganadores!`;

  return await mockPublish(text);
}
