// app/api/frame/route.ts
import { NextRequest, NextResponse } from "next/server";

const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

// This function handles the initial load of the Frame.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = Number(searchParams.get("campaignId"));

    if (!campaignId) {
      return new NextResponse("Campaign ID is required", { status: 400 });
    }

    // We generate the initial image showing the campaign's progress.
    const imageUrl = `${HOST}/api/frame/image?campaignId=${campaignId}&t=${Date.now()}`;

    const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="fc:frame:button:1" content="Actualizar Progreso" />
                    <meta property="fc:frame:button:2" content="¿Cómo participo?" />
                    <meta property="fc:frame:button:3" content="🎁 Verificar y Reclamar NFT" />
                    <meta property="fc:frame:post_url" content="${HOST}/api/claim" />
                </head>
            </html>
        `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    console.error("Error en GET de Frame:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}

// This function handles button clicks on the Frame.
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = Number(searchParams.get("campaignId"));

    if (!campaignId) {
      return new NextResponse("Campaign ID is required", { status: 400 });
    }

    const data = await request.json();
    const buttonIndex = data.untrustedData.buttonIndex;

    let imageUrl = "";

    // Determine which image to show based on the button clicked
    if (buttonIndex === 1) {
      // Button 1: Show the progress image. We add a timestamp to prevent Farcaster from caching the image.
      imageUrl = `${HOST}/api/frame/image?campaignId=${campaignId}&t=${Date.now()}`;
    } else if (buttonIndex === 2) {
      // Button 2: Show the instructions image.
      imageUrl = `${HOST}/api/frame/instructions-image`;
    } else {
      // Default or fallback case
      imageUrl = `${HOST}/api/frame/image?campaignId=${campaignId}&t=${Date.now()}`;
    }

    const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta property="fc:frame" content="vNext" />
                    <meta property="fc:frame:image" content="${imageUrl}" />
                    <meta property="fc:frame:button:1" content="Actualizar Progreso" />
                    <meta property="fc:frame:button:2" content="¿Cómo participo?" />
                    <meta property="fc:frame:post_url" content="${HOST}/api/frame?campaignId=${campaignId}" />
                </head>
            </html>
        `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    console.error("Error en POST de Frame:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
