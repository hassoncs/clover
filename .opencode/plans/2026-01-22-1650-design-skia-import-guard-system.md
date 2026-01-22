---
title: "Design Skia import guard system"
agent: oracle
created: 2026-01-22T16:50:15.766Z
session_id: ses_41963ab70ffezLbsL16WyFk6iD
duration: 52s
---

# Design Skia import guard system

**Bottom line**
Make “Skia code” a quarantined module layer (`*.skia.tsx` or `src/skia/**`) and enforce one rule: nothing outside that layer may *statically* import anything that (directly or indirectly) imports `@shopify/react-native-skia`. Back it with ESLint for fast feedback, and a CI import-graph check for certainty; add a tiny web smoke test so the rare misses fail loudly.

**Action plan**
1. Create a hard boundary for Skia code:
   - Put all Skia components in `src/skia/` and/or name them `*.skia.tsx`.
   - Ban exporting these from any general barrel (`src/components/index.ts`, etc.). If you need a barrel, make it `src/skia/index.ts` and keep it quarantined.
2. ESLint (90% solution, best against AI-generated code):
   - `no-restricted-imports`: forbid `@shopify/react-native-skia` everywhere except `src/skia/**` / `**/*.skia.tsx`.
   - `no-restricted-imports` (or `import/no-restricted-paths`): forbid importing `src/skia/**` (or `*.skia.tsx`) from:
     - routes/pages/layouts
     - shared barrels
     - any “non-Skia” directory (everything outside `src/skia/**`)
3. CI build-time import-graph check (the “seatbelt + airbag”):
   - Script scans for “Skia-root files” (direct import of `@shopify/react-native-skia`) and builds a reverse dependency graph.
   - Fail if any non-quarantined file depends on a Skia-root file (and fail if any barrel re-exports a Skia file).
4. Make the correct pattern the easiest to write:
   - Provide a single helper component, used everywhere:
     - `WithSkiaWeb getComponent={() => import("src/skia/Foo.skia")} …`
   - Optionally add a codemod snippet to docs: “How to add a Skia view”.
5. Make failures loud/obvious:
   - Add a web smoke test in CI that loads the app (or key routes) and fails on console errors mentioning CanvasKit/Skia initialization (Playwright is ideal if you already have it; otherwise a simple “start web + curl + check server logs” is still better than nothing).
   - Add a dev-only global error overlay that recognizes the common CanvasKit init error text and prints an explicit message: “A static import of `@shopify/react-native-skia` occurred before `WithSkiaWeb` initialization; search for `from '@shopify/react-native-skia'` and barrel re-exports.”

**Effort estimate**
Short (1–4h) for ESLint + naming + barrel quarantine; Medium (1–2d) if you add a robust graph-check + web smoke tests.

---

**Why this approach**
- ESLint catches what AI tools do most often: dropping a top-level `import { Canvas } from "@shopify/react-native-skia"` into a random component or barrel. Fast feedback prevents the bug from landing.
- A quarantined directory/extension turns the problem into a simple boundary rule (“Skia can’t leak”), which is easier to enforce than trying to prove “this import happened through a dynamic import boundary”.
- The graph-check catches transitive leaks (the real killer) and is deterministic in CI.

**Watch out for**
- Barrels are the primary footgun: even if Skia files are quarantined, a single `export * from "./skia/Foo.skia"` in a shared barrel reintroduces the transitive crash. Make “no re-export of Skia files from non-Skia barrels” a hard rule (lint + CI check).
- If you colocate Skia and non-Skia components in the same folder, the boundary becomes unenforceable. Keep the quarantine physically separate.

---

**Escalation triggers**
- You have many dynamic route entry points and still see occasional misses: invest in the import-graph check + a minimal Playwright route crawl.
- Multiple teams keep reintroducing barrels: consider removing general barrels entirely (or generating them) so Skia exports can’t accidentally leak.

**Alternative sketch (more advanced, only if needed)**
- Add a dedicated “Skia route wrapper” pattern: routes can only reference Skia screens via a registry that stores *only* loader functions (no component values), so it’s impossible to accidentally import a Skia component by value. This is more structure than most apps need, but it’s nearly foolproof.
