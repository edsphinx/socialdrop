import { NextResponse } from "next/server";

export async function POST() {
  const successImageUrl = "https://socialdrop.live/og-image.png";

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${successImageUrl}" />
        <meta property="fc:frame:button:1" content="¡Éxito! Visita el sitio" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://socialdrop.live" />
      </head>
    </html>
  `);
}
