# Decisions

## Task: Metro Web Resolution + Missing React Flow Imports

- Chose Metro resolver override (option a) instead of package-exports toggles to guarantee CJS/UMD resolution for `@xyflow/react` and transitive `@xyflow/system` on web.
- Reused existing custom resolver pattern in `app/metro.config.js` (same style as `jotai` override) to keep behavior consistent and localized to Metro.
