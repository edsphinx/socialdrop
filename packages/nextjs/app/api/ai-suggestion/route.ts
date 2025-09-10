// packages/nextjs/app/api/ai-suggestion/route.ts
import { NextRequest, NextResponse } from "next/server";

// Una lista de respuestas de IA realistas que podemos usar
const AI_SUGGESTIONS = [
  "¡Claro! Consejo 1: Haz una pregunta abierta como '¿Están listos?' para incentivar comentarios. Consejo 2: Menciona un canal relevante como /base para aumentar la visibilidad. Consejo 3: Crea urgencia con frases como 'Solo los primeros 100...'",
  "Buena idea. Para hacerlo más viral, intenta esto: 1. Etiqueta a 2 influencers del ecosistema de Base y pídeles su opinión. 2. Ofrece un bonus sorpresa para el comentario con más 'me gusta'. 3. Usa un emoji llamativo al principio del cast.",
  "Para maximizar el impacto de tu campaña: 1. Publica en el horario de mayor actividad de Farcaster (tarde/noche en América). 2. Haz que la imagen del NFT sea intrigante y de alta calidad. 3. Promete revelar un 'secreto' o beneficio adicional a los que reclamen el NFT.",
];

export async function POST(request: NextRequest) {
  try {
    // Leemos los datos del frontend, aunque no los usaremos para la respuesta
    const { castContent, campaignName } = await request.json();
    console.log(`[Simulación IA] Recibida petición para la campaña: ${campaignName}`);
    console.log(`[Simulación IA] contenido del cast: ${castContent}`);

    // Simulamos una espera de 2 a 4 segundos para que parezca real
    const delay = Math.random() * 2000 + 2000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Elegimos una de las respuestas pre-escritas al azar
    const suggestion = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)];

    return NextResponse.json({ suggestion: suggestion });
  } catch (error) {
    console.error("Error en la API de IA simulada:", error);
    return NextResponse.json({ error: "No se pudo comunicar con el agente de IA." }, { status: 500 });
  }
}
// import { NextRequest, NextResponse } from "next/server";
// import { Client, SortDirection } from "@xmtp/xmtp-js";
// import { Wallet } from "ethers";

// // La dirección del agente de IA con el que quieres hablar
// const AI_AGENT_ADDRESS = "0x6BC87dEBD23472bcCD12A8F3Ea489341fd5DE532"; // Asegúrate que esta sea la dirección correcta del agente

// export async function POST(request: NextRequest) {
//   // 1. Validar que la clave privada del servidor está configurada
//   if (!process.env.XMTP_PRIVATE_KEY) {
//     console.error("La variable de entorno XMTP_PRIVATE_KEY no está configurada.");
//     return NextResponse.json({ error: "Configuración del servidor incompleta." }, { status: 500 });
//   }

//   try {
//     const { castContent, campaignName } = await request.json();

//     // 2. Usar una wallet persistente para el backend (NO aleatoria)
//     // Esto asegura que tu backend tenga una identidad fija en la red XMTP.
//     const signer = new Wallet(process.env.XMTP_PRIVATE_KEY);

//     // 3. Inicializar el cliente de XMTP
//     const xmtp = await Client.create(signer, { env: "production" });

//     // 4. Iniciar o encontrar la conversación con el agente de IA
//     const conversation = await xmtp.conversations.newConversation(AI_AGENT_ADDRESS);

//     // 5. Construir un prompt claro para el agente
//     const prompt = `Actúa como un experto en marketing viral para Farcaster.
//       Estoy creando una campaña llamada "${campaignName}".
//       El texto de mi anuncio es: "${castContent}".
//       Dame 3 consejos concisos y accionables para que este cast sea más atractivo y genere más interacción en la comunidad de Base.`;

//     await conversation.send(prompt);

//     // 6. Esperar un tiempo prudencial por la respuesta
//     // NOTA: En producción, un sistema de webhooks o polling más avanzado sería ideal.
//     await new Promise(resolve => setTimeout(resolve, 3000));

//     // 7. Buscar el último mensaje en la conversación
//     const messages = await conversation.messages({
//       limit: 1,
//       direction: SortDirection.SORT_DIRECTION_DESCENDING,
//     });

//     let aiResponse = "El agente todavía está pensando... Intenta de nuevo en unos segundos.";

//     // Asegurarse de que el último mensaje no sea el nuestro
//     if (messages.length > 0 && messages[0].senderAddress.toLowerCase() !== signer.address.toLowerCase()) {
//       aiResponse = messages[0]?.content || "No se pudo obtener una respuesta clara.";
//     }

//     return NextResponse.json({ suggestion: aiResponse });
//   } catch (error: any) {
//     console.error("Error en la comunicación con XMTP:", error);
//     const errorMessage = error.message || "No se pudo comunicar con el agente de IA.";
//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }
