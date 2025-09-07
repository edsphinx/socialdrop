import { NextResponse } from "next/server";
import * as blockchain from "~~/services/blockchain.service";
import * as db from "~~/services/database.service";
import * as farcasterService from "~~/services/farcaster.service";
import * as neynar from "~~/services/neynar.service";

const HOST = process.env.VERCEL_URL
  ? `https://{process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

// --- Helper para generar los Frames de respuesta ---
function createResponseFrame(
  imageUrl: string,
  buttonText: string,
  action: "link" | "post" = "post",
  targetUrl?: string,
) {
  let buttonHtml = `<meta property="fc:frame:button:1" content="${buttonText}" />`;
  if (action === "link" && targetUrl) {
    buttonHtml += `<meta property="fc:frame:button:1:action" content="link" />`;
    buttonHtml += `<meta property="fc:frame:button:1:target" content="${targetUrl}" />`;
  }

  return `
        <!DOCTYPE html><html><head>
            <title>SocialDrop Result</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${imageUrl}" />
            ${buttonHtml}
        </head></html>
    `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Aquí puedes usar la validación directa con la API de Neynar que ya teníamos
    // Por simplicidad en este ejemplo, extraemos el FID directamente
    const userFid = body?.untrustedData?.fid;

    if (!userFid) {
      return new NextResponse("Mensaje de Frame inválido.", { status: 400 });
    }

    const campaignId = 1; // Placeholder
    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) {
      const errorImageUrl = `${HOST}/api/frame/error-image?message=Campaña no encontrada`;
      return new Response(createResponseFrame(errorImageUrl, "Reintentar"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const userData = await neynar.getUserDataFromFid(userFid);
    if (!userData) {
      const errorImageUrl = `${HOST}/api/frame/error-image?message=Usuario de Farcaster no encontrado`;
      return new Response(createResponseFrame(errorImageUrl, "Reintentar"), {
        headers: { "Content-Type": "text/html" },
      });
    }
    const { address: recipientAddress, username } = userData;

    // --- Verificaciones de Elegibilidad ---
    if (await db.hasUserMinted(campaign.id, recipientAddress)) {
      const imageUrl = `${HOST}/api/frame/error-image?message=Ya has reclamado este NFT.`;
      return new Response(createResponseFrame(imageUrl, "Ver mi NFT"), { headers: { "Content-Type": "text/html" } });
    }

    const hasLiked = await neynar.didUserLikeCast(userFid, campaign.target_cast_hash);
    if (!hasLiked) {
      const imageUrl = `${HOST}/api/frame/error-image?message=Debes dar 'like' al cast original.`;
      return new Response(createResponseFrame(imageUrl, "Reintentar"), { headers: { "Content-Type": "text/html" } });
    }

    // --- Lógica de Minting ---
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      throw new Error("La transacción de mint falló.");
    }

    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress);

    const castText = `🎉 ¡Éxito! @${username} acaba de reclamar el NFT #${mintResult.tokenId} del drop "${campaign.name}"!`;
    await farcasterService.publishCast(castText);

    // --- Respuesta de Éxito ---
    const successImageUrl = `${HOST}/api/frame/success-image?tokenId=${mintResult.tokenId}`;
    const txUrl = `https://sepolia.basescan.org/tx/${mintResult.hash}`;
    return new Response(createResponseFrame(successImageUrl, "Ver transacción", "link", txUrl), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Error en el endpoint de claim:", error);
    const errorImageUrl = `${HOST}/api/frame/error-image?message=Error interno del servidor`;
    return new Response(createResponseFrame(errorImageUrl, "Reintentar"), { headers: { "Content-Type": "text/html" } });
  }
}
