---
title: "Architect asset URL solution"
agent: oracle
created: 2026-01-23T04:23:31.480Z
session_id: ses_416e88192ffe5fF8xqoBYkqPKT
duration: 15s
---

# Architect asset URL solution

**Bottom line**
Use the existing Worker proxy route (`/assets/*`) as the single, canonical way to serve images, and stop returning absolute hostnames from the API. Have the API return an `r2Key` (or a relative `assetPath` like `/assets/<r2Key>`), and let the React Native app build a full URL from whatever API base it’s already using (LAN IP in dev, real domain in prod). This avoids custom-domain/R2 public-bucket complexity, works on physical devices without manual per-asset IP fiddling, and stays maintainable.

**Action plan**
1. **Change API response shape**
   - Replace `url: "https://assets.clover.app/..."` with either:
     - `r2Key: "generated/item/uuid.jpg"` (preferred, most flexible), or
     - `assetPath: "/assets/generated/item/uuid.jpg"` (also fine).
2. **Frontend: build the absolute URL from API base**
   - Centralize in one helper, e.g. `makeAssetUrl(apiBaseUrl, r2Key)` => `${apiBaseUrl}/assets/${r2Key}`.
   - Reuse the same `apiBaseUrl` you already configure for API calls (in dev it’s the LAN IP; in prod it’s the production domain). No separate config for assets.
3. **Worker: make `/assets/*` production-grade**
   - Fetch from R2 by key and return bytes with correct `Content-Type`.
   - Add caching headers (at minimum):
     - `Cache-Control: public, max-age=31536000, immutable` for content-addressed or “never changes” assets, or
     - a shorter TTL if assets can be overwritten.
   - Return `404` cleanly when missing; avoid leaking internals.
4. **(Optional but recommended) Add CDN caching via Cloudflare**
   - Ensure the route is cacheable at the edge (Worker `Cache API` or `cacheEverything` rules, depending on your setup) so proxying doesn’t become a bottleneck.

**Effort estimate**
Short (1–4h)

**Why this approach
