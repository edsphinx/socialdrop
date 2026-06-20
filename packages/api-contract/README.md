# @socialdrop/api-contract

The single source of truth for the SocialDrop v1 HTTP API. A single `openapi.yaml`
(OpenAPI 3.0.3) consumed by the Go backend (oapi-codegen) and the Preact frontend
(openapi-typescript), so the two sides cannot drift.

## Commands (run from this package; uses the repo's yarn 3 workspace)

- `yarn validate` — spectral lint + coverage tests (run before every commit)
- `yarn gen:ts` — generate TS types into `gen/ts/types.ts`
- `yarn gen:go` — generate Go types/server into `gen/go/api/` (run `mkdir -p gen/go/api` first; needs `oapi-codegen` on PATH)

## Editing

Edit `openapi.yaml` directly — it is the source (no bundle step). Add a type as a
named `components/schemas` entry; reference it via `$ref: "#/components/schemas/X"`.
The coverage tests in `test/coverage.test.mjs` enforce the contract invariants
(no `fid` params, no snake_case, async claims, bounded `maxMints`, gated `/metrics`,
all error codes documented).

## Notes

- **OpenAPI 3.0.3, not 3.1:** `oapi-codegen` does not yet fully support 3.1
  (oapi-codegen#373); 3.0.3 with `nullable: true` is semantically equivalent and
  works with both generators. Revisit 3.1 when oapi-codegen supports it.
- Generated output (`gen/`) is gitignored and produced by CI / codegen on demand.

## Design source

`docs/superpowers/specs/2026-06-18-api-contract-design.md` (in the nextjs package).
