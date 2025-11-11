import { NextResponse } from "next/server";
import { validateAndParseNeynarWebhook, validateWebhookDataStructure } from "~~/lib/webhook-validator";
import * as blockchain from "~~/services/blockchain.service";
import * as campaignCompletion from "~~/services/campaign-completion.service";
import * as db from "~~/services/database.service";
import * as neynar from "~~/services/neynar.service";

export async function POST(request: Request) {
  try {
    // 1. Validar firma del webhook y parsear el body
    const webhookData = await validateAndParseNeynarWebhook(request);

    if (!webhookData) {
      console.warn("[Webhook] Invalid webhook signature or parsing failed");
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
    }

    // 2. Validar estructura del webhook data
    if (!validateWebhookDataStructure(webhookData)) {
      console.warn("[Webhook] Invalid webhook data structure");
      return NextResponse.json({ message: "Datos de webhook inválidos." }, { status: 400 });
    }

    // 3. Extraer datos validados
    const userFid = webhookData.data.fid;
    const castHash = webhookData.data.cast.hash;

    console.log(`Controlador: Procesando like del FID ${userFid} al cast ${castHash}`);

    const campaign = await db.findCampaignByCastHash(castHash);
    if (!campaign) {
      console.log(`Controlador: No se encontró campaña para el cast ${castHash}. Ignorando.`);
      return NextResponse.json({ message: "Campaña no encontrada." }, { status: 200 });
    }

    const userData = await neynar.getUserDataFromFid(userFid);
    if (!userData) {
      console.log(`Controlador: No se pudieron obtener datos (wallet/user) para el FID ${userFid}.`);
      return NextResponse.json(
        { message: "No se pudieron obtener los datos del usuario desde Neynar." },
        { status: 200 },
      );
    }

    const { address: recipientAddress, username } = userData;

    if (await db.hasUserMinted(campaign.id, recipientAddress)) {
      console.log(`Controlador: El usuario ${username} (${recipientAddress}) ya ha minteado en esta campaña.`);
      return NextResponse.json({ message: "Usuario ya ha minteado." }, { status: 200 });
    }

    const mintCount = await db.getMintCount(campaign.id);
    if (mintCount >= campaign.max_mints) {
      console.log(`Controlador: La campaña "${campaign.name}" ha alcanzado su límite de mints.`);

      // Finalizar la campaña y publicar anuncio
      try {
        await campaignCompletion.completeCampaign(campaign.id);
      } catch (error) {
        console.error("Error completando la campaña:", error);
        // Continuamos aunque falle el anuncio
      }

      return NextResponse.json({ message: "La campaña ha finalizado." }, { status: 200 });
    }

    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      throw new Error("La transacción de mint falló.");
    }

    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress);
    console.log(
      `¡Éxito! NFT ${mintResult.tokenId} minteado para ${username} (${recipientAddress}) en tx ${mintResult.hash}`,
    );

    // Construimos el texto y llamamos al servicio para publicarlo
    const castText = `🔥 ¡Boom! @${username} acaba de recibir un NFT de la campaña "${campaign.name}"! La magia está ocurriendo en tiempo real. ¿Quién será el siguiente? 👀`;
    await neynar.publishCast(castText, { channelId: "socialdrop" });

    return NextResponse.json(
      { message: `NFT minteado y cast de anuncio publicado para @${username}!` },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error en el controlador del webhook:", error);
    return NextResponse.json({ message: "Error interno del servidor.", error: error.message }, { status: 500 });
  }
}
