# SocialDrop — Security Hardening + SocialDataProvider Abstraction (Sub-project 2a)

**Date:** 2026-06-15
**Status:** Design — pending user review
**Scope:** Program Phase 2 (the "harden now" half of the hybrid decision), part a.
**Depends on:** PR #19 (de-scaffold) merged to `main`. Implementation starts from post-merge `main`.

## Context

SocialDrop won a Base hackathon (Sept 2025) and is being relaunched as a production grant application in English. **Base App is the priority platform** (that's where the funding is); Farcaster is also supported. Both are Farcaster Mini App hosts using `@farcaster/miniapp-sdk`.

A 5-review audit (2026-06-14) found the backend is real and tested but **not safely deployable**. The #1 blocker is security/centralization. Sub-project 1 (de-scaffold) made the app professional; this sub-project makes it *secure* and *decoupled from the data provider*.

Two drivers shape this work:
1. **Security:** the mint/evolve endpoints are unauthenticated (accept an arbitrary `userFid` from the request body), the claim flow has a race that can orphan NFTs, the webhook fails open, and there is no input validation or rate limiting.
2. **Data-provider cost/independence:** Neynar's usage-based pricing scales poorly with users (SocialDrop makes several Neynar calls per user action). The long-term plan is to self-host a Snapchain read replica. The seam that makes that migration cheap — a `SocialDataProvider` interface — is built here because this sub-project already refactors every Neynar call site for auth/validation (touch-once).

This is **SP2a** of a two-part decomposition:
- **SP2a (this spec):** security hardening + the `SocialDataProvider` abstraction (Neynar implementation). Code-only, no new data infrastructure.
- **SP2b (separate spec):** stand up a self-hosted Snapchain node + replicator → Postgres and implement a `SnapchainReadProvider` for the high-volume reads behind the same interface. Writes (`publishCast`), webhooks, and auth stay on Neynar (the hybrid the user chose). SP2a is the prerequisite: its interface makes SP2b a drop-in with no API-route changes.

## Goals

1. **Authenticate** the mint/evolve endpoints with Farcaster Quick Auth so the server acts on a *verified* FID, never a body-supplied one. Verify this works **in Base App first** (the priority platform).
2. **Fix the claim race** so concurrent requests cannot orphan an on-chain NFT.
3. **Fail the webhook closed** (require the secret) and rely on claim idempotency for replay safety.
4. **Validate inputs** (zod) and **rate-limit** the expensive endpoints (Upstash Redis, per-FID).
5. **Abstract the data provider:** route every current Neynar call through a `SocialDataProvider` interface (Neynar implementation), so SP2b can swap reads to a self-hosted source without touching API routes.

## Non-Goals (deferred)

- **Self-hosting Snapchain / a "mini Neynar"** → SP2b. SP2a keeps Neynar as the only `SocialDataProvider` implementation.
- Multisig contract ownership, KMS for the signer key, on-chain `maxLevel` cap, mainnet → grant-funded hardening.
- Changing *where* the NFT is minted for Base App users (Smart Wallet vs Farcaster-verified address) — a product decision; SP2a preserves the current "derive recipient from the verified FID's Farcaster address" behavior and notes the Base App nuance for later.
- New product features.

## Success Criteria

- `/api/claim`, `/api/gamification/update`, `/api/gamification/register` reject any request without a valid Quick Auth token (**401**) and act only on the token's FID; a body-supplied `userFid` is ignored.
- A verified empirical test confirms Quick Auth login works **in Base App** (and Farcaster) before the endpoints depend on it.
- Two concurrent claims for the same (campaign, FID) produce **exactly one** on-chain mint and **no** orphaned NFT; the loser gets a 409.
- The webhook rejects requests when `NEYNAR_WEBHOOK_SECRET` is unset or the signature is invalid (no fail-open).
- Every protected route validates its input with zod (invalid → 400) and the expensive routes rate-limit per FID (exceed → 429).
- No API route imports `@/services/neynar.service` directly; all social-data access goes through `SocialDataProvider`.
- The existing 61 Vitest tests still pass, plus new tests for auth, the race fix, fail-closed webhook, validation, and rate limiting; strict `next build` stays green.

## Design

### 5.1 `SocialDataProvider` abstraction

A new `packages/nextjs/lib/social/` module:
- `SocialDataProvider` (interface):
  - `getUserByFid(fid: number): Promise<{ address: \`0x${string}\`; username: string; pfpUrl: string } | null>` — read
  - `didUserLikeCast(fid: number, castHash: string): Promise<boolean>` — read (high-volume)
  - `getCastLikesCount(castHash: string): Promise<number>` — read (high-volume)
  - `getBulkUsers(fids: number[]): Promise<Array<{ fid: number; username: string; pfpUrl: string }>>` — read (high-volume)
  - `publishCast(text: string, opts?: { embeds?: { url: string }[] }): Promise<void>` — write (stays Neynar in the hybrid)
- `NeynarSocialDataProvider` (implementation): wraps the existing `services/neynar.service.ts` functions. The four read methods are the ones SP2b will later re-route to Snapchain; `publishCast` stays Neynar.
- A single accessor `getSocialDataProvider()` returns the configured provider (Neynar for now). All API routes import this, never `neynar.service` directly.

This is a refactor, not a behavior change: the methods do exactly what the current Neynar calls do.

### 5.2 Quick Auth (verified FID)

- **Dependency:** add `@farcaster/quick-auth` (server-side JWT verification).
- **Client:** protected calls use `sdk.quickAuth.fetch(url, init)` (from `@farcaster/miniapp-sdk`), which attaches the Quick Auth token as `Authorization: Bearer <jwt>`. The hook/components that currently POST `userFid` switch to this.
- **Server:** a helper `lib/auth/getVerifiedFid.ts` exposing `getVerifiedFid(request): Promise<number>`:
  - reads the `Authorization: Bearer` token,
  - verifies it with `@farcaster/quick-auth` (`createClient().verifyJwt({ token, domain })`),
  - returns the verified `fid` (the JWT `sub`), or throws an `UnauthorizedError` mapped to a **401** response.
- **Endpoints:** `/api/claim`, `/api/gamification/update`, `/api/gamification/register` call `getVerifiedFid(request)` first and use that FID. Any `userFid` in the body is ignored (and removed from the zod schema). The recipient address is derived from the verified FID via `getUserByFid`.
- **Base App de-risk (TASK 1 of the plan):** before wiring the endpoints, empirically verify `sdk.quickAuth.getToken()` / `signIn` returns a verifiable token **inside Base App** (and Farcaster). The 2025 Base App login failure must be confirmed resolved here, at step 1, not discovered at the end. If a gap exists, surface it before building on Quick Auth.

### 5.3 Claim race fix (reserve-before-mint)

The on-chain mint sits *between* the eligibility check and the DB write, so a DB transaction cannot span it. Use the unique constraint as a lock:

1. **Reserve:** insert a `nfts_minted` row with `status = 'pending'` (and `token_id = null`) for `(campaign_id, recipient_address)`. If the insert violates the unique constraint → the user is already claiming/claimed → return **409**.
2. **Mint:** call `blockchain.mintNFT(recipientAddress)`.
3. **Finalize:** on success, update the row with the real `token_id` and `status = 'minted'`. On mint failure, delete the reservation (or set `status = 'failed'`) so the user can retry, and return 500.

**Schema change (Prisma migration):** on `nfts_minted`, make `token_id` nullable and add `status` (`enum: pending | minted | failed`, default `pending`). The existing `@@unique([campaign_id, recipient_address])` becomes the lock. This also neutralizes replay-induced double-mints (see 5.4). The webhook mint path (`/api/webhooks/neynar`) uses the same reserve-before-mint sequence.

### 5.4 Webhook fail-closed + replay

- **Fail-closed:** change `lib/webhook-verify.ts` so a missing `NEYNAR_WEBHOOK_SECRET` no longer returns `true`. The secret is required; if absent, verification fails (closed). Keep the HMAC-SHA512 + `timingSafeEqual` check for the present-secret case.
- **Replay:** a replayed `reaction.created` webhook that would mint again is already blocked by the reserve-before-mint unique constraint (5.3) — the second attempt hits the conflict and is a no-op. No separate event-dedup store is required for SP2a; an explicit processed-event table is a later option if non-mint webhooks are added.

### 5.5 Rate limiting + zod validation

- **zod:** a schema per protected route (`lib/validation/` or colocated), replacing the manual truthy checks. Invalid body → **400** with a terse message. The `userFid` field is removed from request schemas (it now comes from the token).
- **Rate limiting:** `@upstash/ratelimit` + `@upstash/redis`, a sliding-window limiter keyed by **verified FID**, applied to the expensive endpoints (`/api/gamification/update`, `/api/claim`). Exceed → **429**. Config via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env (Upstash free tier). A thin `lib/ratelimit.ts` wraps it so it is mockable in tests and a no-op when env is unset in local dev.

### 5.6 Testing

Extend the Vitest suite. Tests mock `SocialDataProvider` (cleaner than mocking Neynar internals — a direct payoff of 5.1):
- **Auth:** `getVerifiedFid` with valid / invalid / missing token → fid / 401 / 401; protected routes 401 without a token; body `userFid` is ignored in favor of the token's FID.
- **Race:** two concurrent claims for the same (campaign, FID) → one `mintNFT` call, one `minted` row, the second gets 409; mint failure path cleans up the reservation.
- **Webhook:** missing secret → rejected (not fail-open); bad signature → rejected; valid → mints once.
- **Validation:** malformed/missing fields → 400.
- **Rate limit:** N calls pass, N+1 → 429 (limiter mocked/faked).

## Risks & Mitigations

- **Quick Auth doesn't work in Base App (the 2025 failure recurs).** → Task 1 verifies it empirically before anything depends on it; if blocked, we stop and reassess auth (e.g., `signIn`/SIWF fallback) before building.
- **Quick Auth verification adds latency / a dependency on Farcaster's auth server.** → Acceptable; cache verification per-request; it is not Neynar and not the hot path's bottleneck.
- **Reservation rows leak on crashes between reserve and finalize.** → `status = 'pending'` rows older than a short TTL are reclaimable; a cleanup is a minor follow-up, not a blocker (the unique constraint still protects integrity).
- **Upstash adds an external dependency.** → Free tier; wrapped behind `lib/ratelimit.ts`; no-op when env unset so local/dev and tests don't require it.
- **The abstraction refactor touches every route.** → Pure refactor with the 61-test suite + new tests as the net; behavior is unchanged in SP2a.

## Testing Strategy

Automated Vitest as in 5.6 (mock `SocialDataProvider`, fake the rate limiter and Quick Auth verifier). Plus a manual Base App + Farcaster smoke of the authed claim + evolve flows on Base Sepolia after wiring. Strict `next build` + the full suite gate every task, consistent with the CI established in sub-project 1.
