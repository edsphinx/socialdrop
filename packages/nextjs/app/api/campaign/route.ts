import { NextResponse } from "next/server";
import prisma from "~~/lib/clients/prisma";

export async function POST(request: Request) {
  try {
    const { name, target_cast_hash } = await request.json();

    if (!name || !target_cast_hash) {
      return NextResponse.json({ message: "Nombre y hash del cast son requeridos." }, { status: 400 });
    }

    const newCampaign = await prisma.campaigns.create({
      data: {
        name,
        target_cast_hash,
      },
    });

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error) {
    console.error("Error al crear la campaña:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}
