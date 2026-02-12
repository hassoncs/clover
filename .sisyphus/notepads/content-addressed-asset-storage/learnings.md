## Task 1.3: tRPC Routes for Blob Assets

### Implementation
Created `api/src/trpc/routes/blob-assets.ts` with four routes:
- `upload` (protected) - Accepts base64-encoded binary data, returns hash + assetId
- `getUrl` (public) - Returns deterministic URL for a hash
- `exists` (public) - Checks if asset exists in DB
- `batchResolve` (public) - Resolves multiple hashes to URLs in one call

### Key Patterns
- Used `protectedProcedure` for upload (requires auth)
- Used `publicProcedure` for read operations (no auth needed)
- Followed existing route patterns from `users.ts` and `asset-system/themes.ts`
- Base64 decoding helper function converts string to ArrayBuffer
- BlobStore instantiated per-request with `ctx.env.ASSETS` and `ctx.env.DB`

### Testing
Created comprehensive test suite with 14 tests covering:
- Upload with metadata
- Deduplication (same content returns same hash)
- Authentication requirements
- Public access to read operations
- Batch URL resolution
- Hash validation (64-char length)

**Critical gotcha**: Tests must create test users before uploading assets due to FK constraint on `assets.creator_user_id → users.id`

### Wiring
Added `blobAssetsRouter` to `api/src/trpc/router.ts` as `blobAssets` namespace

All tests pass ✓
