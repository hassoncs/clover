# Production Readiness & Scaling Report: Slopcade Amen

## 1. Executive Summary
This report analyzes the production readiness of the Slopcade Amen platform, focusing on its ability to scale for church-based party game sessions. The architecture leverages Cloudflare Workers, Durable Objects, D1, and R2 to provide a highly available and scalable backend.

## 2. Cloudflare Workers Scaling
Slopcade-api runs on Cloudflare Workers, which provides automatic horizontal scaling.

- **CPU Time**: 
    - Standard (Paid): 30s per request.
    - Free: 10ms per request.
    - *Analysis*: The `QuickJSServerRunner` used in `PartyRoomDO` is the most CPU-intensive component. For complex game logic, the Paid plan is mandatory to avoid `Script exceeded time limit` errors.
- **Memory**: 128MB per isolate.
    - *Analysis*: Sufficient for most party game sessions. Large game definitions or many concurrent players in a single DO might approach this limit.
- **Subrequests**: 50 per request.
    - *Analysis*: The API makes subrequests to D1, R2, and external AI services (Scenario, ElevenLabs). 50 is ample for standard game flows.

## 3. D1 Database Analysis
D1 is used for persistent storage of users, games, and transaction history.

- **Storage**: 10GB per database.
- **Max Row Size**: 25MB.
- **Query Limits**: 
    - Free: 100K reads, 1K writes per day.
    - Paid: Unlimited (billed per million).
- **Analysis**: D1 is suitable for metadata and user records. It is NOT used for real-time game state (which lives in Durable Objects), preventing D1 from becoming a bottleneck during active gameplay.

## 4. R2 Storage Capacity
R2 stores game assets (images, sounds, WASM bundles).

- **Capacity**: Virtually unlimited.
- **Throughput**: Scales with demand.
- **Analysis**: R2 is the ideal choice for serving game assets. The `sync-r2.ts` script ensures assets are correctly deployed.

## 5. Durable Objects & WebSockets
`PartyRoomDO` manages real-time game sessions via WebSockets.

- **Concurrency**: Each `PartyRoomDO` instance handles one game session. Cloudflare manages the distribution of DOs across its global network.
- **WebSocket Limits**: Cloudflare supports thousands of concurrent WebSockets per DO, but practical limits are dictated by memory (128MB) and CPU.
- **Rate Limiting**: `PartyRoomDO` implements a 10 message/second limit per player to prevent abuse.
- **Persistence**: DO `state.storage` is used for session state, which is faster and more reliable than D1 for frequent updates.

## 6. Load Estimation
Estimated resource usage for concurrent church game sessions (assuming 10 players + 1 host per session):

| Metric | 100 Sessions | 500 Sessions | 1000 Sessions |
|--------|--------------|--------------|---------------|
| **Concurrent DOs** | 100 | 500 | 1,000 |
| **Concurrent WebSockets** | 1,100 | 5,500 | 11,000 |
| **Est. D1 Reads/min** | ~200 | ~1,000 | ~2,000 |
| **Est. R2 Bandwidth** | Low (cached) | Medium | High |

*Note: Cloudflare Workers Paid plan is required for 100+ concurrent sessions to handle the aggregate CPU and D1 usage.*

## 7. Environment Variables (Production)
The following secrets must be configured in the production environment via `wrangler secret put`:

- `DATABASE_ID`: Production D1 database ID.
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: For auth and backup storage.
- `SCENARIO_API_KEY`: For AI image generation.
- `ELEVENLABS_API_KEY`: For AI sound generation.
- `STRIPE_SECRET_KEY`: For payments/billing.
- `REQUIRE_INVITE`: Set to `true` for controlled rollout.

## 8. Monitoring & Alerting
- **Cloudflare Observability**: Monitor DO CPU usage and WebSocket error rates.
- **Sentry Integration**: (Recommended) Add Sentry to catch runtime exceptions in Workers.
- **D1 Metrics**: Track read/write units to manage costs.
- **Custom Alerts**: Set up alerts for `Script exceeded time limit` and `Durable Object reset` events.

## 9. Pre-launch Checklist
- [ ] Verify D1 migrations are applied to production (`pnpm db:push:remote`).
- [ ] Ensure R2 buckets are provisioned and assets synced.
- [ ] Validate all production secrets are set.
- [ ] Perform a "Smoke Test" with 5+ concurrent players in a single room.
- [ ] Check `wrangler.toml` for correct `compatibility_date`.
- [ ] Verify custom domain is correctly routed to the Worker.
- [ ] Audit `PartyRoomDO` cleanup logic to ensure storage is deleted after sessions end.
