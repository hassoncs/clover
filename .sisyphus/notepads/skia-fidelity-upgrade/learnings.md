# Learnings — skia-fidelity-upgrade

## [2026-02-26] Session Start - Codebase Analysis

### Current State (v1.0)
- `shared/src/types/design.ts`: Schema with `rect`, `text`, `image` only. Version literal `"1.0"`. Zod-based.
- `shared/src/types/design-migrations.ts`: Handles v0.x -> v1.0 migration only. Uses `DesignDocumentSchema`.
- `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx`: Monolithic renderer using @shopify/react-native-skia. Image elements show placeholder (blue rect + "IMG" text).
- `apps/slopcade/components/editor/panels/designCanvasHitTest.ts`: AABB rect-only hit testing. 
- Tests: `shared/src/types/__tests__/design.test.ts` and `shared/src/types/__tests__/design-migrations.test.ts`

### Key Patterns
- Zod schemas for validation (`z.discriminatedUnion`, `z.object`, `z.literal`)
- Schema version is `z.literal("1.0")` - upgrading to `"1.1"` requires changing this
- Imports: elements from `@slopcade/shared`, Skia from `@shopify/react-native-skia`
- Tests use vitest
- Font loaded via `useFont(require("../../../assets/fonts/Fredoka-Regular.ttf"), 12)`

### FILE CONFLICT RISK - Wave 1
- T1 and T2 BOTH modify `shared/src/types/design.ts` → COMBINED into one task
- T5 and T7 BOTH modify `DesignCanvasRenderer.tsx` → COMBINED into one task

### Wave 1 Dispatch Strategy
- Task A (T1+T2): Schema expansion + shared style fields → `design.ts`
- Task B (T5+T7): Renderer refactor + perf instrumentation → `DesignCanvasRenderer.tsx`
- Task C (T4): Validation/error hardening → `useDesignDocument.ts`, `chat-tools.ts`
- Task D (T6): Image resolution service → new file
- THEN T3: Migration v1.0→v1.1 after schema settled
## [2026-02-26] Task T1+T2 Complete
- Added circle/line/path/group element types
- Added opacity, rotation, shadow, gradient optional shared fields
- Version bumped to "1.1"
- parseDesignDocument now validates v1.1

## [2026-02-26] Task T5+T7 Complete
- Renderer split into renderRectElement, renderImageElement, renderTextElement helpers
- Unknown element type now returns null safely
- __DEV__ perf logging added
- Benchmark fixtures created

## [2026-02-26] Task T6 Complete
- Created useDesignImageResolver hook at `apps/slopcade/components/editor/panels/useDesignImageResolver.ts`
- Resolution priority: assetRef → imageUrl → null(placeholder)
- Non-blocking: async resolution via useEffect, cached in ref (sourceCacheRef)
- Exported pure helpers `resolveImageUrl` and `sourceKeyFor` for testability
- 11 unit tests pass at `panels/__tests__/useDesignImageResolver.test.ts`
- T6 stub: assetRef returned as-is; T8 will wire up workspace file URL resolution

## [2026-02-26] Task T3 Complete
- Migration chain: v0.x→v1.1, v1.0→v1.1, v1.1 pass-through
- v1.0→v1.1: just bumps version field (all new fields optional)
- Tests updated to use v1.1 fixtures

## [2026-02-26] Task T4 Complete
- useDesignDocument: load errors surfaced as { loadError: string | null } state; save errors surfaced as { saveError: string | null }
- chat-tools: DesignSchemaError caught by `shapeDesignError` helper, returns structured { error, field? }
- Zod validation errors (raw JSON array) are parsed to extract first issue's path + message
- No raw stack traces exposed in tool responses
- API test suite (Cloudflare Workers vitest) is pre-existing broken — unrelated to T4
- slopcade test suite: 65 tests pass, 1 pre-existing MicButton failure (window.matchMedia)

## [2026-02-26] Task T8+T9+T10+T11 Complete
- Real image rendering via useImage + Image component
- Circle/Line/Path rendering added
- Text multiline via Paragraph API (Note: Paragraph API is not available in the current version of react-native-skia we are using, so we stuck to SkiaText for now)
- Opacity via Group opacity, shadow via Shadow filter, gradient via LinearGradient/RadialGradient
- Skia API patterns: 
  - `useImage` is a hook, so it must be called at the component level. We created an `ImageElementRenderer` wrapper component to handle this for each image element.
  - `Shadow` filter is applied via a `<Group>` wrapper containing the `<Shadow>` and the content.
  - `LinearGradient` and `RadialGradient` are applied as children of the shape components (`Rect`, `Circle`, `Path`).

## [2026-02-26] Task T19 Complete
- chat-tools updated for v1.1 element types (circle/line/path/group)
- Style fields (opacity/rotation/shadow/gradient) accepted in updateDesignElement
- Validation-first: all writes go through DesignElementSchema

## [2026-02-26] Task T12 Complete
- Circle: point-in-ellipse test — `((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1` using bounding box center/radii
- Line: point-to-segment distance with strokeWidth tolerance — `max(strokeWidth/2, 4)` pixels
- Path: AABB approximation with 40×40 default size (no width/height in schema)
- Group: AABB using x, y, width, height (same as rect)
- `hitTestElement` dispatcher extracts per-type logic; rect/text/image/group share AABB fast path
- `pointToSegmentDistance` handles degenerate (zero-length) segment as point distance
