import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set in .env");
}

if (!process.env.NEYNAR_API_KEY_DOCS) {
  throw new Error("NEYNAR_API_KEY_DOCS is not set in .env");
}
if (!process.env.NEYNAR_API_KEY_PERSONAL) {
  throw new Error("NEYNAR_API_KEY_PERSONAL is not set in .env");
}

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

export const neynarClient = new NeynarAPIClient(config);
// Cliente 1: Para lecturas "premium" usando la clave de la documentación
export const readOnlyNeynarClient = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY_DOCS,
});

// Cliente 2: Para operaciones personales (escribir casts) que requieren tu clave y tu Signer
export const personalNeynarClient = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY_PERSONAL });
