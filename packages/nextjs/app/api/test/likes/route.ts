import { NextRequest, NextResponse } from "next/server";
import { getCastLikesCount } from "~~/services/neynar.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const castHash = searchParams.get("hash");

  if (!castHash) {
    return NextResponse.json({ error: "El parámetro 'hash' es requerido." }, { status: 400 });
  }

  try {
    const likesCount = await getCastLikesCount(castHash);

    return NextResponse.json({
      castHash: castHash,
      likes: likesCount,
    });
  } catch (error) {
    console.error("Error en la API de prueba de likes:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
