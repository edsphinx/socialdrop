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
