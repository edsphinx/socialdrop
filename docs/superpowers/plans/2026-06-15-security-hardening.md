# Security Hardening + SocialDataProvider Implementation Plan (Sub-project 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SocialDrop's mint/evolve endpoints safe — authenticate with verified Farcaster FIDs, fix the claim race, fail the webhook closed, validate inputs, rate-limit — and route all social-data access through a `SocialDataProvider` seam so the data layer can be swapped later.

**Architecture:** Six phases on a `chore/security-hardening` branch off post-merge `main`. Phase A introduces the `SocialDataProvider` interface (Neynar impl) and routes every API call through it (pure refactor). Phase B adds Quick Auth — gated by an empirical Base App round-trip test FIRST. Phase C fixes the claim race with a reserve-before-mint Prisma migration. Phases D/E add fail-closed webhook, zod validation, and Upstash rate limiting. The existing 61-test Vitest suite plus new tests (mocking the provider) and a strict `next build` gate every task.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 6 / Supabase Postgres, viem, `@farcaster/miniapp-sdk` (Quick Auth client), `@farcaster/quick-auth` (server verify), `@upstash/ratelimit` + `@upstash/redis`, `zod`, Vitest.

**Conventions:**
- Run from repo root `/Users/edsphinx/dev/blockchain/socialdrop/socialdrop` unless a `cd` is shown.
- **Prerequisite:** PR #19 (de-scaffold) is merged to `main`. Start: `git checkout main && git pull && git checkout -b chore/security-hardening`.
- Path alias is `@/` (post-de-scaffold). Remote SSH, identity `edsphinx`. Do NOT push until the final PR task.
- TDD: write the failing test, see it fail, implement, see it pass, commit. Tests mock `@/lib/social` (the provider) and `@/services/blockchain.service`.

---

## File Structure

**New files:**
- `packages/nextjs/lib/social/types.ts` — the `SocialDataProvider` interface + shared types.
- `packages/nextjs/lib/social/neynar-provider.ts` — `NeynarSocialDataProvider` (wraps `services/neynar.service.ts`).
- `packages/nextjs/lib/social/index.ts` — `getSocialDataProvider()` accessor.
- `packages/nextjs/lib/auth/getVerifiedFid.ts` — Quick Auth JWT verification → trusted FID.
- `packages/nextjs/lib/ratelimit.ts` — Upstash limiter wrapper (no-op when unset).
- `packages/nextjs/lib/validation/schemas.ts` — zod schemas for request bodies.
- `packages/nextjs/app/api/auth/whoami/route.ts` — tiny endpoint for the Base App auth round-trip test.
- Test files under `packages/nextjs/__tests__/` mirroring each.

**Modified files:**
- `packages/nextjs/services/database.service.ts` — `reserveMint` / `finalizeMint` / `failMint`.
- `packages/nextjs/prisma/schema.prisma` (+ a new migration) — `status` enum + nullable `token_id`.
- `packages/nextjs/lib/webhook-verify.ts` — fail closed.
- `packages/nextjs/app/api/claim/route.ts`, `app/api/gamification/update/route.ts`, `app/api/gamification/register/route.ts`, `app/api/webhooks/neynar/route.ts`, `app/api/duels/route.ts` — provider + auth + validation + reserve-before-mint.
- Client call sites that POST a FID: `components/miniapp-dashboard.tsx` (claim) and `app/duel/[campaignId]/page.tsx` (register/update) — switch to `sdk.quickAuth.fetch`, drop `userFid` from bodies.

---

## PHASE A — SocialDataProvider abstraction (pure refactor)

### Task 1: Define the `SocialDataProvider` interface and Neynar implementation

**Files:**
- Create: `packages/nextjs/lib/social/types.ts`, `lib/social/neynar-provider.ts`, `lib/social/index.ts`
- Test: `packages/nextjs/__tests__/lib/social/neynar-provider.test.ts`

- [ ] **Step 1: Write the interface + types**

`lib/social/types.ts`:
```ts
export interface SocialUser {
  fid: number;
  address: `0x${string}`;
  username: string;
  pfpUrl: string;
}

export interface CastPublishOptions {
  embeds?: { url: string }[];
  channelId?: string;
  replyTo?: string;
}

export interface SocialDataProvider {
  /** Resolve a FID to its primary verified ETH address + profile. Null if unresolvable. */
  getUserByFid(fid: number): Promise<SocialUser | null>;
  /** Has this FID liked this cast? */
  didUserLikeCast(fid: number, castHash: string): Promise<boolean>;
  /** Total like count of a cast. */
  getCastLikesCount(castHash: string): Promise<number>;
  /** Resolve many FIDs to profiles (leaderboard). */
  getBulkUsers(fids: number[]): Promise<SocialUser[]>;
  /** Publish a cast (write). Returns the new cast hash or null on failure. */
  publishCast(text: string, opts?: CastPublishOptions): Promise<{ success: boolean; hash: string | null }>;
}
```

- [ ] **Step 2: Write the failing test**

`__tests__/lib/social/neynar-provider.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchBulkUsers = vi.fn();
const fetchCastReactions = vi.fn();
const publishCast = vi.fn();
vi.mock("@/lib/clients/neynar", () => ({
  personalNeynarClient: { fetchBulkUsers, fetchCastReactions, publishCast },
}));

import { NeynarSocialDataProvider } from "@/lib/social/neynar-provider";

describe("NeynarSocialDataProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getUserByFid returns the verified address + profile", async () => {
    fetchBulkUsers.mockResolvedValue({
      users: [{ fid: 7, username: "alice", pfp_url: "http://x/p.png", verified_addresses: { eth_addresses: ["0xabc"] }, custody_address: "0xdead" }],
    });
    const p = new NeynarSocialDataProvider();
    expect(await p.getUserByFid(7)).toEqual({ fid: 7, address: "0xabc", username: "alice", pfpUrl: "http://x/p.png" });
  });

  it("getUserByFid falls back to custody address", async () => {
    fetchBulkUsers.mockResolvedValue({ users: [{ fid: 7, username: "alice", pfp_url: "p", verified_addresses: { eth_addresses: [] }, custody_address: "0xcust" }] });
    const p = new NeynarSocialDataProvider();
    expect((await p.getUserByFid(7))?.address).toBe("0xcust");
  });

  it("getUserByFid returns null when no user", async () => {
    fetchBulkUsers.mockResolvedValue({ users: [] });
    expect(await new NeynarSocialDataProvider().getUserByFid(7)).toBeNull();
  });

  it("didUserLikeCast true when the fid is among reactions", async () => {
    fetchCastReactions.mockResolvedValue({ reactions: [{ user: { fid: 7 } }] });
    expect(await new NeynarSocialDataProvider().didUserLikeCast(7, "0xc")).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to verify failure**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/social/neynar-provider.test.ts`
Expected: FAIL — `Cannot find module '@/lib/social/neynar-provider'`.

- [ ] **Step 4: Implement the provider**

`lib/social/neynar-provider.ts` (wraps the existing client; mirrors `services/neynar.service.ts` logic):
```ts
import { personalNeynarClient } from "@/lib/clients/neynar";
import { getCastLikesCount as neynarGetCastLikesCount, publishCast as neynarPublishCast } from "@/services/neynar.service";
import type { CastPublishOptions, SocialDataProvider, SocialUser } from "./types";

function toSocialUser(user: any): SocialUser | null {
  const address = user?.verified_addresses?.eth_addresses?.[0] ?? user?.custody_address;
  if (!address) return null;
  return { fid: user.fid, address: address as `0x${string}`, username: user.username, pfpUrl: user.pfp_url ?? "" };
}

export class NeynarSocialDataProvider implements SocialDataProvider {
  async getUserByFid(fid: number): Promise<SocialUser | null> {
    try {
      const res = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
      const user = res.users[0];
      return user ? toSocialUser(user) : null;
    } catch (e) {
      console.error("[Neynar] getUserByFid:", e);
      return null;
    }
  }

  async didUserLikeCast(fid: number, castHash: string): Promise<boolean> {
    try {
      const res = await personalNeynarClient.fetchCastReactions({ hash: castHash, types: ["likes"], viewerFid: fid });
      return res.reactions.some((r: any) => r.user.fid === fid);
    } catch (e) {
      console.error("[Neynar] didUserLikeCast:", e);
      return false;
    }
  }

  getCastLikesCount(castHash: string): Promise<number> {
    return neynarGetCastLikesCount(castHash);
  }

  async getBulkUsers(fids: number[]): Promise<SocialUser[]> {
    if (fids.length === 0) return [];
    try {
      const res = await personalNeynarClient.fetchBulkUsers({ fids });
      return res.users.map(toSocialUser).filter((u: SocialUser | null): u is SocialUser => u !== null);
    } catch (e) {
      console.error("[Neynar] getBulkUsers:", e);
      return [];
    }
  }

  publishCast(text: string, opts?: CastPublishOptions) {
    return neynarPublishCast(text, opts ?? {});
  }
}
```

`lib/social/index.ts`:
```ts
import { NeynarSocialDataProvider } from "./neynar-provider";
import type { SocialDataProvider } from "./types";

let _provider: SocialDataProvider | null = null;

export function getSocialDataProvider(): SocialDataProvider {
  if (!_provider) _provider = new NeynarSocialDataProvider();
  return _provider;
}

export type { SocialDataProvider, SocialUser } from "./types";
```

- [ ] **Step 5: Run tests + type-check**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/social/neynar-provider.test.ts && yarn next:check-types`
Expected: PASS; type-check exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/lib/social packages/nextjs/__tests__/lib/social
git commit -m "feat: add SocialDataProvider interface and Neynar implementation"
```

### Task 2: Route the duels endpoint through the provider (prove the seam)

**Files:**
- Modify: `packages/nextjs/app/api/duels/route.ts`

- [ ] **Step 1: Replace direct Neynar use with the provider**

In `app/api/duels/route.ts`, replace the `personalNeynarClient.fetchBulkUsers` block. Change the import line `import { personalNeynarClient } from "@/lib/clients/neynar";` to:
```ts
import { getSocialDataProvider } from "@/lib/social";
```
Replace the fetch + map (the `usersResponse` / `usersMap` section) with:
```ts
      const social = getSocialDataProvider();
      const users = await social.getBulkUsers(duelistFids);
      const usersMap = new Map(users.map(u => [u.fid, u]));

      duels = topScores.map((score: (typeof topScores)[number]) => {
        const user = usersMap.get(score.nft_holder_fid!);
        return {
          id: score.id,
          name: user ? `@${user.username}` : `Influencer FID #${score.nft_holder_fid}`,
          pfpUrl: user?.pfpUrl || "/default-avatar.svg",
          score: score.score,
          campaignId: score.campaign.id,
          campaignName: score.campaign.name,
        };
      });
```

- [ ] **Step 2: Verify tests + type-check + build**

Run: `cd packages/nextjs && yarn vitest run && yarn next:check-types`
Expected: 61+ pass; type-check exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/nextjs/app/api/duels/route.ts
git commit -m "refactor: route duels endpoint through SocialDataProvider"
```

---

## PHASE B — Quick Auth (verified FID)

### Task 3: Base App auth round-trip (de-risk gate)

> The 2025 Base App login failure must be confirmed resolved BEFORE wiring endpoints. This task ships a minimal round-trip and gets it verified in Base App + Farcaster.

**Files:**
- Create: `packages/nextjs/app/api/auth/whoami/route.ts`
- Modify: `packages/nextjs/package.json` (add `@farcaster/quick-auth`)
- Create: `packages/nextjs/lib/auth/getVerifiedFid.ts`
- Test: `packages/nextjs/__tests__/lib/auth/getVerifiedFid.test.ts`

- [ ] **Step 1: Add the dependency**

Run: `cd packages/nextjs && yarn add @farcaster/quick-auth`
Expected: added to dependencies.

- [ ] **Step 2: Write the failing test for `getVerifiedFid`**

`__tests__/lib/auth/getVerifiedFid.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

const verifyJwt = vi.fn();
vi.mock("@farcaster/quick-auth", () => ({
  createClient: () => ({ verifyJwt }),
  Errors: { InvalidTokenError: class InvalidTokenError extends Error {} },
}));

import { getVerifiedFid, UnauthorizedError } from "@/lib/auth/getVerifiedFid";

function req(auth?: string) {
  return new Request("https://socialdrop.live/api/claim", { headers: auth ? { authorization: auth } : {} });
}

describe("getVerifiedFid", () => {
  it("returns the fid from a valid token", async () => {
    verifyJwt.mockResolvedValue({ sub: 42 });
    expect(await getVerifiedFid(req("Bearer good.jwt.token"))).toBe(42);
  });
  it("throws Unauthorized when header missing", async () => {
    await expect(getVerifiedFid(req())).rejects.toBeInstanceOf(UnauthorizedError);
  });
  it("throws Unauthorized when verification fails", async () => {
    verifyJwt.mockRejectedValue(new Error("bad"));
    await expect(getVerifiedFid(req("Bearer bad"))).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
```

- [ ] **Step 3: Run it to verify failure**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/auth/getVerifiedFid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `getVerifiedFid`**

`lib/auth/getVerifiedFid.ts`:
```ts
import { createClient } from "@farcaster/quick-auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const client = createClient();

/** The domain the Quick Auth token is bound to (your deployed origin). */
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/auth/getVerifiedFid.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the `whoami` round-trip endpoint**

`app/api/auth/whoami/route.ts`:
```ts
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
```

- [ ] **Step 7: Commit**

```bash
git add packages/nextjs/lib/auth packages/nextjs/app/api/auth packages/nextjs/__tests__/lib/auth packages/nextjs/package.json packages/nextjs/../../yarn.lock
git commit -m "feat: add Quick Auth verification helper and whoami round-trip endpoint"
```

- [ ] **Step 8: MANUAL — verify in Base App AND Farcaster (de-risk gate)**

Run the app (`yarn start`), open the Mini App in **Base App** and in a **Farcaster client**. From the client console (or a temporary button), call:
```ts
import { sdk } from "@farcaster/miniapp-sdk";
const res = await sdk.quickAuth.fetch("/api/auth/whoami");
console.log(await res.json()); // expect { fid: <your fid> } in BOTH hosts
```
**Gate:** if `whoami` returns your FID in both Base App and Farcaster → proceed. If Base App fails (the 2025 symptom), STOP and report the exact error — do not wire the endpoints to Quick Auth until resolved (fallback: `sdk.actions.signIn` / SIWF). Document the result.

### Task 4: Enforce Quick Auth on the protected endpoints (server)

**Files:**
- Modify: `app/api/claim/route.ts`, `app/api/gamification/update/route.ts`, `app/api/gamification/register/route.ts`
- Test: `packages/nextjs/__tests__/api/auth-enforcement.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/api/auth-enforcement.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const getVerifiedFid = vi.fn();
vi.mock("@/lib/auth/getVerifiedFid", () => ({
  getVerifiedFid,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock("@/lib/social", () => ({ getSocialDataProvider: () => ({ getUserByFid: vi.fn().mockResolvedValue(null) }) }));
vi.mock("@/services/database.service", () => ({ findCampaignById: vi.fn().mockResolvedValue(null) }));

import { POST as claim } from "@/app/api/claim/route";

describe("auth enforcement", () => {
  beforeEach(() => vi.clearAllMocks());
  it("claim returns 401 without a valid token", async () => {
    getVerifiedFid.mockRejectedValue(Object.assign(new Error("no"), { name: "UnauthorizedError" }));
    const res = await claim(new Request("https://x/api/claim", { method: "POST", body: JSON.stringify({ campaignId: 1 }) }));
    expect(res.status).toBe(401);
  });
});
```
(Adjust the `UnauthorizedError` instanceof check to import the mocked class if needed — the route maps `UnauthorizedError` to 401.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/nextjs && yarn vitest run __tests__/api/auth-enforcement.test.ts`
Expected: FAIL (route still reads `userFid` from body, returns 400/404 not 401).

- [ ] **Step 3: Wire `getVerifiedFid` into `app/api/claim/route.ts`**

Replace the top of the handler. New imports:
```ts
import { NextResponse } from "next/server";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";
import { getSocialDataProvider } from "@/lib/social";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";
```
Handler body — derive the FID from the token, drop body `userFid`, use the provider:
```ts
export async function POST(request: Request) {
  let userFid: number;
  try {
    userFid = await getVerifiedFid(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
  try {
    const { campaignId } = await request.json();
    const social = getSocialDataProvider();

    const campaign = await db.findCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ success: false, message: "Campaign not found." }, { status: 404 });

    const userData = await social.getUserByFid(userFid);
    if (!userData) return NextResponse.json({ success: false, message: "Farcaster user not found." }, { status: 404 });
    const { address: recipientAddress, username } = userData;

    const mintCount = await db.getMintCount(campaign.id);
    if (mintCount >= campaign.max_mints) return NextResponse.json({ success: false, message: "Campaign has reached its mint limit." }, { status: 409 });

    const hasLiked = await social.didUserLikeCast(userFid, campaign.target_cast_hash);
    if (!hasLiked) return NextResponse.json({ success: false, message: "You must like the original cast to claim." }, { status: 403 });

    // (reserve-before-mint replaces the old hasUserMinted+mint+recordMint in Task 6)
    if (await db.hasUserMinted(campaign.id, recipientAddress)) return NextResponse.json({ success: false, message: "You have already claimed this NFT." }, { status: 409 });
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) throw new Error("Mint transaction failed.");
    await db.recordMint(campaign.id, mintResult.tokenId, recipientAddress, userFid);

    await social.publishCast(`🎉 @${username} just claimed NFT #${mintResult.tokenId} from the "${campaign.name}" drop!`);
    return NextResponse.json({ success: true, message: "NFT claimed successfully!", tokenId: mintResult.tokenId, transactionHash: mintResult.hash });
  } catch (error) {
    console.error("Error in claim endpoint:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Wire the same pattern into `gamification/update` and `gamification/register`**

In both routes: add `import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";` and `import { getSocialDataProvider } from "@/lib/social";`. At the top of each handler, replace the body `userFid` read with:
```ts
  let userFid: number;
  try {
    userFid = await getVerifiedFid(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
```
Then read only the remaining fields from the body (`campaignId`; `castHash` for register), and replace `getUserDataFromFid(userFid)` with `getSocialDataProvider().getUserByFid(userFid)` and `getCastLikesCount(...)` with the provider's method. Keep the rest of each handler's logic unchanged.

- [ ] **Step 5: Run tests + type-check**

Run: `cd packages/nextjs && yarn vitest run && yarn next:check-types`
Expected: the new auth test passes; existing route tests that posted `userFid` in the body may need their mock to also mock `getVerifiedFid` — update those tests to `vi.mock("@/lib/auth/getVerifiedFid", ...)` returning a fixed fid. Fix them so all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/app/api packages/nextjs/__tests__/api
git commit -m "feat: enforce Quick Auth verified FID on claim, gamification update and register"
```

### Task 5: Switch client call sites to `sdk.quickAuth.fetch`

**Files:**
- Modify: `packages/nextjs/components/miniapp-dashboard.tsx` (claim POST), `packages/nextjs/app/duel/[campaignId]/page.tsx` (register + update POSTs)

- [ ] **Step 1: Update the claim call**

In `components/miniapp-dashboard.tsx`, add `import { sdk } from "@farcaster/miniapp-sdk";`. Find the `fetch("/api/claim", { method: "POST", ... })` call. Replace `fetch(` with `sdk.quickAuth.fetch(` and remove `userFid` (or `fid`) from the JSON body — the server now derives it from the token. Keep `campaignId`.

- [ ] **Step 2: Update the gamification calls**

In `app/duel/[campaignId]/page.tsx`, add the same `sdk` import. For the POSTs to `/api/gamification/register` and `/api/gamification/update`, replace `fetch(` with `sdk.quickAuth.fetch(` and remove `userFid` from the bodies (keep `campaignId`, and `castHash` for register). GET calls (`/api/gamification/status`, `/api/duels`) stay as plain `fetch` (they're unauthenticated reads).

- [ ] **Step 3: Verify build + type-check**

Run: `cd packages/nextjs && yarn next:check-types && yarn next:build`
Expected: type-check exit 0; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/nextjs/components/miniapp-dashboard.tsx "packages/nextjs/app/duel/[campaignId]/page.tsx"
git commit -m "feat: authenticate client claim/gamification calls via sdk.quickAuth.fetch"
```

---

## PHASE C — Claim race fix (reserve-before-mint)

### Task 6: Prisma migration — `status` enum + nullable `token_id`

**Files:**
- Modify: `packages/nextjs/prisma/schema.prisma`
- Create: a Prisma migration

- [ ] **Step 1: Edit the schema**

In `prisma/schema.prisma`, add the enum and change `nfts_minted`:
```prisma
enum MintStatus {
  pending
  minted
  failed
}
```
In `model nfts_minted`, change `token_id Int` to `token_id Int?` and add `status MintStatus @default(pending)`.

- [ ] **Step 2: Create the migration with a backfill**

Run: `cd packages/nextjs && yarn prisma migrate dev --name nft_mint_status --create-only`
Then edit the generated migration SQL to backfill existing rows after the column is added:
```sql
UPDATE "nfts_minted" SET "status" = 'minted' WHERE "token_id" IS NOT NULL;
```
Apply: `yarn prisma migrate dev`
Expected: migration applies; `yarn prisma generate` runs.

- [ ] **Step 3: Verify type-check (Prisma client regenerated)**

Run: `cd packages/nextjs && yarn next:check-types`
Expected: exit 0 (note: code reading `token_id` may now see `number | null` — Task 7 handles the call sites).

- [ ] **Step 4: Commit**

```bash
git add packages/nextjs/prisma/schema.prisma packages/nextjs/prisma/migrations
git commit -m "feat: add mint status + nullable token_id for reserve-before-mint"
```

### Task 7: Reserve-before-mint in the DB service and mint flows

**Files:**
- Modify: `packages/nextjs/services/database.service.ts`, `app/api/claim/route.ts`, `app/api/webhooks/neynar/route.ts`
- Test: `packages/nextjs/__tests__/api/claim-race.test.ts`

- [ ] **Step 1: Write the failing concurrency test**

`__tests__/api/claim-race.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/getVerifiedFid", () => ({ getVerifiedFid: vi.fn().mockResolvedValue(7), UnauthorizedError: class extends Error {} }));
vi.mock("@/lib/social", () => ({ getSocialDataProvider: () => ({
  getUserByFid: vi.fn().mockResolvedValue({ fid: 7, address: "0xabc", username: "a", pfpUrl: "" }),
  didUserLikeCast: vi.fn().mockResolvedValue(true),
  publishCast: vi.fn().mockResolvedValue({ success: true, hash: "0x" }),
}) }));
const mintNFT = vi.fn().mockResolvedValue({ success: true, tokenId: 1, hash: "0x" });
vi.mock("@/services/blockchain.service", () => ({ mintNFT }));

// reserveMint resolves once, then rejects with a unique-violation for the concurrent caller
const reserveMint = vi.fn();
vi.mock("@/services/database.service", () => ({
  findCampaignById: vi.fn().mockResolvedValue({ id: 1, max_mints: 100, target_cast_hash: "0xc", name: "C" }),
  getMintCount: vi.fn().mockResolvedValue(0),
  reserveMint,
  finalizeMint: vi.fn().mockResolvedValue(undefined),
  failMint: vi.fn().mockResolvedValue(undefined),
}));

import { POST as claim } from "@/app/api/claim/route";

function call() {
  return claim(new Request("https://x/api/claim", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ campaignId: 1 }) }));
}

describe("claim race", () => {
  beforeEach(() => { vi.clearAllMocks(); mintNFT.mockResolvedValue({ success: true, tokenId: 1, hash: "0x" }); });
  it("only one of two concurrent claims mints; the other gets 409", async () => {
    let reserved = false;
    reserveMint.mockImplementation(async () => {
      if (reserved) { const e: any = new Error("unique"); e.code = "P2002"; throw e; }
      reserved = true; return { id: 1 };
    });
    const [a, b] = await Promise.all([call(), call()]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(mintNFT).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/nextjs && yarn vitest run __tests__/api/claim-race.test.ts`
Expected: FAIL — `reserveMint` not exported / route still uses `hasUserMinted`+`recordMint`.

- [ ] **Step 3: Add reserve/finalize/fail to `database.service.ts`**

Replace `recordMint` with the reservation trio:
```ts
/** Reserve a claim slot. Throws Prisma P2002 (unique violation) if already reserved/claimed. */
export async function reserveMint(campaignId: number, recipientAddress: string, userFid?: number) {
  return await prisma.nfts_minted.create({
    data: { campaign_id: campaignId, recipient_address: recipientAddress, user_fid: userFid ?? null, token_id: null, status: "pending" },
  });
}

/** Finalize a reserved row with the minted token id. */
export async function finalizeMint(id: number, tokenId: number) {
  return await prisma.nfts_minted.update({ where: { id }, data: { token_id: tokenId, status: "minted" } });
}

/** Release a reservation after a failed mint so the user can retry. */
export async function failMint(id: number) {
  return await prisma.nfts_minted.delete({ where: { id } });
}
```
Keep `hasUserMinted`/`getMintCount`/`findUserMint` (note: `findUserMint` should now prefer minted rows — add `status: "minted"` to its `where` so evolve never reads a pending row with `token_id: null`).

- [ ] **Step 4: Use reserve-before-mint in `claim/route.ts`**

Replace the `hasUserMinted` + `mintNFT` + `recordMint` block (from Task 4) with:
```ts
    let reservation;
    try {
      reservation = await db.reserveMint(campaign.id, recipientAddress, userFid);
    } catch (e: any) {
      if (e?.code === "P2002") return NextResponse.json({ success: false, message: "You have already claimed this NFT." }, { status: 409 });
      throw e;
    }
    const mintResult = await blockchain.mintNFT(recipientAddress as `0x${string}`);
    if (!mintResult.success) {
      await db.failMint(reservation.id);
      throw new Error("Mint transaction failed.");
    }
    await db.finalizeMint(reservation.id, mintResult.tokenId);
```

- [ ] **Step 5: Apply the same sequence in `webhooks/neynar/route.ts`**

Replace its `hasUserMinted` check + `mintNFT` + `recordMint` with the same reserve → mint → finalize/fail sequence (using the webhook's `recipientAddress`/`userFid`). On P2002, return 200 with `{ message: "User has already minted." }` (replay-safe no-op).

- [ ] **Step 6: Run tests + type-check + build**

Run: `cd packages/nextjs && yarn vitest run && yarn next:check-types && yarn next:build`
Expected: claim-race test passes; the existing claim/webhook tests (Task 4-updated) pass — update any that asserted on `recordMint` to assert on `reserveMint`/`finalizeMint`; all green; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/nextjs/services/database.service.ts packages/nextjs/app/api/claim/route.ts packages/nextjs/app/api/webhooks/neynar/route.ts packages/nextjs/__tests__/api/claim-race.test.ts
git commit -m "fix: reserve-before-mint to close the claim race and orphaned-NFT risk"
```

---

## PHASE D — Webhook fail-closed

### Task 8: Fail the webhook closed when the secret is missing

**Files:**
- Modify: `packages/nextjs/lib/webhook-verify.ts`
- Test: `packages/nextjs/__tests__/lib/webhook-verify.test.ts` (extend existing)

- [ ] **Step 1: Add the failing test**

Append to `__tests__/lib/webhook-verify.test.ts`:
```ts
it("fails closed when no secret is configured", () => {
  expect(verifyWebhookSignature("body", "sig", undefined)).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/webhook-verify.test.ts`
Expected: FAIL — current code returns `true` when secret is unset.

- [ ] **Step 3: Make it fail closed**

In `lib/webhook-verify.ts`, replace the missing-secret branch:
```ts
  const webhookSecret = secret ?? process.env.NEYNAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("NEYNAR_WEBHOOK_SECRET is not set — rejecting webhook (fail closed).");
    return false;
  }
```
(Keep the rest: missing signature → false, HMAC-SHA512 + timingSafeEqual.)

- [ ] **Step 4: Run tests**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/webhook-verify.test.ts`
Expected: PASS (the existing "skips when unset" test, if any, must be updated to expect `false`).

- [ ] **Step 5: Commit**

```bash
git add packages/nextjs/lib/webhook-verify.ts packages/nextjs/__tests__/lib/webhook-verify.test.ts
git commit -m "fix: webhook verification fails closed when secret is unset"
```

---

## PHASE E — Validation + rate limiting

### Task 9: zod validation on protected routes

**Files:**
- Create: `packages/nextjs/lib/validation/schemas.ts`
- Modify: `app/api/claim/route.ts`, `app/api/gamification/update/route.ts`, `app/api/gamification/register/route.ts`
- Test: `packages/nextjs/__tests__/lib/validation.test.ts`

- [ ] **Step 1: Add zod**

Run: `cd packages/nextjs && yarn add zod`

- [ ] **Step 2: Write schemas + a failing test**

`lib/validation/schemas.ts`:
```ts
import { z } from "zod";

export const claimSchema = z.object({ campaignId: z.number().int().positive() });
export const gamificationUpdateSchema = z.object({ campaignId: z.number().int().positive() });
export const gamificationRegisterSchema = z.object({
  campaignId: z.number().int().positive(),
  castHash: z.string().min(1),
});
```
`__tests__/lib/validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { claimSchema, gamificationRegisterSchema } from "@/lib/validation/schemas";

describe("validation schemas", () => {
  it("rejects a missing campaignId", () => {
    expect(claimSchema.safeParse({}).success).toBe(false);
  });
  it("accepts a valid register body", () => {
    expect(gamificationRegisterSchema.safeParse({ campaignId: 1, castHash: "0xabc" }).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify the schema test passes**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 4: Apply schemas in the three routes**

In each route, after deriving `userFid` from the token, parse the body with the matching schema:
```ts
    const parsed = claimSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    const { campaignId } = parsed.data;
```
(Use `gamificationUpdateSchema` / `gamificationRegisterSchema` in the respective routes; the register one yields `{ campaignId, castHash }`.)

- [ ] **Step 5: Run tests + type-check**

Run: `cd packages/nextjs && yarn vitest run && yarn next:check-types`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/lib/validation packages/nextjs/app/api packages/nextjs/__tests__/lib/validation.test.ts packages/nextjs/package.json
git commit -m "feat: validate request bodies with zod on protected routes"
```

### Task 10: Upstash per-FID rate limiting on expensive endpoints

**Files:**
- Create: `packages/nextjs/lib/ratelimit.ts`
- Modify: `app/api/claim/route.ts`, `app/api/gamification/update/route.ts`, `packages/nextjs/.env.example`
- Test: `packages/nextjs/__tests__/lib/ratelimit.test.ts`

- [ ] **Step 1: Add deps**

Run: `cd packages/nextjs && yarn add @upstash/ratelimit @upstash/redis`

- [ ] **Step 2: Write the limiter wrapper + failing test**

`lib/ratelimit.ts`:
```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limiter = hasUpstash
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "60 s"), prefix: "socialdrop" })
  : null;

/** Returns true if allowed. No-op (always allowed) when Upstash env is not configured (local/dev/tests). */
export async function checkRateLimit(key: string): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(key);
  return success;
}
```
`__tests__/lib/ratelimit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/ratelimit";

describe("checkRateLimit", () => {
  it("allows when Upstash is not configured (no-op)", async () => {
    expect(await checkRateLimit("fid:7")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `cd packages/nextjs && yarn vitest run __tests__/lib/ratelimit.test.ts`
Expected: PASS (no env → no-op true).

- [ ] **Step 4: Apply to claim + gamification/update**

In each, right after deriving `userFid`:
```ts
    if (!(await checkRateLimit(`fid:${userFid}`))) return NextResponse.json({ message: "Too many requests." }, { status: 429 });
```
Add `import { checkRateLimit } from "@/lib/ratelimit";`. Add the env keys to `.env.example`:
```
# Rate limiting (Upstash Redis — optional in local dev; required in production)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 5: Run tests + type-check + build**

Run: `cd packages/nextjs && yarn vitest run && yarn next:check-types && yarn next:build`
Expected: all pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/nextjs/lib/ratelimit.ts packages/nextjs/app/api packages/nextjs/.env.example packages/nextjs/__tests__/lib/ratelimit.test.ts packages/nextjs/package.json
git commit -m "feat: per-FID rate limiting on claim and gamification update (Upstash, no-op when unset)"
```

---

## PHASE F — Final verification

### Task 11: Full verification, manual smoke, and PR

**Files:** none (verification + integration).

- [ ] **Step 1: Full clean verification**

```bash
cd /Users/edsphinx/dev/blockchain/socialdrop/socialdrop
yarn install
yarn workspace @socialdrop/hardhat test
cd packages/nextjs && yarn next:lint --max-warnings=0 && yarn next:check-types && yarn vitest run && yarn next:build
```
Expected: 17 Hardhat; lint clean; type-check clean; all Vitest pass (61 + new); build succeeds.

- [ ] **Step 2: Manual smoke in Base App + Farcaster (Base Sepolia)**

Run `yarn start`. In **Base App** (priority) and a **Farcaster** client: authenticated claim mints exactly once; a second concurrent claim is rejected; register + update drive a real like-count evolution; an unauthenticated `curl` to `/api/claim` returns 401.

- [ ] **Step 3: Push and open the PR (edsphinx identity)**

```bash
gh auth switch --user edsphinx
git push -u origin chore/security-hardening
gh pr create --base main --title "feat: security hardening + SocialDataProvider abstraction (sub-project 2a)" \
  --body "Quick Auth verified-FID on mint/evolve endpoints (body userFid ignored), reserve-before-mint race fix (status enum migration), webhook fail-closed, zod validation, per-FID Upstash rate limiting, and a SocialDataProvider seam (Neynar impl) so SP2b can swap reads to self-hosted Snapchain without touching routes. Quick Auth verified working in Base App + Farcaster (Task 3 gate)."
gh auth switch --user FONSEOS1_alcon
```
Expected: CI green on the PR. Set `NEXT_PUBLIC_AUTH_DOMAIN`, `UPSTASH_REDIS_REST_URL/TOKEN`, and `NEYNAR_WEBHOOK_SECRET` in Vercel env before/at deploy.

---

## Self-Review notes

- **Spec coverage:** SocialDataProvider (Tasks 1-2), Quick Auth + Base App de-risk (Tasks 3-5), claim race + migration (Tasks 6-7), webhook fail-closed (Task 8), zod (Task 9), rate limiting (Task 10), final verify + smoke (Task 11). All spec sections map to tasks.
- **Non-goals respected:** no Snapchain self-host (SP2b), no multisig/KMS/mainnet, no change to where the NFT is minted.
- **Ordering safety:** the provider seam lands first (Task 1-2) so auth/validation refactors call it; the Base App auth round-trip (Task 3) gates before endpoints depend on Quick Auth (Task 4); the migration (Task 6) precedes the reserve-before-mint code (Task 7); `findUserMint` is scoped to `status: "minted"` so nullable `token_id` never reaches the evolve path.
- **Type consistency:** `getVerifiedFid` returns `number` (used everywhere as `userFid`); `SocialUser` shape (`fid/address/username/pfpUrl`) is consistent across provider, routes, and tests; `reserveMint` returns a row with `id` consumed by `finalizeMint`/`failMint`.
- **Test note:** existing claim/webhook/gamification tests from sub-project 1 must be updated to mock `@/lib/auth/getVerifiedFid` and `@/lib/social`, and to assert `reserveMint`/`finalizeMint` instead of `recordMint`. Task 4 Step 5 and Task 7 Step 6 call this out explicitly.
