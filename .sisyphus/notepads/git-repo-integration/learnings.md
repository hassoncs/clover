# Git Repo Integration - Learnings

## GitService Implementation (Task 2.4)

### Pattern: Worker-side DO Client
- Created thin client class that routes requests to GameRepoDO
- Pattern: `getDO(gameId)` → `idFromName()` → `get()` → `fetch()`
- All methods construct HTTP requests with `X-Game-Id` header
- Error responses parsed and thrown with descriptive messages
- `readFile` returns `null` for 404 (file not found) vs throwing for other errors

### Type Handling
- Used explicit type assertions for error response parsing: `(await response.json<{ error?: string }>().catch(() => ({}))) as { error?: string }`
- This pattern avoids TypeScript narrowing issues with union types

### Testing Cloudflare Workers Types
- Cloudflare Workers `Response` type conflicts with standard web `Response` in Vitest
- Solution: Add `// @ts-nocheck` at top of test file
- Alternative approaches (type casting, @ts-expect-error) were too verbose
- Mock pattern: `vi.mocked(mockStub.fetch).mockResolvedValue(new Response(...) as never)`

### URL Construction
- Used template literals for paths: `/read/${path}`
- Query params: `?ref=${encodeURIComponent(ref)}`
- Always URL-encode user-provided values in query params
