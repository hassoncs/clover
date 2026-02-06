# Decisions

## 2026-02-05 Architecture Decisions
- SyncWorldOps is the flat sync facade; no Promises
- AsyncWorldOps contains ONLY animate and wait
- ScriptContext extends SyncWorldOps (flat methods on ctx) + worldAsync namespace
- addScore/addLives removed in favor of generic setVariable
- RunScriptActionExecutor uses deferred spawns pattern (collect during script, flush after)
- ScriptSandboxRuntimeSystem uses direct EntityManager calls (no deferred pattern needed)
