import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";
import { isDemoMode } from "@/lib/demo";
import { checkEvolution } from "@/lib/evolution";
import { checkRateLimit } from "@/lib/ratelimit";
import { getSocialDataProvider } from "@/lib/social";
import { gamificationUpdateSchema } from "@/lib/validation/schemas";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";

export async function POST(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json({ score: 31, level: 3, evolved: false });

  let userFid: number;
  try {
    userFid = await getVerifiedFid(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!(await checkRateLimit(`fid:${userFid}`)))
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  try {
    const parsed = gamificationUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const { campaignId } = parsed.data;

    const social = getSocialDataProvider();

    // 1. Get user's wallet address
    const userData = await social.getUserByFid(userFid);
    if (!userData?.address) {
      return NextResponse.json({ error: "Could not find user wallet." }, { status: 404 });
    }

    // 2. Find gamification entry
    const gameScore = await db.findGamificationEntry(campaignId, userData.address);
    if (!gameScore || !gameScore.tracked_cast_hash) {
      return NextResponse.json({ error: "Not registered for gamification. Register a cast first." }, { status: 404 });
    }

    // 3. Fetch real-time like count from Neynar
    const score = await social.getCastLikesCount(gameScore.tracked_cast_hash);

    // 4. Update score in DB
    await db.updateGamificationScore(gameScore.id, score);

    // 5. Check evolution thresholds
    const userMint = await db.findUserMint(campaignId, userData.address);
    if (!userMint || userMint.token_id === null) {
      return NextResponse.json({ score, level: 1, evolved: false });
    }
    const userMintTokenId = userMint.token_id;

    const currentLevel = userMint.level;
    const targetLevel = checkEvolution(currentLevel, score);

    let evolved = false;
    let newLevel = currentLevel;

    if (targetLevel !== null) {
      // Evolve on-chain: contract only increments by 1, so call once per level jump
      const levelsToAdvance = targetLevel - currentLevel;
      let allSucceeded = true;

      for (let i = 0; i < levelsToAdvance; i++) {
        const result = await blockchain.evolveNFT(userMintTokenId);
        if (!result.success) {
          // Partial evolution: save whatever level we reached
          newLevel = currentLevel + i;
          allSucceeded = false;
          break;
        }
      }

      if (allSucceeded) {
        newLevel = targetLevel;
      }

      if (newLevel > currentLevel) {
        await db.updateMintLevel(userMint.id, newLevel);
        evolved = true;

        // Publish celebration cast
        const campaign = await db.findCampaignById(campaignId);
        const campaignName = campaign?.name || "a SocialDrop campaign";
        await social.publishCast(
          `@${userData.username}'s NFT just evolved to Level ${newLevel} in "${campaignName}"! The War of Influence continues.`,
          {
            embeds: [{ url: `${process.env.NEXT_PUBLIC_URL || "https://socialdrop.live"}/duel/${campaignId}` }],
          },
        );
      }
    }

    return NextResponse.json({ score, level: newLevel, evolved });
  } catch (error) {
    console.error("Error in /api/gamification/update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
