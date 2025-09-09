import { NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";

export async function GET() {
  try {
    const campaigns = await prisma.campaigns.findMany({
      // Ordenamos por la más reciente primero
      orderBy: {
        created_at: "desc",
      },
      // Opcional: Incluir el conteo de mints para cada campaña
      include: {
        _count: {
          select: { nfts_minted: true },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error al obtener las campañas:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
