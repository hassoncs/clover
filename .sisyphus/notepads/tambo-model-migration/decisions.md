# Tambo Model Migration - Decisions

## 2026-02-11 Task: Architecture Decision
- Adopting Tambo's thread/message/tool data model on Cloudflare Workers + D1
- No DOs for chat orchestration — plain async functions
- Keep RealtimeRelayDO (voice relay is separate)
- Keep ArtifactService, WalletService unchanged
- Bill per message turn instead of per step
