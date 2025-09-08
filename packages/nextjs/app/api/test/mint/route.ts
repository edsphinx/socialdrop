import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import * as blockchain from "~~/services/blockchain.service";

// Un secreto simple para proteger este endpoint y evitar que cualquiera me lo use o lo exploten.
const TEST_MINT_SECRET = process.env.TEST_MINT_SECRET;
if (!TEST_MINT_SECRET) {
  console.warn("ADVERTENCIA: TEST_MINT_SECRET no está configurado. El endpoint de mint de prueba es inseguro.");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientAddress, secret } = body;

    // --- Medida de Seguridad Simple ---
    if (secret !== TEST_MINT_SECRET) {
      return NextResponse.json({ success: false, message: "Secreto inválido." }, { status: 401 }); // 401 Unauthorized
    }

    if (!recipientAddress || !isAddress(recipientAddress)) {
      return NextResponse.json(
        { success: false, message: "Se necesita una dirección de destinatario válida." },
        { status: 400 },
      );
    }

    console.log(`[Test Mint] Iniciando mint de prueba para: ${recipientAddress}`);

    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);

    if (!mintResult.success) {
      throw new Error(`La transacción de mint de prueba falló. Hash: ${mintResult.hash}`);
    }

    console.log(`[Test Mint] ¡Éxito! NFT ${mintResult.tokenId} minteado para ${recipientAddress}`);

    return NextResponse.json({
      success: true,
      message: "NFT de prueba minteado exitosamente.",
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.hash,
    });
  } catch (error: any) {
    console.error("[Test Mint] Error en el endpoint de mint de prueba:", error);
    return NextResponse.json({ success: false, message: "Error interno del servidor." }, { status: 500 });
  }
}
