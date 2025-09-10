// packages/nextjs/app/api/my-claims/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";
import { hasUserMinted } from "~~/services/database.service";
import { didUserLikeCast, getUserDataFromFid } from "~~/services/neynar.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = Number(searchParams.get("fid"));

  if (!fid) {
    return NextResponse.json({ error: "FID es requerido" }, { status: 400 });
  }

  try {
    const allCampaigns = await prisma.campaigns.findMany({ where: { is_active: true } });
    const userData = await getUserDataFromFid(fid);

    // Si no podemos obtener la dirección de wallet, no podemos verificar si ya ha minteado.
    if (!userData?.address) {
      return NextResponse.json({ eligibleCampaigns: [] });
    }

    const eligibleCampaigns = [];

    // Iteramos sobre cada campaña para verificar la elegibilidad
    for (const campaign of allCampaigns) {
      const hasLiked = await didUserLikeCast(fid, campaign.target_cast_hash);
      if (hasLiked) {
        const alreadyMinted = await hasUserMinted(campaign.id, userData.address);
        if (!alreadyMinted) {
          eligibleCampaigns.push(campaign);
        }
      }
    }

    return NextResponse.json({ eligibleCampaigns });
  } catch (error) {
    console.error("Error al obtener los reclamos del usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
