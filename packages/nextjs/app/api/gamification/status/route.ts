import { NextRequest, NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";
import { getLevelOf } from "~~/services/blockchain.service";
import { getCastLikesCount, getUserDataFromFid } from "~~/services/neynar.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = Number(searchParams.get("fid"));
  const campaignId = Number(searchParams.get("campaignId"));

  if (!fid || !campaignId) {
    return NextResponse.json({ error: "FID y CampaignId son requeridos" }, { status: 400 });
  }

  try {
    const userData = await getUserDataFromFid(fid);
    if (!userData?.address) {
      return NextResponse.json({ error: "No se pudo encontrar la wallet del usuario." }, { status: 404 });
    }
    const userAddress = userData.address;

    // 1. Encontrar el NFT del usuario para esta campaña
    const userMint = await prisma.nfts_minted.findFirst({
      where: { recipient_address: userAddress, campaign_id: campaignId },
    });
    if (!userMint)
      return NextResponse.json({ error: "NFT no encontrado para este usuario y campaña" }, { status: 404 });

    // 2. Encontrar su registro en la gamificación
    const gameScore = await prisma.gamification_scores.findFirst({
      where: { nft_holder_address: userAddress, campaign_id: campaignId },
    });
    if (!gameScore || !gameScore.tracked_cast_hash) {
      return NextResponse.json({ error: "Usuario no registrado en la gamificación." }, { status: 404 });
    }

    // 3. Obtener el puntaje (likes) en tiempo real
    const score = await getCastLikesCount(gameScore.tracked_cast_hash);
    const level = await getLevelOf(userMint.token_id);

    // 4. Obtener los metadatos del nivel actual del NFT
    const host = process.env.VERCEL_URL ? `https://{process.env.VERCEL_URL}` : "http://localhost:3000";
    const metadataResponse = await fetch(`${host}/api/metadata/${level}`);
    const metadata = await metadataResponse.json();

    return NextResponse.json({
      tokenId: userMint.token_id,
      name: metadata.name,
      imageUrl: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
      score: score,
      level: level,
    });
  } catch (error) {
    console.error("Error en /api/gamification/status:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
