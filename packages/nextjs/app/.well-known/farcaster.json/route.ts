import { NextResponse } from "next/server";

/**
 * Manifest de Base Mini App
 *
 * Este archivo define la configuración y metadata de SocialDrop como Mini App.
 * Debe ser accesible en: https://socialdrop.live/.well-known/farcaster.json
 *
 * Documentación: https://docs.base.org/mini-apps/quickstart/migrate-existing-apps
 */

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://socialdrop.live";
  const BUILDER_ADDRESS = process.env.NEXT_PUBLIC_BUILDER_ADDRESS || "";

  const manifest = {
    // Account association credentials
    // IMPORTANTE: Estos se generan después usando Base Build verification tool
    // Ver: https://build.base.org/verify
    accountAssociation: {
      header: "", // Se llena después de verificación
      payload: "", // Se llena después de verificación
      signature: "", // Se llena después de verificación
    },

    // Builder information
    baseBuilder: {
      ownerAddress: BUILDER_ADDRESS,
    },

    // Mini App configuration
    miniapp: {
      version: "next",
      name: "SocialDrop",
      homeUrl: APP_URL,
      iconUrl: `${APP_URL}/icon.png`,

      // Splash screen
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#6366f1", // Indigo theme color

      // Webhooks (optional)
      webhookUrl: `${APP_URL}/api/miniapp/webhook`,

      // Descriptive information
      subtitle: "Get NFTs for engaging with Farcaster casts",
      description:
        "SocialDrop rewards you with evolving NFTs for liking and sharing casts. The more engagement, the rarer your NFT becomes!",

      // Screenshots for Base App store
      screenshotUrls: [
        `${APP_URL}/screenshots/home.png`,
        `${APP_URL}/screenshots/claim.png`,
        `${APP_URL}/screenshots/nft.png`,
      ],

      // Categories and tags for discovery
      primaryCategory: "social",
      tags: ["nft", "farcaster", "rewards", "gamification", "base"],

      // Hero section
      heroImageUrl: `${APP_URL}/hero.png`,
      tagline: "Your engagement, your evolving NFT",

      // Open Graph metadata
      ogTitle: "SocialDrop - Farcaster NFT Rewards",
      ogDescription: "Get rewarded with evolving NFTs for your Farcaster engagement",
      ogImageUrl: `${APP_URL}/og-image.png`,

      // Search indexing
      noindex: false, // Set to true for staging/development
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      // Cache for 1 hour
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      // CORS headers for Base Build verification
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}
