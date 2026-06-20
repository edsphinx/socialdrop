import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const raw = readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8");
const doc = parse(raw);
const paths = doc.paths ?? {};
const schemas = doc.components?.schemas ?? {};

test("OpenAPI is 3.0.3 (oapi-codegen lacks full 3.1 support)", () => {
  assert.equal(doc.openapi, "3.0.3");
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

test("claims POST is async (202 + no synchronous 200)", () => {
  const post = paths["/v1/claims"].post;
  assert.ok(post.responses["202"], "POST /v1/claims must return 202");
  assert.ok(!post.responses["200"], "POST /v1/claims must not be synchronous 200");
});

test("metrics requires auth (not public)", () => {
  const get = paths["/v1/metrics"].get;
  assert.ok(get.responses["401"] && get.responses["403"], "metrics must be auth+allowlist gated");
  assert.equal(get.security, undefined, "metrics must inherit global bearerAuth (no security: [])");
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
  assert.equal(s.properties.leveledUpTo.type, "integer");
  assert.equal(s.properties.leveledUpTo.nullable, true);
});

test("every spec error code appears in the document", () => {
  const codes = [
    "UNAUTHORIZED", "INVALID_SIGNATURE", "NOT_ALLOWED", "INVALID_BODY", "NOT_FOUND", "NOT_REGISTERED",
    "NOT_LIKED", "NO_NFT", "ALREADY_CLAIMED", "LIMIT_REACHED", "WALLET_UNRESOLVED", "RATE_LIMITED",
    "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "CAST_PUBLISH_FAILED", "MINT_FAILED", "MINT_TIMEOUT",
    "EVOLUTION_FAILED", "UPSTREAM_UNAVAILABLE", "SERVICE_UNAVAILABLE", "INTERNAL",
  ];
  for (const c of codes) assert.ok(raw.includes(c), `error code ${c} not documented`);
});
