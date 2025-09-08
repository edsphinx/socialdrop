import { NextResponse } from "next/server";
import * as blockchain from "~~/services/blockchain.service";
import * as db from "~~/services/database.service";
import * as neynar from "~~/services/neynar.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return new NextResponse("Mensaje de Frame inválido.", { status: 400 });
    }

    const { userFid, campaignId } = body;

    if (!userFid) {
      return new NextResponse("Mensaje de Frame inválido.", { status: 400 });
    }

    // --- LÓGICA DE VALIDACIÓN
    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ success: false, message: "Campaña no encontrada." }, { status: 404 });

    const userData = await neynar.getUserDataFromFid(userFid);
    if (!userData)
      return NextResponse.json({ success: false, message: "Usuario de Farcaster no encontrado." }, { status: 404 });
    const { address: recipientAddress, username } = userData;

    // --- Verificaciones de Elegibilidad ---
    if (await db.hasUserMinted(campaign.id, recipientAddress)) {
      return NextResponse.json({ success: false, message: "Ya has reclamado este NFT." }, { status: 409 }); // 409 Conflict
    }

    const hasLiked = await neynar.didUserLikeCast(userFid, campaign.target_cast_hash);
    if (!hasLiked) {
      return NextResponse.json(
        { success: false, message: "Debes dar 'like' al cast original para reclamar." },
        { status: 403 },
      ); // 403 Forbidden
    }

    // --- Lógica de Minting ---
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      throw new Error("La transacción de mint falló.");
    }

    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress);

    const castText = `🎉 ¡Éxito! @${username} acaba de reclamar el NFT #${mintResult.tokenId} del drop "${campaign.name}"!`;
    await neynar.publishCast(castText);

    // --- Respuesta de Éxito ---
    return NextResponse.json({
      success: true,
      message: "¡NFT reclamado exitosamente!",
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.hash,
    });
  } catch (error: any) {
    console.error("Error en el endpoint de claim:", error);
    return NextResponse.json({ success: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
