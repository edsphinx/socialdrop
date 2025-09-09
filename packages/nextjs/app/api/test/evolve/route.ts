import { NextRequest, NextResponse } from "next/server";
import * as blockchain from "~~/services/blockchain.service";

const TEST_MINT_SECRET = process.env.TEST_MINT_SECRET;

export async function POST(request: NextRequest) {
  const { tokenId, secret } = await request.json();
  if (secret !== TEST_MINT_SECRET) {
    return NextResponse.json({ message: "Secreto inválido." }, { status: 401 });
  }
  if (typeof tokenId !== "number") {
    return NextResponse.json({ message: "tokenId es requerido." }, { status: 400 });
  }

  const result = await blockchain.evolveNFT(tokenId);
  return NextResponse.json(result);
}
