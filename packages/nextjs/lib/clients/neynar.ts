import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set in .env");
}

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

export const neynarClient = new NeynarAPIClient(config);
