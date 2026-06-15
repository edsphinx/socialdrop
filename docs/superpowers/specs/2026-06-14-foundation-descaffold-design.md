# SocialDrop — Foundation Lock-in & De-scaffolding (Sub-project 1)

**Date:** 2026-06-14
**Status:** Design — pending user review
**Scope:** Program Phase 0 (Lock the foundation) + Phase 1 (De-scaffold + rebrand)

## Context

SocialDrop is a Farcaster Mini-App for engagement-driven NFT airdrops on Base. It won a Base hackathon in Chile (Sept 2025) as an MVP. The goal now is a **production relaunch** to apply for a Base grant in English. Cash is needed soon, so the program is optimized for the fastest credible path to a grant-ready showcase; heavy hardening and mainnet are deferred to "what the grant funds."

An audit (2026-06-14, 5 parallel reviews) established the baseline:

- The real foundation is the **unmerged, unpushed local branch `feature/grant-ready-cleanup`** (commit `4a83575`, dated 2026-02-08), not `main`. It is trustworthy work: English translation complete (0 Spanish chars), dead code removed (13 files), substantive bug fixes, the demo's "AI simulation" replaced with **real Neynar like-counts** (War of Influence), and **61 meaningful Vitest tests** added. Auditor verdict: *merge after light verification*.
- **De-scaffolding scaffold-eth-2 is cheap (S/S–M)** because all feature logic already routes around scaffold (zero `useScaffold*` in feature code; the 14 API routes never import scaffold). Scaffold survives mostly as dead vendored weight.
- The repo still reads as a template fork: `LICENSE` says "2023 BuidlGuidl", `CONTRIBUTING.md` is stock Scaffold-ETH, package is `@se-2/nextjs`, and several hackathon shortcuts remain.

This sub-project does NOT touch security hardening (auth, multisig, key custody, rate limiting) — that is sub-project 2. The only security action here is **rotating the exposed deployer key**, because it is a prerequisite for everything downstream and is mechanical.

## Goals

1. Make `main` the trustworthy, verified, English, tested foundation (merge the cleanup branch).
2. Remove scaffold-eth-2 so the codebase reads as a professional product, not a template fork.
3. Eliminate the obvious "hackathon demo" tells a grant reviewer would catch.
4. Make CI actually verify the code (tests + build), not just lint.
5. Rotate the exposed deployer wallet so no live key is reused going forward.

## Non-Goals (explicitly deferred)

- Authentication on mint endpoints, fixing the claim race condition, webhook fail-closed, rate limiting, zod validation → **sub-project 2**.
- Multisig ownership, on-chain `maxLevel` cap, KMS/secrets-manager for the signer, balance monitoring → **grant-funded**.
- On-chain / trustless influence verification (signature-based claims) → **grant-funded roadmap (Phase 4)**.
- Base **mainnet** deployment → **grant-funded**. This sub-project stays on Base Sepolia.
- New product features. Functionality must be **unchanged** at the end of this sub-project.

## Success Criteria

- `main` contains the cleanup branch's work; `yarn install`, the full test suites (61 Vitest + ~17 Hardhat), and a strict `next build` (no `IGNORE_BUILD_ERROR`) all pass.
- No `scaffold-eth`-named directories remain (`hooks/scaffold-eth`, `components/scaffold-eth`, `utils/scaffold-eth`); `grep -r "scaffold"` returns only incidental matches (e.g. historical comments), and `~~` alias is gone.
- App runs locally with identical behavior: creator panel, claim flow, War of Influence leaderboard all work against Base Sepolia.
- `package.json` name is no longer `@se-2/*`; `LICENSE` and `CONTRIBUTING.md` are project-owned; the `vercel:yolo` script and hardcoded demo values are gone.
- CI runs lint **+ Vitest + Hardhat tests + next build**.
- The previously-exposed deployer key is retired; a freshly generated key is in use locally (and documented as the value to set in Vercel env).

## Design

The work splits into two phases sharing one verification pass at the end. Each phase is a set of small, independently reviewable units.

### Phase 0 — Lock the foundation

**0.1 Verify the branch.** *(Partially executed 2026-06-14 — results recorded below.)* From `feature/grant-ready-cleanup`: `yarn install` ✅, `cd packages/nextjs && yarn vitest run` → **61/61 pass** ✅, `cd packages/hardhat && yarn test` → **17/17 pass** ✅. However `yarn next:check-types` is **RED**: 5 `TS7006` implicit-any errors in `app/api/dashboard/main/route.ts:29`, `app/api/duels/route.ts:28,35`, `app/api/metrics/route.ts:10` — these are currently masked by the `vercel:yolo` / `NEXT_PUBLIC_IGNORE_BUILD_ERROR` build escape hatch. They are trivial annotations and are folded into task 1.5 (remove the escape hatch → fix these 5). The branch is therefore **mergeable** (runtime + tests green) but does not yet pass a strict type-checked build. Confirm the Prisma schema change between `main` and the branch has a committed migration (it does: `20250910161245_nft_levels_support`); note whether `prisma migrate deploy` is needed at deploy time. **Gate:** the test suites must be green to merge (they are); the strict-build gate is satisfied later, after 1.5.

**0.2 Merge to `main`.** Fast-forward / merge `feature/grant-ready-cleanup` into `main` so `main` becomes the foundation. Push using the personal `edsphinx` GitHub identity over SSH (per global identity rules — this is a personal repo). Delete the merged feature branch locally and on origin.

**0.3 Rotate the exposed deployer key (with redeploy).** Generate a fresh keypair and replace `DEPLOYER_PRIVATE_KEY` in `packages/nextjs/.env.local` and `packages/hardhat/.env`. Treat the old key (`0x337a66…`) as burned. Because `mint`/`evolve` are `onlyOwner` and the current contract owner is the *old* deployer address, simply rotating the runtime key would leave the new signer unable to mint/evolve. On Base Sepolia the clean resolution is to **redeploy `EvolvingNFT` from the new deployer** (rather than asking the compromised key to sign an `transferOwnership`). The new contract address then becomes the single source of truth consumed by the hand-authored `abis.ts` in 1.1. Existing Sepolia test NFTs are abandoned (acceptable on testnet). Document (do not commit) that the new key must be set in the Vercel project env and the hardhat deploy env. No multisig/ownership-handoff beyond the new EOA here (deferred to grant-funded hardening).

**0.4 Make CI verify.** Extend `.github/workflows/lint.yaml` (or add a `ci.yaml`) so that on push/PR to `main` it runs, after install: `next:lint`, `next:check-types`, **`vitest run`**, **hardhat `test`**, and **`next:build`**. Pin `actions/checkout` to a tagged version instead of `@master`. Add a `.nvmrc` / `.node-version` pinning Node 20.x to match `engines`.

### Phase 1 — De-scaffold + rebrand

Ordered so the app stays compiling after each unit where possible.

**1.1 Replace the contract type source.** Create a hand-authored `packages/nextjs/contracts/abis.ts` (or per-contract export) exporting the `EvolvingNFT` ABI + Sepolia address, replacing `deployedContracts.ts` and its `GenericContractsDeclaration` import. Repoint the single consumer, `services/blockchain.service.ts`. Verify reads/writes still work.

**1.2 Rewrite the wagmi/RainbowKit config.** Rewrite `services/web3/wagmiConfig.tsx` and `services/web3/wagmiConnectors.tsx` to a clean `createConfig` (wagmi 2 + viem 2 + RainbowKit 2, all already deps) targeting Base Sepolia, dropping `scaffold.config.ts`, the burner connector, and `getAlchemyHttpUrl`/`utils/scaffold-eth`. Replace committed default Alchemy/WalletConnect keys with env-only values. Strip `BlockieAvatar` (or reimplement minimally) and rename `ScaffoldEthAppWithProviders.tsx` to a neutral `AppProviders.tsx`.

**1.3 Migrate the path alias.** Mechanical find/replace `~~/*` → `@/*` across the ~65 files and `tsconfig.json`. Single commit, verified by a clean type-check.

**1.4 Delete the vendored scaffold trees.** Remove `hooks/scaffold-eth/`, `components/scaffold-eth/`, `utils/scaffold-eth/`, `scaffold.config.ts`, and the now-dead `deployedContracts.ts`/`externalContracts.ts`. Rewrite the few live touch-points first if not already done: `services/store/store.ts` (drop scaffold util), the toast/notification wrapper (use `react-hot-toast`, already a dep). The commented-out `Header`/`Footer`/`useInitializeNativeCurrencyPrice` are deleted, not revived. **Gate:** type-check + build clean after deletion; `grep -ri scaffold` reviewed for any remaining live reference.

**1.5 Remove hackathon shortcuts.**
- Delete the `vercel:yolo` script and the `NEXT_PUBLIC_IGNORE_BUILD_ERROR` escape hatch in `next.config.ts`; the build must type-check. This requires fixing the 5 known `TS7006` implicit-any errors surfaced in 0.1 (`app/api/dashboard/main/route.ts:29`, `app/api/duels/route.ts:28,35`, `app/api/metrics/route.ts:10`) — annotate the Prisma callback params with their real types.
- Remove the hardcoded dev FID fallback `20039` (`app/duel/[campaignId]/page.tsx`) and the hardcoded `/duel/1` link (`app/duel/page.tsx`) — replace with proper empty/loading states.
- Replace `placehold.co` preview images in `app/admin/create/page.tsx` with real assets or a neutral local placeholder.
- Remove the stale ngrok host in `next.config.ts` `allowedDevOrigins`.

**1.6 Rebrand.**
- Rename packages from `@se-2/*` to `@socialdrop/*` (root, both packages, and references).
- Replace `LICENSE` content (MIT, owned by the SocialDrop author, current year) and fix the filename mismatch (`LICENCE` → `LICENSE`).
- Replace `CONTRIBUTING.md` with a short project-specific guide.

### Final verification pass (shared)

After both phases: clean `yarn install`, full Vitest + Hardhat suites green, strict `next build` green, and a manual smoke test of the three flows on Base Sepolia (create campaign, claim, leaderboard/evolve). Then commit and push to `main`.

## Risks & Mitigations

- **Deleting something still in use.** Mitigation: type-check + build + tests after each deletion unit (1.1–1.4 are individually verifiable); `grep -ri scaffold` review before the final delete.
- **The branch fails verification (0.1).** Mitigation: this is checked first; if red, the program pauses here and we fix forward before any de-scaffolding — the rest of the plan assumes a green branch.
- **Behavior drift during de-scaffold.** Mitigation: the 61-test suite + manual smoke test of all three flows is the regression net; functionality is a hard non-goal to change.
- **Identity/push mistake** (personal repo pushed under the wrong GitHub account). Mitigation: follow the global identity rules — `edsphinx` over SSH; verify `gh api user --jq .login` / `git remote -v` before pushing.

## Testing Strategy

- **Automated:** existing 61 Vitest route/lib tests + ~17 Hardhat contract tests are the regression suite; they must pass before merge (0.1) and after de-scaffold (final pass). No new tests required for this sub-project (no new behavior), but CI must now run them (0.4).
- **Manual smoke:** create a campaign, claim an NFT, register + update in War of Influence and observe a real like-count drive an on-chain evolution — all on Base Sepolia.
- **Build:** strict `next build` (no ignore flag) is itself a test that the de-scaffold left no type/import breakage.
