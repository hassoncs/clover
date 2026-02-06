# Decisions

## 2026-02-06 Architecture Decision
- Sync-first script API: all gameplay ops are sync on ctx.* directly
- Async isolated to ctx.worldAsync.* (animate, wait, bridge queries)
- startSequence bridges sync hooks to async workflows
- Single canonical ScriptContext definition
- Inspector/MCP keeps using async WorldOps (renamed AsyncWorldOps)
