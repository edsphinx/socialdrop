# Contributing to SocialDrop

Thanks for your interest in SocialDrop — free, open infrastructure for
engagement-driven NFT airdrops on Base.

## Development setup

See the "Getting Started" section in the README.

## Workflow

1. Branch from `main` (`feat/…`, `fix/…`, `chore/…`).
2. Keep changes focused; write or extend tests under
   `packages/nextjs/__tests__` or `packages/hardhat/test`.
3. Ensure `yarn next:check-types`, `yarn next:lint`, the Vitest and Hardhat
   suites, and `yarn next:build` all pass — CI enforces these.
4. Open a PR against `main` with a clear description.

## Code style

Lint and type-check are enforced via Husky/lint-staged on commit and in CI.
All code, comments, and commit messages are in English.
