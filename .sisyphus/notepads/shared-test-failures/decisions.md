## 2026-02-11

- Kept evaluator production behavior unchanged; fixed expression tests to align with generic-variables architecture (`score`/`lives` stored in `variables`).
- Updated schema (not ball sort game definition) for `set_variable.value` to accept primitive literals in addition to expression objects, matching runtime/type intent.
- Updated asset URL tests to match current implementation semantics rather than reverting implementation behavior.
