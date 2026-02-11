## 2026-02-11

- Expression evaluator contexts in `shared` resolve game variables from `ctx.variables`; top-level `score`/`lives` are not part of `EvalContext` anymore.
- Production runtime context builders in `app/lib/game-engine/systems/runner/wrappers` pass score/lives via `gameState.variables`, confirming tests should use variables map for those identifiers.
- `asset-url` behavior is intentional: R2 keys are prefixed with `packs/`, and offline URLs are `${localServerUrl}/${r2Key}` with no `gameId` segment.
- Ball sort schema failure came from `set_variable` actions using literal number/string values while `SetVariableActionSchema` only accepted expression objects.
