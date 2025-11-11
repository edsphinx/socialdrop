import { NextRequest, NextResponse } from "next/server";
import * as farcasterService from "~~/services/farcaster.service";
import * as hubService from "~~/services/farcaster-hub.service";
import * as neynar from "~~/services/neynar.service";

/**
 * GET /api/test/farcaster-hub
 *
 * Endpoint de testing para comparar Farcaster Hub vs Neynar
 *
 * Query params:
 * - fid: FID del usuario a buscar (default: 3)
 * - provider: "hub" | "neynar" | "both" (default: "both")
 *
 * Ejemplo:
 * /api/test/farcaster-hub?fid=3&provider=both
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = parseInt(searchParams.get("fid") || "3"); // Dan Romero (co-founder de Farcaster)
  const provider = searchParams.get("provider") || "both";

  const results: any = {
    fid,
    provider,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test Hub
    if (provider === "hub" || provider === "both") {
      console.log(`[Test] Testing Farcaster Hub for FID ${fid}`);
      const startHub = Date.now();

      try {
        const hubData = await hubService.getUserFromHub(fid);
        const hubLatency = Date.now() - startHub;

        results.hub = {
          success: true,
          latency: `${hubLatency}ms`,
          data: hubData,
          cost: "$0.00",
        };
      } catch (error: any) {
        results.hub = {
          success: false,
          error: error.message,
          note: "Make sure to install: yarn add @farcaster/hub-nodejs",
        };
      }
    }

    // Test Neynar
    if (provider === "neynar" || provider === "both") {
      console.log(`[Test] Testing Neynar for FID ${fid}`);
      const startNeynar = Date.now();

      try {
        const neynarData = await neynar.getUserDataFromFid(fid);
        const neynarLatency = Date.now() - startNeynar;

        results.neynar = {
          success: true,
          latency: `${neynarLatency}ms`,
          data: neynarData,
          cost: "~$0.01",
        };
      } catch (error: any) {
        results.neynar = {
          success: false,
          error: error.message,
        };
      }
    }

    // Comparación
    if (provider === "both" && results.hub?.success && results.neynar?.success) {
      const hubLatency = parseInt(results.hub.latency);
      const neynarLatency = parseInt(results.neynar.latency);

      results.comparison = {
        fasterProvider: hubLatency < neynarLatency ? "Hub" : "Neynar",
        speedDifference: Math.abs(hubLatency - neynarLatency) + "ms",
        costSavings: "100% with Hub",
        dataConsistency:
          results.hub.data?.address === results.neynar.data?.address ? "✅ Match" : "⚠️ Different",
      };
    }

    // Info del servicio híbrido
    results.serviceConfig = farcasterService.getProviderInfo();

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("[Test Farcaster Hub] Error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/test/farcaster-hub
 *
 * Test de cast reactions
 *
 * Body:
 * {
 *   "castHash": "0x...",
 *   "castFid": 123,
 *   "provider": "hub" | "neynar" | "both"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { castHash, castFid, provider = "both" } = body;

    if (!castHash) {
      return NextResponse.json({ error: "castHash is required" }, { status: 400 });
    }

    const results: any = {
      castHash,
      castFid,
      provider,
      timestamp: new Date().toISOString(),
    };

    // Test Hub
    if ((provider === "hub" || provider === "both") && castFid) {
      const startHub = Date.now();

      try {
        const reactions = await hubService.getReactionsFromHub(castHash, castFid);
        const hubLatency = Date.now() - startHub;

        results.hub = {
          success: true,
          latency: `${hubLatency}ms`,
          data: {
            totalLikes: reactions.totalLikes,
            totalRecasts: reactions.totalRecasts,
            likedByCount: reactions.likedByFids.length,
          },
          cost: "$0.00",
        };
      } catch (error: any) {
        results.hub = {
          success: false,
          error: error.message,
        };
      }
    }

    // Test Neynar
    if (provider === "neynar" || provider === "both") {
      const startNeynar = Date.now();

      try {
        const likes = await neynar.getCastLikesCount(castHash);
        const neynarLatency = Date.now() - startNeynar;

        results.neynar = {
          success: true,
          latency: `${neynarLatency}ms`,
          data: {
            totalLikes: likes,
          },
          cost: "~$0.005",
        };
      } catch (error: any) {
        results.neynar = {
          success: false,
          error: error.message,
        };
      }
    }

    // Comparación
    if (provider === "both" && results.hub?.success && results.neynar?.success) {
      results.comparison = {
        likesMatch: results.hub.data.totalLikes === results.neynar.data.totalLikes ? "✅" : "⚠️",
        hubLikes: results.hub.data.totalLikes,
        neynarLikes: results.neynar.data.totalLikes,
        costSavings: "100% with Hub",
      };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
