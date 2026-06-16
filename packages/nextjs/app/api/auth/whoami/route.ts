import { NextResponse } from "next/server";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";

export async function GET(request: Request) {
  try {
    const fid = await getVerifiedFid(request);
    return NextResponse.json({ fid });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
