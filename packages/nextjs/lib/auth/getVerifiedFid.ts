import { createClient } from "@farcaster/quick-auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const client = createClient();
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_AUTH_DOMAIN || "socialdrop.live";

/** Verify the Bearer Quick Auth token and return the trusted FID, or throw UnauthorizedError. */
export async function getVerifiedFid(request: Request): Promise<number> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Missing bearer token");
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = await client.verifyJwt({ token, domain: AUTH_DOMAIN });
    const fid = Number(payload.sub);
    if (!Number.isFinite(fid) || fid <= 0) throw new UnauthorizedError("Invalid token subject");
    return fid;
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    throw new UnauthorizedError("Token verification failed");
  }
}
