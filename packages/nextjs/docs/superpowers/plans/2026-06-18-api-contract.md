# SocialDrop API Contract (openapi.yaml) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the complete, lint-clean, dual-codegen `openapi.yaml` (OpenAPI 3.1) that encodes the SocialDrop v1 API contract from `docs/superpowers/specs/2026-06-18-api-contract-design.md`.

**Architecture:** A self-contained `packages/api-contract/` package. The contract is authored as small multi-file YAML under `src/` and bundled into a single `openapi.yaml` with `@redocly/cli`. Quality gates: `spectral` lint, `openapi-typescript` (TS types for the Preact FE), `oapi-codegen` (Go types + chi server interface for the Go BE), and Node coverage tests that assert the spec's §9 acceptance criteria (no `fid` params, no snake_case, every error code present, `maxMints` bounds, async claims, etc.). The package is relocatable to the private Go BE repo or a dedicated repo later.

**Tech Stack:** OpenAPI 3.1, `@redocly/cli` (bundle), `@stoplight/spectral-cli` (lint), `openapi-typescript` (TS), `oapi-codegen` (Go), Node `node:test` + `yaml` (coverage tests), Go toolchain (codegen compile check), GitHub Actions (CI).

**Reference:** All field shapes, endpoints, and error codes come from the spec `docs/superpowers/specs/2026-06-18-api-contract-design.md` (§2 conventions, §4 entities, §5 endpoints, §7 errors, §9 acceptance). When this plan shows YAML, it is the authoritative content — copy it verbatim.

---

## File Structure

```
packages/api-contract/
  package.json                      # scripts: bundle, lint, gen:ts, gen:go, test, validate
  .spectral.yaml                    # spectral ruleset (extends spectral:oas + custom rules)
  redocly.yaml                      # redocly bundle config
  oapi-codegen.yaml                 # oapi-codegen config (types + chi-server)
  tsconfig.json                     # for compiling the generated TS types
  go.mod                            # module for the generated Go package compile check
  src/
    openapi.root.yaml               # info, servers, security, tags, $ref to paths
    components/
      parameters.yaml               # limit, cursor, campaignId, claimId
      headers.yaml                  # Idempotency-Key, X-Request-Id, Retry-After
      securitySchemes.yaml          # bearerAuth, webhookSignature
      responses.yaml                # shared error responses (4xx/5xx) + 304
      schemas.yaml                  # all named entity + error schemas (§4, §7)
    paths/
      campaigns.yaml                # GET/POST /v1/campaigns, /{id}, /{id}/leaderboard, /{id}/arena
      claims.yaml                   # POST /v1/claims, GET /v1/claims/{claimId}
      me.yaml                       # GET /v1/me, /me/claims, /me/trophies
      competitions.yaml             # /v1/campaigns/{id}/competitors[...]
      aggregates.yaml               # /v1/dashboard, /v1/leaderboard, /v1/metrics
      ops.yaml                      # /healthz, /readyz, /openapi.json
      webhooks.yaml                 # POST /v1/webhooks/neynar
  openapi.yaml                      # BUNDLED output (committed; the single source consumed by codegen)
  gen/
    ts/types.ts                     # generated TS (output, gitignored)
    go/api/server.gen.go            # generated Go (output, gitignored)
  test/
    coverage.test.mjs               # asserts §9 acceptance criteria against bundled openapi.yaml
```

Each `src/paths/*.yaml` owns one resource group; `src/components/schemas.yaml` owns all named schemas. Files that change together (a resource's paths) live together. The bundled `openapi.yaml` is committed so consumers without the build tooling can still read one file.

**Working directory for all commands:** `packages/api-contract/` unless stated otherwise.

---

## Task 1: Scaffold the package and tooling

**Files:**
- Create: `packages/api-contract/package.json`
- Create: `packages/api-contract/.spectral.yaml`
- Create: `packages/api-contract/redocly.yaml`
- Create: `packages/api-contract/.gitignore`

- [ ] **Step 1: Create `package.json` with the toolchain and scripts**

```json
{
  "name": "@socialdrop/api-contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "bundle": "redocly bundle src/openapi.root.yaml -o openapi.yaml",
    "lint": "spectral lint openapi.yaml --ruleset .spectral.yaml",
    "gen:ts": "openapi-typescript openapi.yaml -o gen/ts/types.ts",
    "gen:go": "oapi-codegen -config oapi-codegen.yaml openapi.yaml",
    "test": "node --test test/",
    "validate": "npm run bundle && npm run lint && npm run test"
  },
  "devDependencies": {
    "@redocly/cli": "^1.25.0",
    "@stoplight/spectral-cli": "^6.13.0",
    "openapi-typescript": "^7.4.0",
    "yaml": "^2.5.0"
  }
}
```

- [ ] **Step 2: Create `.spectral.yaml` (lint ruleset)**

```yaml
extends: ["spectral:oas"]
rules:
  oas3-api-servers: error
  operation-operationId: error
  operation-operationId-unique: error
  operation-tag-defined: error
  operation-success-response: error
  no-$ref-siblings: error
  oas3-unused-component: warn
  info-contact: off
  info-license: off
```

- [ ] **Step 3: Create `redocly.yaml` (bundle config)**

```yaml
apis:
  socialdrop@v1:
    root: src/openapi.root.yaml
rules:
  no-unresolved-refs: error
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules/
gen/
```

- [ ] **Step 5: Install dependencies**

Run: `cd packages/api-contract && npm install`
Expected: dependencies install; `node_modules/.bin/redocly`, `spectral`, `openapi-typescript` exist.

- [ ] **Step 6: Commit**

```bash
git add packages/api-contract/package.json packages/api-contract/.spectral.yaml packages/api-contract/redocly.yaml packages/api-contract/.gitignore packages/api-contract/package-lock.json
git commit -m "chore(api-contract): scaffold contract package and tooling"
```

---

## Task 2: Root document, parameters, headers, security schemes

**Files:**
- Create: `packages/api-contract/src/openapi.root.yaml`
- Create: `packages/api-contract/src/components/parameters.yaml`
- Create: `packages/api-contract/src/components/headers.yaml`
- Create: `packages/api-contract/src/components/securitySchemes.yaml`

- [ ] **Step 1: Create `src/openapi.root.yaml`**

```yaml
openapi: 3.1.0
info:
  title: SocialDrop API
  version: "1.0.0"
  description: >
    SocialDrop v1 HTTP API. Identity is a Farcaster Quick Auth JWT verified against
    domain socialdrop.live; the FID always comes from the token. See the design spec
    docs/superpowers/specs/2026-06-18-api-contract-design.md.
servers:
  - url: https://api.socialdrop.live
tags:
  - name: campaigns
  - name: claims
  - name: me
  - name: competitions
  - name: aggregates
  - name: ops
  - name: webhooks
security:
  - bearerAuth: []
paths:
  $ref: "./paths/_index.yaml"
components:
  securitySchemes:
    $ref: "./components/securitySchemes.yaml"
  parameters:
    $ref: "./components/parameters.yaml"
  headers:
    $ref: "./components/headers.yaml"
  responses:
    $ref: "./components/responses.yaml"
  schemas:
    $ref: "./components/schemas.yaml"
```

Note: redocly resolves `$ref` to whole files. The `paths` map is assembled in Task 9 Step "index"; for now create a stub `src/paths/_index.yaml` with `{}` so the bundle resolves.

- [ ] **Step 2: Create `src/paths/_index.yaml` stub**

```yaml
{}
```

- [ ] **Step 3: Create `src/components/securitySchemes.yaml`**

```yaml
bearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
  description: Farcaster Quick Auth JWT, verified against domain socialdrop.live.
webhookSignature:
  type: apiKey
  in: header
  name: x-neynar-signature
  description: HMAC signature over the raw body; paired with a provider timestamp header for replay protection.
```

- [ ] **Step 4: Create `src/components/parameters.yaml`**

```yaml
Limit:
  name: limit
  in: query
  required: false
  schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
Cursor:
  name: cursor
  in: query
  required: false
  schema: { type: string }
  description: Opaque pagination cursor; null nextCursor means no more pages.
CampaignId:
  name: id
  in: path
  required: true
  schema: { type: integer, minimum: 1 }
ClaimId:
  name: claimId
  in: path
  required: true
  schema: { type: string }
ActiveFilter:
  name: active
  in: query
  required: false
  schema: { type: boolean }
```

- [ ] **Step 5: Create `src/components/headers.yaml`**

```yaml
IdempotencyKey:
  description: Client-generated UUID; replays the first outcome on retry.
  schema: { type: string }
XRequestId:
  description: Server-generated request id, echoed for correlation with logs.
  schema: { type: string }
RetryAfter:
  description: Seconds to wait before retrying.
  schema: { type: integer }
ETag:
  description: Entity tag for conditional requests.
  schema: { type: string }
```

- [ ] **Step 6: Bundle to verify it resolves (will fail until schemas/responses exist — expected)**

Run: `npm run bundle`
Expected: FAIL with an unresolved `$ref` to `./components/schemas.yaml` / `./components/responses.yaml` (those files come in Tasks 3–4). This confirms the root wiring is correct and the missing pieces are exactly the next tasks.

- [ ] **Step 7: Commit**

```bash
git add packages/api-contract/src/openapi.root.yaml packages/api-contract/src/paths/_index.yaml packages/api-contract/src/components/securitySchemes.yaml packages/api-contract/src/components/parameters.yaml packages/api-contract/src/components/headers.yaml
git commit -m "feat(api-contract): root document, params, headers, security schemes"
```

---

## Task 3: Entity & error schemas (§4, §7)

**Files:**
- Create: `packages/api-contract/src/components/schemas.yaml`

- [ ] **Step 1: Create `src/components/schemas.yaml` with every named schema**

```yaml
Campaign:
  type: object
  required: [id, name, imageUrl, maxMints, mintedCount, isActive, creatorFid, createdAt]
  properties:
    id: { type: integer }
    name: { type: string, maxLength: 120 }
    imageUrl: { type: [string, "null"] }
    maxMints: { type: integer, minimum: 1, maximum: 10000 }
    mintedCount: { type: integer, minimum: 0 }
    isActive: { type: boolean }
    creatorFid: { type: [integer, "null"] }
    createdAt: { type: string, format: date-time }
TrophyStats:
  type: object
  required: [trophies, totalLikes, bestLevel]
  properties:
    trophies: { type: integer }
    totalLikes: { type: integer }
    bestLevel: { type: integer }
Trophy:
  type: object
  required: [id, campaignName, level, levelName, imageUrl]
  properties:
    id: { type: integer }
    campaignName: { type: string }
    level: { type: integer, minimum: 1, maximum: 4 }
    levelName: { type: string }
    imageUrl: { type: string }
MyTrophiesResponse:
  type: object
  required: [stats, items]
  properties:
    stats: { $ref: "#/components/schemas/TrophyStats" }
    items: { type: array, items: { $ref: "#/components/schemas/Trophy" } }
LeaderboardEntry:
  type: object
  required: [campaignId, campaignName, fid, username, pfpUrl, score, level]
  properties:
    campaignId: { type: integer }
    campaignName: { type: string }
    fid: { type: integer }
    username: { type: string }
    pfpUrl: { type: string }
    score: { type: integer }
    level: { type: integer, minimum: 1, maximum: 4 }
LeaderboardPage:
  type: object
  required: [items, nextCursor]
  properties:
    items: { type: array, items: { $ref: "#/components/schemas/LeaderboardEntry" } }
    nextCursor: { type: [string, "null"] }
CampaignPage:
  type: object
  required: [items, nextCursor]
  properties:
    items: { type: array, items: { $ref: "#/components/schemas/Campaign" } }
    nextCursor: { type: [string, "null"] }
DashboardData:
  type: object
  required: [trendingCampaigns, featuredRankings]
  properties:
    trendingCampaigns: { type: array, items: { $ref: "#/components/schemas/Campaign" } }
    featuredRankings: { type: array, items: { $ref: "#/components/schemas/LeaderboardEntry" } }
Competitor:
  type: object
  required: [campaignId, fid, tokenId, score, level, levelName, imageUrl, trackedCastHash]
  properties:
    campaignId: { type: integer }
    fid: { type: integer }
    tokenId: { type: integer }
    score: { type: integer }
    level: { type: integer, minimum: 1, maximum: 4 }
    levelName: { type: string }
    imageUrl: { type: string }
    trackedCastHash: { type: string }
SyncResult:
  type: object
  required: [score, onChainLevel, evolved, leveledUpTo]
  properties:
    score: { type: integer }
    onChainLevel: { type: integer, minimum: 1, maximum: 4 }
    evolved: { type: boolean }
    leveledUpTo: { type: [integer, "null"] }
ClaimError:
  type: object
  required: [code, message]
  properties:
    code: { type: string }
    message: { type: string }
ClaimStatus:
  type: object
  required: [claimId, status, tokenId, transactionHash, level, name, imageUrl, error]
  properties:
    claimId: { type: string }
    status: { type: string, enum: [pending, minted, failed] }
    tokenId: { type: [integer, "null"] }
    transactionHash: { type: [string, "null"] }
    level: { type: [integer, "null"] }
    name: { type: [string, "null"] }
    imageUrl: { type: [string, "null"] }
    error:
      oneOf:
        - { $ref: "#/components/schemas/ClaimError" }
        - { type: "null" }
ClaimAccepted:
  type: object
  required: [claimId, status]
  properties:
    claimId: { type: string }
    status: { type: string, enum: [pending] }
ClaimSummary:
  type: object
  required: [id, name]
  properties:
    id: { type: integer }
    name: { type: string }
ClaimSummaryPage:
  type: object
  required: [items, nextCursor]
  properties:
    items: { type: array, items: { $ref: "#/components/schemas/ClaimSummary" } }
    nextCursor: { type: [string, "null"] }
ArenaView:
  type: object
  required: [campaign, leaderboard, me]
  properties:
    campaign: { $ref: "#/components/schemas/Campaign" }
    leaderboard: { type: array, items: { $ref: "#/components/schemas/LeaderboardEntry" } }
    me:
      oneOf:
        - { $ref: "#/components/schemas/Competitor" }
        - { type: "null" }
Metrics:
  type: object
  required: [totalCampaigns, activeCampaigns, totalMints, uniqueParticipants, registeredCompetitors]
  properties:
    totalCampaigns: { type: integer }
    activeCampaigns: { type: integer }
    totalMints: { type: integer }
    uniqueParticipants: { type: integer }
    registeredCompetitors: { type: integer }
MeResponse:
  type: object
  required: [fid]
  properties:
    fid: { type: integer }
WebhookAck:
  type: object
  required: [message]
  properties:
    message: { type: string }
HealthStatus:
  type: object
  required: [status]
  properties:
    status: { type: string, enum: [ok] }
CreateCampaignRequest:
  type: object
  required: [name, castContent, maxMints, nftImageUrl]
  properties:
    name: { type: string, minLength: 1, maxLength: 120 }
    castContent: { type: string, minLength: 1, maxLength: 320 }
    maxMints: { type: integer, minimum: 1, maximum: 10000 }
    nftImageUrl: { type: string, pattern: "^(https://|ipfs://).+" }
CreateClaimRequest:
  type: object
  required: [campaignId]
  properties:
    campaignId: { type: integer, minimum: 1 }
RegisterCompetitorRequest:
  type: object
  required: [castHash]
  properties:
    castHash: { type: string, pattern: "^0x[0-9a-fA-F]+$" }
ApiErrorDetail:
  type: object
  required: [field, issue]
  properties:
    field: { type: string }
    issue: { type: string }
ApiError:
  type: object
  required: [error]
  properties:
    error:
      type: object
      required: [code, message, requestId, details]
      properties:
        code: { type: string }
        message: { type: string }
        requestId: { type: string }
        details:
          oneOf:
            - { type: array, items: { $ref: "#/components/schemas/ApiErrorDetail" } }
            - { type: "null" }
AlreadyClaimedError:
  description: ApiError whose error.code is ALREADY_CLAIMED; message-level note that claimId is embedded in the human message for resume.
  allOf:
    - { $ref: "#/components/schemas/ApiError" }
```

- [ ] **Step 2: Bundle to verify schemas resolve**

Run: `npm run bundle`
Expected: FAIL only on the still-missing `./components/responses.yaml` `$ref` (Task 4). No schema errors.

- [ ] **Step 3: Commit**

```bash
git add packages/api-contract/src/components/schemas.yaml
git commit -m "feat(api-contract): entity and error schemas (spec §4, §7)"
```

---

## Task 4: Shared error responses

**Files:**
- Create: `packages/api-contract/src/components/responses.yaml`

- [ ] **Step 1: Create `src/components/responses.yaml`**

```yaml
Unauthorized:
  description: UNAUTHORIZED — missing/invalid/expired JWT or wrong audience.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
NotAllowed:
  description: NOT_ALLOWED — authenticated but not permitted (allowlist).
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
InvalidBody:
  description: INVALID_BODY — schema validation failed; error.details lists fields.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
NotFound:
  description: NOT_FOUND.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
NotRegistered:
  description: NOT_REGISTERED — user is not a competitor in this campaign.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
InvalidSignature:
  description: INVALID_SIGNATURE — webhook signature/timestamp check failed.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
Conflict:
  description: 409 — NOT_LIKED / NO_NFT / ALREADY_CLAIMED / LIMIT_REACHED (branch on error.code).
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
Unprocessable:
  description: 422 — WALLET_UNRESOLVED.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
PayloadTooLarge:
  description: PAYLOAD_TOO_LARGE — body exceeds 16 KB.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
UnsupportedMediaType:
  description: UNSUPPORTED_MEDIA_TYPE — missing/wrong Content-Type.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
RateLimited:
  description: RATE_LIMITED.
  headers:
    Retry-After: { $ref: "#/components/headers/RetryAfter" }
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
BadGateway:
  description: 502 — CAST_PUBLISH_FAILED / MINT_FAILED / EVOLUTION_FAILED / UPSTREAM_UNAVAILABLE.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
GatewayTimeout:
  description: MINT_TIMEOUT.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
ServiceUnavailable:
  description: SERVICE_UNAVAILABLE — dependency unavailable; retry with backoff.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
Internal:
  description: INTERNAL.
  content: { application/json: { schema: { $ref: "#/components/schemas/ApiError" } } }
```

- [ ] **Step 2: Bundle — root + components now fully resolve (paths still `{}`)**

Run: `npm run bundle`
Expected: PASS — `openapi.yaml` is written. (Spectral will warn about empty paths until Tasks 5–9; that is fine for now.)

- [ ] **Step 3: Commit**

```bash
git add packages/api-contract/src/components/responses.yaml packages/api-contract/openapi.yaml
git commit -m "feat(api-contract): shared error responses"
```

---

## Task 5: Campaigns paths

**Files:**
- Create: `packages/api-contract/src/paths/campaigns.yaml`
- Modify: `packages/api-contract/src/paths/_index.yaml`

- [ ] **Step 1: Create `src/paths/campaigns.yaml`**

```yaml
"/v1/campaigns":
  get:
    operationId: listCampaigns
    tags: [campaigns]
    security: []
    parameters:
      - { $ref: "#/components/parameters/ActiveFilter" }
      - { $ref: "#/components/parameters/Limit" }
      - { $ref: "#/components/parameters/Cursor" }
    responses:
      "200":
        description: Campaign page.
        headers: { ETag: { $ref: "#/components/headers/ETag" } }
        content: { application/json: { schema: { $ref: "#/components/schemas/CampaignPage" } } }
      "500": { $ref: "#/components/responses/Internal" }
  post:
    operationId: createCampaign
    tags: [campaigns]
    parameters:
      - name: Idempotency-Key
        in: header
        required: false
        schema: { type: string }
    requestBody:
      required: true
      content: { application/json: { schema: { $ref: "#/components/schemas/CreateCampaignRequest" } } }
    responses:
      "201":
        description: Created campaign (allowlist-gated).
        content: { application/json: { schema: { $ref: "#/components/schemas/Campaign" } } }
      "400": { $ref: "#/components/responses/InvalidBody" }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "403": { $ref: "#/components/responses/NotAllowed" }
      "413": { $ref: "#/components/responses/PayloadTooLarge" }
      "415": { $ref: "#/components/responses/UnsupportedMediaType" }
      "429": { $ref: "#/components/responses/RateLimited" }
      "502": { $ref: "#/components/responses/BadGateway" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/campaigns/{id}":
  get:
    operationId: getCampaign
    tags: [campaigns]
    security: []
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
    responses:
      "200":
        description: Campaign.
        headers: { ETag: { $ref: "#/components/headers/ETag" } }
        content: { application/json: { schema: { $ref: "#/components/schemas/Campaign" } } }
      "404": { $ref: "#/components/responses/NotFound" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/campaigns/{id}/leaderboard":
  get:
    operationId: getCampaignLeaderboard
    tags: [campaigns]
    security: []
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
      - { $ref: "#/components/parameters/Limit" }
      - { $ref: "#/components/parameters/Cursor" }
    responses:
      "200":
        description: Per-campaign leaderboard page.
        content: { application/json: { schema: { $ref: "#/components/schemas/LeaderboardPage" } } }
      "404": { $ref: "#/components/responses/NotFound" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/campaigns/{id}/arena":
  get:
    operationId: getCampaignArena
    tags: [campaigns]
    security: []
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
    responses:
      "200":
        description: Aggregate for the Arena screen (campaign + leaderboard + me).
        content: { application/json: { schema: { $ref: "#/components/schemas/ArenaView" } } }
      "404": { $ref: "#/components/responses/NotFound" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 2: Replace `src/paths/_index.yaml` to include campaigns**

```yaml
"/v1/campaigns": { $ref: "./campaigns.yaml#/~1v1~1campaigns" }
"/v1/campaigns/{id}": { $ref: "./campaigns.yaml#/~1v1~1campaigns~1{id}" }
"/v1/campaigns/{id}/leaderboard": { $ref: "./campaigns.yaml#/~1v1~1campaigns~1{id}~1leaderboard" }
"/v1/campaigns/{id}/arena": { $ref: "./campaigns.yaml#/~1v1~1campaigns~1{id}~1arena" }
```

(JSON-Pointer escaping: `/`→`~1`. Each entry points at the path object inside `campaigns.yaml`.)

- [ ] **Step 3: Bundle and lint**

Run: `npm run bundle && npm run lint`
Expected: PASS — campaigns operations are valid, unique operationIds, tags defined.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contract/src/paths/campaigns.yaml packages/api-contract/src/paths/_index.yaml packages/api-contract/openapi.yaml
git commit -m "feat(api-contract): campaigns endpoints"
```

---

## Task 6: Claims paths (async mint + polling)

**Files:**
- Create: `packages/api-contract/src/paths/claims.yaml`
- Modify: `packages/api-contract/src/paths/_index.yaml`

- [ ] **Step 1: Create `src/paths/claims.yaml`**

```yaml
"/v1/claims":
  post:
    operationId: createClaim
    tags: [claims]
    parameters:
      - name: Idempotency-Key
        in: header
        required: false
        schema: { type: string }
    requestBody:
      required: true
      content: { application/json: { schema: { $ref: "#/components/schemas/CreateClaimRequest" } } }
    responses:
      "202":
        description: Claim accepted; mint runs asynchronously. Poll GET /v1/claims/{claimId}.
        content: { application/json: { schema: { $ref: "#/components/schemas/ClaimAccepted" } } }
      "400": { $ref: "#/components/responses/InvalidBody" }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "409": { $ref: "#/components/responses/Conflict" }
      "422": { $ref: "#/components/responses/Unprocessable" }
      "413": { $ref: "#/components/responses/PayloadTooLarge" }
      "415": { $ref: "#/components/responses/UnsupportedMediaType" }
      "429": { $ref: "#/components/responses/RateLimited" }
      "502": { $ref: "#/components/responses/BadGateway" }
      "503": { $ref: "#/components/responses/ServiceUnavailable" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/claims/{claimId}":
  get:
    operationId: getClaimStatus
    tags: [claims]
    parameters:
      - { $ref: "#/components/parameters/ClaimId" }
    responses:
      "200":
        description: Claim status (pending/minted/failed). When minted, carries tokenId, transactionHash, level, name, imageUrl.
        content: { application/json: { schema: { $ref: "#/components/schemas/ClaimStatus" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "404": { $ref: "#/components/responses/NotFound" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 2: Add to `src/paths/_index.yaml` (append these two entries)**

```yaml
"/v1/claims": { $ref: "./claims.yaml#/~1v1~1claims" }
"/v1/claims/{claimId}": { $ref: "./claims.yaml#/~1v1~1claims~1{claimId}" }
```

- [ ] **Step 3: Bundle and lint**

Run: `npm run bundle && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contract/src/paths/claims.yaml packages/api-contract/src/paths/_index.yaml packages/api-contract/openapi.yaml
git commit -m "feat(api-contract): async claims endpoints"
```

---

## Task 7: Me and Competitions paths

**Files:**
- Create: `packages/api-contract/src/paths/me.yaml`
- Create: `packages/api-contract/src/paths/competitions.yaml`
- Modify: `packages/api-contract/src/paths/_index.yaml`

- [ ] **Step 1: Create `src/paths/me.yaml`**

```yaml
"/v1/me":
  get:
    operationId: getMe
    tags: [me]
    responses:
      "200":
        description: Authenticated FID.
        content: { application/json: { schema: { $ref: "#/components/schemas/MeResponse" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/me/claims":
  get:
    operationId: listMyClaims
    tags: [me]
    parameters:
      - { $ref: "#/components/parameters/Limit" }
      - { $ref: "#/components/parameters/Cursor" }
    responses:
      "200":
        description: Eligible campaigns page.
        content: { application/json: { schema: { $ref: "#/components/schemas/ClaimSummaryPage" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/me/trophies":
  get:
    operationId: listMyTrophies
    tags: [me]
    parameters:
      - { $ref: "#/components/parameters/Limit" }
      - { $ref: "#/components/parameters/Cursor" }
    responses:
      "200":
        description: Trophy stats + items.
        content: { application/json: { schema: { $ref: "#/components/schemas/MyTrophiesResponse" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 2: Create `src/paths/competitions.yaml`**

```yaml
"/v1/campaigns/{id}/competitors":
  post:
    operationId: registerCompetitor
    tags: [competitions]
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
    requestBody:
      required: true
      content: { application/json: { schema: { $ref: "#/components/schemas/RegisterCompetitorRequest" } } }
    responses:
      "201":
        description: Registered competitor.
        content: { application/json: { schema: { $ref: "#/components/schemas/Competitor" } } }
      "400": { $ref: "#/components/responses/InvalidBody" }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "404": { $ref: "#/components/responses/NotFound" }
      "409": { $ref: "#/components/responses/Conflict" }
      "413": { $ref: "#/components/responses/PayloadTooLarge" }
      "415": { $ref: "#/components/responses/UnsupportedMediaType" }
      "429": { $ref: "#/components/responses/RateLimited" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/campaigns/{id}/competitors/me":
  get:
    operationId: getMyCompetitor
    tags: [competitions]
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
    responses:
      "200":
        description: The caller's competitor record.
        content: { application/json: { schema: { $ref: "#/components/schemas/Competitor" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "404": { $ref: "#/components/responses/NotRegistered" }
      "500": { $ref: "#/components/responses/Internal" }
"/v1/campaigns/{id}/competitors/me/sync":
  post:
    operationId: syncMyCompetitor
    tags: [competitions]
    parameters:
      - { $ref: "#/components/parameters/CampaignId" }
    responses:
      "200":
        description: Recomputed score + confirmed on-chain level.
        content: { application/json: { schema: { $ref: "#/components/schemas/SyncResult" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "404": { $ref: "#/components/responses/NotRegistered" }
      "429": { $ref: "#/components/responses/RateLimited" }
      "502": { $ref: "#/components/responses/BadGateway" }
      "503": { $ref: "#/components/responses/ServiceUnavailable" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 3: Append to `src/paths/_index.yaml`**

```yaml
"/v1/me": { $ref: "./me.yaml#/~1v1~1me" }
"/v1/me/claims": { $ref: "./me.yaml#/~1v1~1me~1claims" }
"/v1/me/trophies": { $ref: "./me.yaml#/~1v1~1me~1trophies" }
"/v1/campaigns/{id}/competitors": { $ref: "./competitions.yaml#/~1v1~1campaigns~1{id}~1competitors" }
"/v1/campaigns/{id}/competitors/me": { $ref: "./competitions.yaml#/~1v1~1campaigns~1{id}~1competitors~1me" }
"/v1/campaigns/{id}/competitors/me/sync": { $ref: "./competitions.yaml#/~1v1~1campaigns~1{id}~1competitors~1me~1sync" }
```

- [ ] **Step 4: Bundle and lint**

Run: `npm run bundle && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contract/src/paths/me.yaml packages/api-contract/src/paths/competitions.yaml packages/api-contract/src/paths/_index.yaml packages/api-contract/openapi.yaml
git commit -m "feat(api-contract): me and competitions endpoints"
```

---

## Task 8: Aggregates, Ops, and Webhooks paths

**Files:**
- Create: `packages/api-contract/src/paths/aggregates.yaml`
- Create: `packages/api-contract/src/paths/ops.yaml`
- Create: `packages/api-contract/src/paths/webhooks.yaml`
- Modify: `packages/api-contract/src/paths/_index.yaml`

- [ ] **Step 1: Create `src/paths/aggregates.yaml`**

```yaml
"/v1/dashboard":
  get:
    operationId: getDashboard
    tags: [aggregates]
    security: []
    responses:
      "200":
        description: Home aggregate.
        headers: { ETag: { $ref: "#/components/headers/ETag" } }
        content: { application/json: { schema: { $ref: "#/components/schemas/DashboardData" } } }
      "500": { $ref: "#/components/responses/Internal" }
      "503": { $ref: "#/components/responses/ServiceUnavailable" }
"/v1/leaderboard":
  get:
    operationId: getGlobalLeaderboard
    tags: [aggregates]
    security: []
    parameters:
      - { $ref: "#/components/parameters/Limit" }
      - { $ref: "#/components/parameters/Cursor" }
    responses:
      "200":
        description: Global cross-campaign ranking page.
        headers: { ETag: { $ref: "#/components/headers/ETag" } }
        content: { application/json: { schema: { $ref: "#/components/schemas/LeaderboardPage" } } }
      "500": { $ref: "#/components/responses/Internal" }
      "503": { $ref: "#/components/responses/ServiceUnavailable" }
"/v1/metrics":
  get:
    operationId: getMetrics
    tags: [aggregates]
    responses:
      "200":
        description: Admin-only business metrics.
        content: { application/json: { schema: { $ref: "#/components/schemas/Metrics" } } }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "403": { $ref: "#/components/responses/NotAllowed" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 2: Create `src/paths/ops.yaml`**

```yaml
"/healthz":
  get:
    operationId: getHealth
    tags: [ops]
    security: []
    responses:
      "200":
        description: Liveness.
        content: { application/json: { schema: { $ref: "#/components/schemas/HealthStatus" } } }
"/readyz":
  get:
    operationId: getReadiness
    tags: [ops]
    security: []
    responses:
      "200":
        description: Ready.
        content: { application/json: { schema: { $ref: "#/components/schemas/HealthStatus" } } }
      "503": { $ref: "#/components/responses/ServiceUnavailable" }
"/openapi.json":
  get:
    operationId: getOpenapi
    tags: [ops]
    security: []
    responses:
      "200":
        description: The served OpenAPI document.
        content: { application/json: { schema: { type: object, additionalProperties: true } } }
```

- [ ] **Step 3: Create `src/paths/webhooks.yaml`**

```yaml
"/v1/webhooks/neynar":
  post:
    operationId: neynarWebhook
    tags: [webhooks]
    security:
      - webhookSignature: []
    description: >
      Fails closed on missing/invalid signature. Signature MUST cover a provider timestamp
      (replay protection). Processing is idempotent per provider event id; the minted
      recipient derives from the signed payload only; the mint path is throughput-capped.
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [data]
            properties:
              data:
                type: object
                required: [fid, cast]
                properties:
                  fid: { type: integer }
                  cast:
                    type: object
                    required: [hash]
                    properties:
                      hash: { type: string }
    responses:
      "200":
        description: Acknowledged.
        content: { application/json: { schema: { $ref: "#/components/schemas/WebhookAck" } } }
      "400": { $ref: "#/components/responses/InvalidBody" }
      "401": { $ref: "#/components/responses/InvalidSignature" }
      "429": { $ref: "#/components/responses/RateLimited" }
      "500": { $ref: "#/components/responses/Internal" }
```

- [ ] **Step 4: Append to `src/paths/_index.yaml`**

```yaml
"/v1/dashboard": { $ref: "./aggregates.yaml#/~1v1~1dashboard" }
"/v1/leaderboard": { $ref: "./aggregates.yaml#/~1v1~1leaderboard" }
"/v1/metrics": { $ref: "./aggregates.yaml#/~1v1~1metrics" }
"/healthz": { $ref: "./ops.yaml#/~1healthz" }
"/readyz": { $ref: "./ops.yaml#/~1readyz" }
"/openapi.json": { $ref: "./ops.yaml#/~1openapi.json" }
"/v1/webhooks/neynar": { $ref: "./webhooks.yaml#/~1v1~1webhooks~1neynar" }
```

- [ ] **Step 5: Bundle and lint — full surface now present**

Run: `npm run bundle && npm run lint`
Expected: PASS with no errors (the empty-paths warning is gone).

- [ ] **Step 6: Commit**

```bash
git add packages/api-contract/src/paths/aggregates.yaml packages/api-contract/src/paths/ops.yaml packages/api-contract/src/paths/webhooks.yaml packages/api-contract/src/paths/_index.yaml packages/api-contract/openapi.yaml
git commit -m "feat(api-contract): aggregates, ops, and webhook endpoints"
```

---

## Task 9: Coverage tests (assert spec §9 acceptance criteria)

**Files:**
- Create: `packages/api-contract/test/coverage.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const doc = parse(readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8"));
const paths = doc.paths ?? {};
const schemas = doc.components?.schemas ?? {};
const raw = readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8");

test("OpenAPI is 3.1", () => {
  assert.equal(doc.openapi, "3.1.0");
});

test("every required endpoint is present", () => {
  const required = [
    "/v1/campaigns", "/v1/campaigns/{id}", "/v1/campaigns/{id}/leaderboard", "/v1/campaigns/{id}/arena",
    "/v1/claims", "/v1/claims/{claimId}",
    "/v1/me", "/v1/me/claims", "/v1/me/trophies",
    "/v1/campaigns/{id}/competitors", "/v1/campaigns/{id}/competitors/me", "/v1/campaigns/{id}/competitors/me/sync",
    "/v1/dashboard", "/v1/leaderboard", "/v1/metrics",
    "/healthz", "/readyz", "/openapi.json",
    "/v1/webhooks/neynar",
  ];
  for (const p of required) assert.ok(paths[p], `missing path ${p}`);
});

test("no endpoint declares a fid parameter (identity is from JWT)", () => {
  for (const [p, ops] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const params = op.parameters ?? [];
      for (const param of params) {
        assert.notEqual(param.name, "fid", `${method.toUpperCase()} ${p} declares a fid param`);
      }
    }
  }
});

test("no snake_case property names in schemas", () => {
  const walk = (obj) => {
    if (obj && typeof obj === "object") {
      if (obj.properties) {
        for (const key of Object.keys(obj.properties)) {
          assert.ok(!key.includes("_"), `snake_case property: ${key}`);
        }
      }
      for (const v of Object.values(obj)) walk(v);
    }
  };
  walk(schemas);
});

test("claims POST is async (202 + ClaimAccepted)", () => {
  const post = paths["/v1/claims"].post;
  assert.ok(post.responses["202"], "POST /v1/claims must return 202");
  assert.ok(!post.responses["200"], "POST /v1/claims must not be synchronous 200");
});

test("metrics requires auth (not public)", () => {
  const get = paths["/v1/metrics"].get;
  assert.ok(get.responses["401"] && get.responses["403"], "metrics must be auth+allowlist gated");
  assert.ok(get.security === undefined, "metrics must inherit global bearerAuth (no security: [])");
});

test("dashboard and leaderboard are public", () => {
  assert.deepEqual(paths["/v1/dashboard"].get.security, [], "dashboard must be public");
  assert.deepEqual(paths["/v1/leaderboard"].get.security, [], "leaderboard must be public");
});

test("Campaign schema does not expose targetCastHash or nftImages", () => {
  const props = schemas.Campaign.properties;
  assert.ok(!props.targetCastHash, "targetCastHash must not be in public Campaign");
  assert.ok(!props.nftImages, "nftImages must not be in public Campaign");
});

test("maxMints is bounded 1..10000 in CreateCampaignRequest and Campaign", () => {
  for (const s of ["CreateCampaignRequest", "Campaign"]) {
    const m = schemas[s].properties.maxMints;
    assert.equal(m.minimum, 1, `${s}.maxMints min`);
    assert.equal(m.maximum, 10000, `${s}.maxMints max`);
  }
});

test("SyncResult.leveledUpTo is always-present nullable (no conditional)", () => {
  const s = schemas.SyncResult;
  assert.ok(s.required.includes("leveledUpTo"));
  assert.deepEqual(s.properties.leveledUpTo.type, ["integer", "null"]);
});

test("every spec error code appears in the document", () => {
  const codes = [
    "UNAUTHORIZED","INVALID_SIGNATURE","NOT_ALLOWED","INVALID_BODY","NOT_FOUND","NOT_REGISTERED",
    "NOT_LIKED","NO_NFT","ALREADY_CLAIMED","LIMIT_REACHED","WALLET_UNRESOLVED","RATE_LIMITED",
    "PAYLOAD_TOO_LARGE","UNSUPPORTED_MEDIA_TYPE","CAST_PUBLISH_FAILED","MINT_FAILED","MINT_TIMEOUT",
    "EVOLUTION_FAILED","UPSTREAM_UNAVAILABLE","SERVICE_UNAVAILABLE","INTERNAL",
  ];
  for (const c of codes) assert.ok(raw.includes(c), `error code ${c} not documented`);
});
```

- [ ] **Step 2: Run the test to verify behavior**

Run: `npm run bundle && npm run test`
Expected: PASS for all tests (the contract from Tasks 5–8 satisfies them). If any fails, fix the corresponding `src/` file and re-bundle — the failing assertion names the exact gap. (All 21 error codes resolve: `NOT_REGISTERED` and `INVALID_SIGNATURE` are present via the dedicated `NotRegistered`/`InvalidSignature` response components wired to the competitions `me`/`sync` 404s and the webhook 401 in Tasks 7–8.)

- [ ] **Step 3: Commit**

```bash
git add packages/api-contract/test/coverage.test.mjs
git commit -m "test(api-contract): assert spec §9 acceptance criteria"
```

---

## Task 10: Go codegen compiles

**Files:**
- Create: `packages/api-contract/oapi-codegen.yaml`
- Create: `packages/api-contract/go.mod`

- [ ] **Step 1: Create `oapi-codegen.yaml`**

```yaml
package: api
output: gen/go/api/server.gen.go
generate:
  models: true
  chi-server: true
  strict-server: true
  embedded-spec: true
```

- [ ] **Step 2: Create `go.mod`**

```
module github.com/edsphinx/socialdrop-api-contract

go 1.23

require github.com/oapi-codegen/runtime v1.1.1
```

- [ ] **Step 3: Generate Go types and compile**

Run (installs oapi-codegen if absent, generates, then compiles):
```bash
cd packages/api-contract
go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.4.1
"$(go env GOPATH)/bin/oapi-codegen" -config oapi-codegen.yaml openapi.yaml
go mod tidy
go build ./gen/go/...
```
Expected: `gen/go/api/server.gen.go` is produced and `go build` succeeds with no errors. If a schema produces an invalid Go identifier, fix the schema name in `src/components/schemas.yaml`, re-bundle, regenerate.

- [ ] **Step 4: Commit (generated Go is gitignored; commit only config + go.mod/go.sum)**

```bash
git add packages/api-contract/oapi-codegen.yaml packages/api-contract/go.mod packages/api-contract/go.sum
git commit -m "build(api-contract): Go codegen config; verified compiling output"
```

---

## Task 11: TypeScript codegen compiles

**Files:**
- Create: `packages/api-contract/tsconfig.json`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "es2022",
    "skipLibCheck": true
  },
  "include": ["gen/ts/**/*.ts"]
}
```

- [ ] **Step 2: Generate TS types and type-check**

Run:
```bash
cd packages/api-contract
npm run gen:ts
npx tsc -p tsconfig.json
```
Expected: `gen/ts/types.ts` is produced and `tsc` reports no errors.

- [ ] **Step 3: Add a smoke test that the generated paths type exists**

Create `packages/api-contract/gen/ts/_smoke.ts` is NOT committed (gen is gitignored); instead verify via `tsc` exit code only. No file to add.

- [ ] **Step 4: Commit**

```bash
git add packages/api-contract/tsconfig.json
git commit -m "build(api-contract): TS codegen config; verified type-checking output"
```

---

## Task 12: CI workflow

**Files:**
- Create: `.github/workflows/api-contract.yml` (repo root)

- [ ] **Step 1: Create the workflow**

```yaml
name: api-contract
on:
  push:
    paths: ["packages/api-contract/**"]
  pull_request:
    paths: ["packages/api-contract/**"]
jobs:
  contract:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/api-contract
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "24" }
      - uses: actions/setup-go@v5
        with: { go-version: "1.23" }
      - run: npm ci
      - run: npm run bundle
      - run: npm run lint
      - run: npm run test
      - run: npm run gen:ts && npx tsc -p tsconfig.json
      - run: go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.4.1
      - run: "$(go env GOPATH)/bin/oapi-codegen -config oapi-codegen.yaml openapi.yaml && go mod tidy && go build ./gen/go/..."
```

- [ ] **Step 2: Verify the workflow runs the same commands locally (full gate)**

Run:
```bash
cd packages/api-contract
npm ci && npm run validate && npm run gen:ts && npx tsc -p tsconfig.json
"$(go env GOPATH)/bin/oapi-codegen" -config oapi-codegen.yaml openapi.yaml && go build ./gen/go/...
```
Expected: every step passes (bundle, lint, coverage tests, TS type-check, Go build).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/api-contract.yml
git commit -m "ci(api-contract): lint + dual codegen + coverage gate"
```

---

## Task 13: README and final acceptance check

**Files:**
- Create: `packages/api-contract/README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# @socialdrop/api-contract

The single source of truth for the SocialDrop v1 HTTP API. Authored as multi-file YAML
under `src/`, bundled into `openapi.yaml`, and consumed by the Go backend (oapi-codegen)
and the Preact frontend (openapi-typescript).

## Commands
- `npm run validate` — bundle + lint + coverage tests (run before every commit)
- `npm run gen:ts` — generate TS types into `gen/ts/types.ts`
- `npm run gen:go` — generate Go types/server into `gen/go/api/`

## Editing
Edit files under `src/`; never hand-edit the bundled `openapi.yaml` (it is regenerated).
Add a path → create/extend a `src/paths/*.yaml` and register it in `src/paths/_index.yaml`.
Add a type → add a named schema in `src/components/schemas.yaml` (no anonymous nested objects).

## Design source
`docs/superpowers/specs/2026-06-18-api-contract-design.md` (in the nextjs package).
```

- [ ] **Step 2: Run the full acceptance gate one final time**

Run:
```bash
cd packages/api-contract
npm run validate
```
Expected: bundle PASS, spectral lint PASS (0 errors), all coverage tests PASS — satisfying spec §9 criteria 1–10.

- [ ] **Step 3: Commit**

```bash
git add packages/api-contract/README.md
git commit -m "docs(api-contract): README and final acceptance gate"
```

---

## Self-Review (completed during authoring)

**Spec coverage:** Every §5 endpoint → a path in Tasks 5–8 (asserted by the coverage test in Task 9). Every §4 entity and §7 error code → a named schema/response in Tasks 3–4 (error codes asserted in Task 9). §2 conventions → parameters/headers/responses (Task 2), pagination shapes (Task 3 `*Page`), idempotency header (Tasks 5–6), caching `ETag` headers (Tasks 5, 8), security schemes (Task 2). §9 acceptance criteria → Task 9 tests + Tasks 10–11 codegen compile.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every YAML/config/test block is complete and copy-ready.

**Type consistency:** Schema names referenced in paths (`CampaignPage`, `ClaimAccepted`, `ClaimStatus`, `ArenaView`, `LeaderboardPage`, `ClaimSummaryPage`, `MyTrophiesResponse`, `SyncResult`, `Competitor`, `Metrics`, `MeResponse`, `HealthStatus`, `WebhookAck`, the `*Request` bodies) all exist in Task 3's `schemas.yaml`. Response refs (`Unauthorized`, `Conflict`, `BadGateway`, …) all exist in Task 4's `responses.yaml`. operationIds are unique across path files.
```
