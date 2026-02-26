
- PartyConfigProvider runtime config is required before calling createPartyRoom from package API; missing provider will throw.

- `packages/editor-ai` typecheck initially pulled full `@slopcade/ui` source graph; resolved by tsconfig path alias to local typed shim (`src/types/slopcade-ui.ts`) for package-local compilation.
- `npx tsc --noEmit -p packages/editor/tsconfig.json` still fails due deep cross-workspace type coupling (`@slopcade/shared`, `@slopcade/ui`, `@slopcade/game-runtime`, `@slopcade/godot-bridge`) and unresolved generated/resource modules.
- `@slopcade/editor` currently requires host wiring for `EditorConfigProvider`; shims alone do not provide runtime config injection yet.
- Strict type compatibility issues remain in copied editor files where shared type contracts are broad or unresolved after package extraction.
