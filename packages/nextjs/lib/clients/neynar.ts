import { NeynarAPIClient } from "@neynar/nodejs-sdk";

let _personalNeynarClient: NeynarAPIClient | null = null;

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY_PERSONAL;
  if (!key) throw new Error("NEYNAR_API_KEY_PERSONAL is not set in .env");
  return key;
}

export const personalNeynarClient = new Proxy({} as NeynarAPIClient, {
  get(_, prop) {
    if (!_personalNeynarClient) {
      _personalNeynarClient = new NeynarAPIClient({ apiKey: getApiKey() });
    }
    return (_personalNeynarClient as any)[prop];
  },
});
