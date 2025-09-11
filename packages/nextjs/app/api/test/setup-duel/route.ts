import { NextRequest, NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";
import { publishCast } from "~~/services/neynar.service";

export async function POST(request: NextRequest) {
  try {
    const { campaignName, nftImageUrl, castContent, duelist1, duelist2, secret } = await request.json();

    if (process.env.TEST_MINT_SECRET !== secret) {
      return NextResponse.json({ error: "Secreto inválido" }, { status: 401 });
    }

    if (!campaignName || !nftImageUrl || !castContent || !duelist1 || !duelist2) {
      return NextResponse.json({ error: "Faltan datos para la configuración de la demo." }, { status: 400 });
    }

    // --- PASO 1: Publicar el Cast de la Campaña para obtener el Hash ---
    const publishResult = await publishCast(castContent);
    if (!publishResult.success || !publishResult.hash) {
      throw new Error("No se pudo publicar el cast de la campaña en Farcaster.");
    }
    const campaignCastHash = publishResult.hash;

    // --- PASO 2: Crear la Campaña en la Base de Datos ---
    const newCampaign = await prisma.campaigns.create({
      data: {
        name: campaignName,
        target_cast_hash: campaignCastHash,
        nft_image_url_level_1: nftImageUrl,
        is_active: true,
        max_mints: 100, // Valor de ejemplo
      },
    });
    const campaignId = newCampaign.id;

    // --- PASO 3: Mintear el NFT y Registrar en el Duelo para ambos jugadores ---
    const setupDuelist = async (duelist: any) => {
      const { fid, address, trackedCastHash } = duelist;
      await prisma.nfts_minted.upsert({
        where: { campaign_id_recipient_address: { campaign_id: campaignId, recipient_address: address } },
        update: {},
        create: {
          campaign_id: campaignId,
          recipient_address: address,
          user_fid: fid,
          token_id: Math.floor(Math.random() * 10000),
          level: 1,
        },
      });
      await prisma.gamification_scores.upsert({
        where: { campaign_id_nft_holder_address: { campaign_id: campaignId, nft_holder_address: address } },
        update: { tracked_cast_hash: trackedCastHash },
        create: {
          campaign_id: campaignId,
          nft_holder_address: address,
          nft_holder_fid: fid,
          tracked_cast_hash: trackedCastHash,
          score: 0,
        },
      });
    };

    await setupDuelist(duelist1);
    await setupDuelist(duelist2);

    return NextResponse.json({
      success: true,
      message: "¡Escenario de la demo preparado exitosamente!",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error al preparar el duelo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
