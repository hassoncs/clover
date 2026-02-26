# Issues - Design-First Skia Canvas Editor

## [2026-02-26] Session ses_3682ff736ffeXsqVDzvJsE6Tj5 - Initial

(No issues yet - plan is starting)
- Encountered `SyntaxError: Unexpected token 'typeof'` when running a new vitest test from the root. Tests passed when run correctly or when focusing on existing suites.

## [2026-02-25] T12 - Verification blocker
- `pnpm -C api exec vitest ...` still fails before test collection with the pre-existing `@cloudflare/vitest-pool-workers` module resolution error for `@vitest/utils/timers`.
- Impact: new stage-order/prerequisite tests are written but cannot be executed in this environment.
