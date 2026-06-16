import { NextRequest, NextResponse } from "next/server";
import { getDemoProfile, isDemoMode } from "@/lib/demo";

/**
 * `GET /api/my-trophies?fid=<fid>`
 *
 * Public read for the Profile screen: aggregate stats + the user's earned
 * trophies. In demo mode this serves rich canned data; otherwise it returns a
 * minimal empty payload for now.
 */
export async function GET(req: NextRequest) {
  if (isDemoMode()) return NextResponse.json(getDemoProfile());

  // TODO: real DB-backed implementation. Read the user's minted NFTs for this
  // fid, aggregate likes/best level, and shape them as trophies. Until then we
  // return an empty profile so the screen renders its empty state cleanly.
  const fid = req.nextUrl.searchParams.get("fid");
  void fid;

  return NextResponse.json({
    stats: { trophies: 0, totalLikes: 0, bestLevel: 0 },
    trophies: [],
  });
}
