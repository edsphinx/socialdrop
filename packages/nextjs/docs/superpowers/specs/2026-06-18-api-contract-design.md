# SocialDrop API Contract (v1) — Design

**Date:** 2026-06-18
**Revision:** 2 (incorporates the 5-lens review panel: REST/evolvability, security, completeness, error/concurrency, FE-DX/OpenAPI/ops)
**Status:** Approved pending final user spec review
**Scope:** This document specifies ONLY the HTTP API contract between the future Go backend (`api.socialdrop.live`) and the future Preact SPA frontend (`socialdrop.live`). The contract is expressed as a single `openapi.yaml` source of truth that generates typed Go server stubs and a typed TypeScript client. **The Go backend implementation and the Preact frontend implementation are separate sub-projects** that consume this contract; they are out of scope here.

---

## 1. Goal

Produce a complete, versioned, typed HTTP API contract (`openapi.yaml`, OpenAPI 3.1) that:

1. Reimplements the existing Next.js de-facto API as a clean, REST-pragmatic v1 surface.
2. Normalizes the current snake_case/camelCase drift to **camelCase everywhere**.
3. Closes real security gaps (unauthenticated per-user reads; unauthenticated campaign creation; client-supplied FID; webhook replay; missing rate limits; unbounded inputs).
4. Makes the success schemas honest about asynchronous/eventual on-chain effects (mint, evolution) so a faithful backend cannot be contract-conformant yet behaviorally wrong.
5. Generates types for both sides (Go + TS) so backend and frontend cannot drift.

The contract is the seam that lets the Go backend and the Preact frontend be built **in parallel** with no coordination beyond this file.

---

## 2. Conventions

### 2.1 Transport & format
- **Base path / version:** all endpoints under `/v1`. Host: `https://api.socialdrop.live`.
- **JSON naming:** `camelCase` for every field, request and response.
- **Numbers** are JSON numbers (never stringified). **Timestamps** are ISO-8601 UTC strings (`createdAt`). **IDs** are integers.
- **Content-Type:** requests with a body MUST send `Content-Type: application/json`, else `415 UNSUPPORTED_MEDIA_TYPE`. Request bodies are capped at **16 KB**, else `413 PAYLOAD_TOO_LARGE`.

### 2.2 Success bodies
- Single resource → the resource object directly.
- Collection → `{ "items": [ ... ] }`, **and MAY carry sibling metadata fields** alongside `items` (e.g. `nextCursor`, `stats`). This supersedes a rigid "only `{items}`" rule so pagination and aggregates conform by design.

### 2.3 Pagination
- Collection endpoints accept `?limit` (default 20, max 50) and an opaque `?cursor` (string). They return `{ items: [...], nextCursor: string | null }`. **Cursor-based, not offset** — leaderboards mutate between fetches and offset paging double-counts. `nextCursor: null` means no more pages.

### 2.4 Errors (uniform)
- Body: `ApiError` = `{ "error": { "code": string, "message": string, "requestId": string, "details": [ { "field": string, "issue": string } ] | null } }`.
- `code` is a stable machine-readable enum (§7); clients MUST branch on `code`, never on the bare HTTP status (one status can map to several codes).
- `message` is human-readable and MUST be safe: no stack traces, SQL, upstream error bodies, or internal hostnames. Internal detail lives only in server logs keyed by `requestId`.
- `requestId` is generated server-side per request and also returned as the `X-Request-Id` response header (echoing a client-supplied `X-Request-Id` if present).
- `details` is populated only for validation failures (`INVALID_BODY`), listing each offending field.
- `429 RATE_LIMITED` responses MUST include a `Retry-After` header. Transient upstream errors (`502`/`503`/`504`) SHOULD include `Retry-After`.

### 2.5 Auth transport & lifecycle
- `Authorization: Bearer <jwt>` where `<jwt>` is a Farcaster Quick Auth token. **The authenticated FID is always taken from the verified token, never from a request body or query parameter.** No endpoint declares a `fid` parameter.
- The JWT MUST be verified against domain `socialdrop.live` (audience binding); tokens minted for any other Quick Auth domain are rejected `401 UNAUTHORIZED`.
- Tokens are short-lived; the API issues **no refresh tokens** (Quick Auth owns the lifecycle). On `401 UNAUTHORIZED` the frontend re-acquires a token via `sdk.quickAuth.getToken()` (or transparently via `sdk.quickAuth.fetch`) and retries once.

### 2.6 Idempotency
- `POST /v1/claims` and `POST /v1/campaigns` accept an `Idempotency-Key` request header (client-generated UUID). The server stores the first outcome keyed by `(fid, Idempotency-Key)` and replays the same response on retry, so a lost-response retry never double-mints or double-publishes. Recommended for all non-GET calls; required by clients for those two.

### 2.7 Caching
- Public GETs (`/v1/campaigns`, `/v1/campaigns/{id}`, `/v1/campaigns/{id}/leaderboard`, `/v1/leaderboard`, `/v1/dashboard`) return `ETag` + `Cache-Control: public, max-age=<n>` and honor `If-None-Match` with `304 Not Modified`. `max-age` is short for volatile resources (dashboard, leaderboards) and longer for stable ones (an inactive campaign). Authenticated responses send `Cache-Control: no-store`.

### 2.8 CORS & security headers
- CORS allowlist is exactly `Access-Control-Allow-Origin: https://socialdrop.live` (plus preview origins as needed), `Access-Control-Allow-Credentials: false` (bearer tokens, not cookies), explicit allowed methods/headers, `Access-Control-Max-Age`.
- All responses send `X-Content-Type-Options: nosniff` and omit server/stack identifying headers.

### 2.9 Rate limiting
- **Per-FID** limits on authenticated writes (`/v1/claims`, `…/competitors`, `…/competitors/me/sync`, `POST /v1/campaigns`).
- **Per-IP** limits on all unauthenticated reads and as a layer in front of per-FID writes (defends against FID rotation).
- The webhook mint path has an explicit per-campaign and global throughput cap (§5 Webhooks).

### 2.10 Versioning & evolution
- Additive changes (new optional response fields, new endpoints) are **non-breaking**; **clients MUST ignore unknown response fields**. Removing/renaming a field or changing a status is breaking → `/v2`.
- Retiring an endpoint uses `Deprecation` + `Sunset` response headers; `/v1` and `/v2` may run concurrently during a sunset window.

---

## 3. Security posture (corrections of current gaps)

1. **Per-user reads under `/v1/me`, FID from token.** Replaces today's unauthenticated `?fid=` reads (`my-claims`, `my-trophies`, `gamification/status`).
2. **Campaign creation requires JWT + creator allowlist + rate limit.** `POST /v1/campaigns` needs a valid JWT, the caller's FID in an approved-creator allowlist (else `403 NOT_ALLOWED`), and is per-FID rate limited (else `429`). Allowlist storage is an implementation detail; the contract defines the `403`/`429` outcomes.
3. **Action endpoints ignore client-supplied identity.** Claims, competitor registration, and sync derive identity solely from the JWT.
4. **Webhook is replay-resistant and idempotent.** See §5 Webhooks.
5. **Inputs are bounded.** Size caps, string lengths, URL/hash formats (§4, §5).

---

## 4. Entity schemas (canonical, camelCase)

> OpenAPI note: every multi-field object below is a **named** `components/schemas` entry (`Campaign`, `Trophy`, `TrophyStats`, `LeaderboardEntry`, `DashboardData`, `Competitor`, `SyncResult`, `ClaimStatus`, `ClaimError`, `ClaimSummary`, `Metrics`, `MeResponse`, `MyTrophiesResponse`, `ApiError`, `WebhookAck`) referenced via `$ref` (e.g. `ClaimStatus.error` is the named `ClaimError`). No anonymous nested objects. Nullable fields use the 3.1 form `type: [<t>, "null"]` (not the deprecated 3.0 `nullable: true`).

```jsonc
// Campaign (public view — internal join keys removed)
{
  "id": 12,
  "name": "Base Builders Drop",
  "imageUrl": "https://… | null",
  "maxMints": 100,                      // integer, min 1, max 10000
  "mintedCount": 37,                    // derived from nfts_minted (status=minted)
  "isActive": true,
  "creatorFid": 20039,                  // nullable; public attribution
  "createdAt": "2026-06-18T12:00:00Z"
  // NOTE: targetCastHash and nftImages are NOT exposed here (unused client-side;
  // targetCastHash is a server-internal join key). The like-check happens
  // server-side; users like the cast out-of-band on Farcaster.
}

// Trophy
{ "id": 88, "campaignName": "Base Builders Drop", "level": 3,
  "levelName": "Champion", "imageUrl": "https://…" }

// TrophyStats
{ "trophies": 4, "totalLikes": 312, "bestLevel": 3 }

// MyTrophiesResponse (collection + sibling stats — conforms to §2.2)
{ "stats": TrophyStats, "items": [ Trophy, … ] }

// LeaderboardEntry — rows are keyed by `fid` (no `id` field)
{ "campaignId": 12, "campaignName": "Base Builders Drop", "fid": 20039,
  "username": "edsphinx.eth", "pfpUrl": "https://…", "score": 142, "level": 3 }

// DashboardData
{ "trendingCampaigns": [ Campaign, … ],     // up to 4, newest first
  "featuredRankings":  [ LeaderboardEntry, … ] }  // renamed from featuredDuels

// Competitor (a user's entry in a campaign competition; replaces GameStatus alias)
{ "campaignId": 12, "fid": 20039, "tokenId": 5,
  "score": 142, "level": 3, "levelName": "Champion",
  "imageUrl": "https://…", "trackedCastHash": "0x…" }

// SyncResult — level reflects CONFIRMED on-chain level; leveledUpTo always present
{ "score": 142,
  "onChainLevel": 3,                    // confirmed on-chain level after this call
  "evolved": true,                      // true if onChainLevel increased on this call
  "leveledUpTo": 3 }                    // integer | null (null when evolved=false)

// ClaimStatus — async claim lifecycle (poll target)
{ "claimId": "clm_abc123",
  "status": "pending",                  // "pending" | "minted" | "failed"
  "tokenId": 5,                         // integer | null (until minted)
  "transactionHash": "0x…",            // string  | null (until minted)
  "level": 1,                           // integer | null (until minted)
  "name": "SocialDrop NFT — Participant",// string | null (until minted)
  "imageUrl": "https://…",             // string | null (until minted) — feeds the reveal
  "error": { "code": "MINT_FAILED", "message": "…" } | null }  // set when status=failed

// ClaimSummary (eligible-campaign row for /v1/me/claims)
{ "id": 12, "name": "Base Builders Drop" }

// Metrics (admin-only)
{ "totalCampaigns": 10, "activeCampaigns": 4, "totalMints": 268,
  "uniqueParticipants": 191, "registeredCompetitors": 73 }

// MeResponse
{ "fid": 20039 }

// WebhookAck
{ "message": "ok" }
```

**Level naming (server-authoritative):** `1 Participant · 2 Influencer · 3 Champion · 4 Legend`. `levelName` is always computed server-side wherever `level` appears, so the frontend never hardcodes it.

---

## 5. Endpoint catalog

Legend — Auth: `—` public · `JWT` Quick Auth · `JWT+AL` JWT + creator allowlist · `JWT+ADM` JWT + admin allowlist · `SIG` webhook signature. All collection GETs support `?limit`/`?cursor` (§2.3). All public GETs are cached (§2.7) and per-IP rate limited (§2.9).

### Campaigns

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/v1/campaigns` | — | `?active`, `?limit`, `?cursor` | `200 {items: Campaign[], nextCursor}` | 500 |
| GET | `/v1/campaigns/{id}` | — | path `id` | `200 Campaign` | 404 NOT_FOUND, 500 |
| POST | `/v1/campaigns` | JWT+AL | `Idempotency-Key`; `{name, castContent, maxMints, nftImageUrl}` | `201 Campaign` | 401, 403 NOT_ALLOWED, 400 INVALID_BODY, 413, 415, 429, 502 CAST_PUBLISH_FAILED, 500 |
| GET | `/v1/campaigns/{id}/leaderboard` | — | path `id`; `?limit`, `?cursor` | `200 {items: LeaderboardEntry[], nextCursor}` | 404 NOT_FOUND, 500 |
| GET | `/v1/campaigns/{id}/arena` | — | path `id` | `200 {campaign: Campaign, leaderboard: LeaderboardEntry[], me: Competitor \| null}` | 404 NOT_FOUND, 500 |

`POST /v1/campaigns`: `creatorFid` comes from the JWT. **Ordering to avoid orphaned casts:** the campaign row is inserted as `draft` first, the cast is published second, then the row is activated; a failed publish leaves an inactive draft (no orphaned public cast) and returns `502 CAST_PUBLISH_FAILED`. `maxMints` is validated `1..10000`; `nftImageUrl` must match `^https://` or `^ipfs://` (host allowlist); `name`/`castContent` have max lengths. `Idempotency-Key` makes retries safe against duplicate publishes. The `/arena` aggregate exists so the Arena screen (`/duel/{id}`) is one request, not three.

### Claims (asynchronous mint + polling)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/v1/claims` | JWT | `Idempotency-Key`; `{campaignId}` | `202 {claimId, status:"pending"}` | 401, 400 INVALID_BODY, 409 NOT_LIKED, 409 ALREADY_CLAIMED, 409 LIMIT_REACHED, 422 WALLET_UNRESOLVED, 413, 415, 429, 502 UPSTREAM_UNAVAILABLE, 503, 500 |
| GET | `/v1/claims/{claimId}` | JWT | path `claimId` | `200 ClaimStatus` | 401, 404 NOT_FOUND, 500 |

`POST /v1/claims` validates eligibility synchronously (like-check, dedup, capacity) and returns `202` with a `claimId`; the on-chain mint runs asynchronously. The frontend polls `GET /v1/claims/{claimId}` until `status` is `minted` (carrying `tokenId`, `transactionHash`, `level`, `name`, `imageUrl` — the reveal needs no separate metadata call) or `failed` (carrying `error`). **Capacity:** `maxMints` is a hard cap enforced atomically; under concurrent contention for the last slot the losing request deterministically gets `409 LIMIT_REACHED` (no over-mint). **Recovery:** a retry of an already-accepted claim (same `Idempotency-Key`) returns the same `claimId`; `409 ALREADY_CLAIMED` includes the existing `claimId` so the FE can resume polling. `409 NOT_LIKED` = the verified FID has not liked the target cast (a state precondition, not an authz failure). `422 WALLET_UNRESOLVED` = the social provider has no resolvable address for the FID.

### Me (authenticated user)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/v1/me` | JWT | — | `200 MeResponse` | 401, 500 |
| GET | `/v1/me/claims` | JWT | `?limit`, `?cursor` | `200 {items: ClaimSummary[], nextCursor}` | 401, 500 |
| GET | `/v1/me/trophies` | JWT | `?limit`, `?cursor` | `200 MyTrophiesResponse` | 401, 500 |

### Competitions (War of Influence, nested under a campaign)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/v1/campaigns/{id}/competitors` | JWT | `{castHash}` | `201 Competitor` | 401, 400 INVALID_BODY, 409 NO_NFT, 404 NOT_FOUND, 413, 415, 429, 500 |
| GET | `/v1/campaigns/{id}/competitors/me` | JWT | path `id` | `200 Competitor` | 401, 404 NOT_REGISTERED, 500 |
| POST | `/v1/campaigns/{id}/competitors/me/sync` | JWT | — | `200 SyncResult` | 401, 404 NOT_REGISTERED, 429, 502 EVOLUTION_FAILED, 502 UPSTREAM_UNAVAILABLE, 503, 500 |

`POST …/competitors` registers the authenticated user, tracking their own `castHash`. `409 NO_NFT` = user has not claimed an NFT for the campaign (state precondition). `castHash` must match the Farcaster hash format. `…/sync` pulls the current like count, **commits the score independently**, then attempts on-chain evolution; `SyncResult.onChainLevel`/`leveledUpTo` reflect the **confirmed** on-chain level. If the score commits but the on-chain evolve fails, the call returns `502 EVOLUTION_FAILED` (score persisted, level unchanged) — `evolved:true` is never returned for an unconfirmed level. (This is a known RPC verb on a resource — a deliberate REST-pragmatic exception; documented so a future reader does not "fix" it.)

### Aggregates

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/v1/dashboard` | — | — | `200 DashboardData` | 500, 503 |
| GET | `/v1/leaderboard` | — | `?limit`, `?cursor` | `200 {items: LeaderboardEntry[], nextCursor}` | 500, 503 |
| GET | `/v1/metrics` | JWT+ADM | — | `200 Metrics` | 401, 403 NOT_ALLOWED, 500 |

`/v1/leaderboard` is the **global, cross-campaign** ranking (replaces the old `/api/duels`) — it feeds the standalone `/duel` list screen and the home preview. `/v1/metrics` is **gated to admin** (FID in admin allowlist): business-intelligence aggregates are not public. `/v1/dashboard` stays public (cached + rate-limited).

### Ops

| Method | Path | Auth | Success |
|---|---|---|---|
| GET | `/healthz` | — | `200 {status:"ok"}` (liveness) |
| GET | `/readyz` | — | `200 {status:"ok"}` / `503` (checks DB + social provider reachability) |
| GET | `/openapi.json` | — | `200` the served OpenAPI document |

### Webhooks (internal)

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/v1/webhooks/neynar` | SIG | provider payload `{data:{fid, cast:{hash}}}` + signature & timestamp headers | `200 WebhookAck` | 401 INVALID_SIGNATURE, 400 INVALID_BODY, 429, 500 |

Webhook hardening (contract guarantees): (a) **fails closed** — missing/invalid signature → `401`, no action; (b) the signature MUST cover a provider **timestamp**; deliveries older than a short window are rejected `401` (replay protection); (c) processing is **idempotent per provider event id** (and, defensively, per `(campaignId, recipientAddress)` via reserve-before-mint) — duplicate deliveries return `200` with no side effect; (d) the minted recipient is derived from the **signed** payload only; (e) the webhook-driven mint path is throughput-capped per campaign and globally, and bounded by `maxMints`.

---

## 6. Out of scope (NOT in this contract)

- **NFT metadata** (`/metadata/[level]`) — served separately at the edge (static-ish JSON for OpenSea; reads on-chain level). Its own small spec later. The in-app reveal no longer depends on it: `ClaimStatus` carries `name`+`imageUrl`.
- **Farcaster Frame** (`/api/frame`) — HTML meta tags; stays in the frontend/edge.
- **The Go backend implementation** and **the Preact frontend implementation** — separate sub-projects.
- **Creator/admin allowlist storage**, **rate-limit backing store**, **idempotency store**, **the self-custody `FarcasterWriteProvider`, read caching, self-hosted indexer** — implementation details behind the contract; swappable without contract changes.

---

## 7. Error code catalog

Stable `error.code` values (HTTP status in parentheses). `403` is reserved for authorization only; business preconditions use `409`/`422`.

- `UNAUTHORIZED` (401) — missing/invalid/expired JWT, or wrong audience domain.
- `INVALID_SIGNATURE` (401) — webhook signature/timestamp check failed.
- `NOT_ALLOWED` (403) — authenticated but not permitted (creator/admin allowlist).
- `INVALID_BODY` (400) — schema validation failed; `error.details[]` lists offending fields.
- `NOT_FOUND` (404) — resource does not exist.
- `NOT_REGISTERED` (404) — user is not a competitor in this campaign.
- `NOT_LIKED` (409) — claim precondition: user has not liked the target cast.
- `NO_NFT` (409) — competition precondition: user holds no NFT for the campaign.
- `ALREADY_CLAIMED` (409) — duplicate claim; body includes the existing `claimId`.
- `LIMIT_REACHED` (409) — campaign `maxMints` exhausted (atomic hard cap).
- `WALLET_UNRESOLVED` (422) — no resolvable address for the authenticated FID.
- `RATE_LIMITED` (429) — rate limit exceeded; includes `Retry-After`.
- `PAYLOAD_TOO_LARGE` (413) — request body exceeds 16 KB.
- `UNSUPPORTED_MEDIA_TYPE` (415) — missing/wrong `Content-Type`.
- `CAST_PUBLISH_FAILED` (502) — Farcaster write failed during campaign creation (draft left inactive).
- `MINT_FAILED` (502) — on-chain mint failed/reverted (reservation rolled back; safe to retry). Surfaced via `ClaimStatus.status="failed"`.
- `MINT_TIMEOUT` (504) — on-chain mint not confirmed within bound. Surfaced via `ClaimStatus`.
- `EVOLUTION_FAILED` (502) — on-chain level-up failed after score commit (score persisted, level unchanged).
- `UPSTREAM_UNAVAILABLE` (502) — social provider (Neynar) error/timeout.
- `SERVICE_UNAVAILABLE` (503) — dependency (DB/provider) unavailable; retry with backoff.
- `INTERNAL` (500) — unexpected server error.

---

## 8. OpenAPI + codegen workflow

```
openapi.yaml  (single source of truth, OpenAPI 3.1)
   ├─→ oapi-codegen          → Go: request/response structs + server interface (chi or echo)
   └─→ openapi-typescript     → TS: types + typed fetch client for the Preact FE
```

- Encodes everything in §2–§7: named schemas (§4), paths (§5), the `ApiError` object, pagination params, the `Idempotency-Key`/`X-Request-Id` headers, caching/`304`, and security schemes.
- **Security schemes:** `bearerAuth` (HTTP bearer JWT) on JWT/JWT+AL/JWT+ADM endpoints; a documented header scheme for the webhook signature+timestamp. Allowlist requirements (which OpenAPI cannot express natively) are documented on the relevant endpoints and surfaced as `403 NOT_ALLOWED`.
- **Nullable** uses `nullable: true` (the document targets **OpenAPI 3.0.3**, not 3.1 — `oapi-codegen` does not yet fully support 3.1 nullable forms; 3.0.3 is semantically equivalent and works with both codegens). **No anonymous nested object schemas** — every sub-object is a named component (`TrophyStats`, `ClaimError`, `ApiError`, …).
- The running API serves the document at `GET /openapi.json` (optional Redoc/Swagger UI).
- Both codegen steps run in CI; a contract change that breaks either side fails the build, keeping FE/BE in lockstep.

---

## 9. Acceptance criteria for the contract sub-project

1. A complete `openapi.yaml` (3.1) covering every endpoint in §5 with full request/response/error schemas from §4 and §7.
2. Validates against an OpenAPI 3.1 linter (e.g. `spectral`) with no errors.
3. `oapi-codegen` and `openapi-typescript` both produce compiling output.
4. Every entity in §4 and every error code in §7 is represented; **no anonymous nested object schemas**; nullable uses the 3.1 form.
5. No snake_case fields remain. **No endpoint declares a `fid` parameter** (all per-user identity is from the JWT).
6. All per-user reads require `bearerAuth`; `POST /v1/campaigns` documents `403 NOT_ALLOWED` + `429`; `/v1/metrics` requires admin.
7. Collection endpoints declare `?limit`/`?cursor` and return `{items, nextCursor}`.
8. `POST /v1/claims` is `202` + `ClaimStatus` polling; capacity is an atomic hard cap; `Idempotency-Key` is declared on both expensive POSTs.
9. `maxMints` carries `min 1, max 10000`; `nftImageUrl`/`castHash` carry format constraints; the global body-size cap maps to `413`.
10. CORS allowlist, caching directives, `healthz`/`readyz`, and the webhook replay/idempotency guarantees are documented.

---

## 10. Deferred (post-freeze follow-ups, non-blocking)

Minor items that can be added to `openapi.yaml` later without re-deciding anything: per-endpoint `max-age` tuning, optional Redoc UI, `score`→`likeCount` rename decision, opaque-ID enumeration resistance, and the precondition-code enumeration-oracle note.
