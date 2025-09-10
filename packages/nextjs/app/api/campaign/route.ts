import { NextRequest, NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";
import { publishCast } from "~~/services/neynar.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, castContent, nftCount, creatorFid, nftImageUrl } = body;

    if (!name || !castContent || !nftCount || !creatorFid || !nftImageUrl) {
      return NextResponse.json({ message: "Todos los campos son requeridos." }, { status: 400 });
    }

    // Publicar el cast en Farcaster y capturar el hash
    const publishResult = await publishCast(castContent);
    if (!publishResult.success || !publishResult.hash) {
      throw new Error("No se pudo publicar el cast en Farcaster.");
    }
    const castHash = publishResult.hash;
    console.log(`[Campaign API] Cast publicado con éxito. Hash: ${castHash}`);

    // Guardar la campaña en la base de datos con el hash obtenido
    const newCampaign = await prisma.campaigns.create({
      data: {
        name: name,
        target_cast_hash: castHash,
        max_mints: nftCount,
        creator_fid: creatorFid,
        is_active: true, // La campaña nace activa
        nft_image_url_level_1: nftImageUrl,
      },
    });

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    console.error("Error en /api/campaign:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
