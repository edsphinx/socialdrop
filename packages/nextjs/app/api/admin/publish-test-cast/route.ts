import { NextResponse } from "next/server";
import * as farcasterService from "~~/services/farcaster.service";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ message: "El texto es requerido." }, { status: 400 });
    }

    const result = await farcasterService.publishCast(text);

    if (!result.success) {
      throw new Error("Falló la publicación del cast.");
    }

    return NextResponse.json({ message: "Cast de prueba publicado!", hash: result.hash }, { status: 200 });
  } catch (error: any) {
    console.error("Error en el endpoint de prueba:", error);
    return NextResponse.json({ message: "Error interno.", error: error.message }, { status: 500 });
  }
}
