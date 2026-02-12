## Decisions Log

### 2026-02-12 - Plan Creation
- Remix v1 = runtime overrides only (variables, assets, shader params). No compile-time constant overrides.
- One remix at a time. No composition.
- Non-destructive migration: create remixes table alongside asset_packs, migrate data, then deprecate.
- Fork deep copy: clone full workspace/ tree including all subdirectories.
- Graceful degradation for stale override keys: apply what matches, warn on misses.
