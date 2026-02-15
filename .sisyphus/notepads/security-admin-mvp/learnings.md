
- **Consolidated Security Testing**: Creating a single "smoke suite" test file (`launch-gate.test.ts`) is an effective way to verify multiple security gates (moderation, billing, admin, invites, audit) in one go.
- **Audit Log Coverage**: Discovered that some admin routes (like `backfillContentHash`) were skipping audit logs on early returns. Fixed this to ensure all attempts are logged.
- **D1 Mock Behavior**: Vitest D1 mock returns snake_case column names (e.g., `actor_id`) even if the TypeScript types use camelCase.
