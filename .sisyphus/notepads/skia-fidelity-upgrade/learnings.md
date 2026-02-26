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

## [2026-02-26] Task T21 Complete
- Optimistic concurrency for design writes now uses `metadata.updatedAt` as the document version token.
- `useDesignDocument` compares the locally loaded version against latest `design.json` before save and returns: "Document was modified by another source. Please refresh and retry." on mismatch.
- AI design tools `addDesignElement` and `updateDesignElement` now accept optional `expectedVersion`; stale writes return structured conflict details: `{ error: "Stale document version", currentVersion, expectedVersion }`.
- Successful AI design writes now monotonically advance `metadata.updatedAt` with `Math.max(Date.now(), currentVersion + 1)` to avoid same-timestamp collisions.

## T13: Selection Overlay v2 with Transform Handles
- **Skia Primitives for UI**: Used `Rect`, `Circle`, and `Line` from `@shopify/react-native-skia` to draw the selection overlay and transform handles. This ensures the handles are rendered in the same canvas context as the design elements, avoiding HTML/CSS overlays which can be tricky to align with the canvas camera (zoom/pan).
- **Bounding Box Calculation**: Reused the bounding box logic from hit testing. For `line` elements, the bounding box is derived from `Math.min(x1, x2)` and `Math.abs(x2 - x1)`. For `path` elements, a fixed 40x40 fallback is used since the schema doesn't store width/height for paths.
- **Handle Rendering**: Rendered 8 resize handles (corners and edge midpoints) and 1 rotation handle (above top-center). Used a contrasting fill (white) and stroke (blue) to make them visible against any background.
- **React Keys in Skia**: When mapping over arrays to render Skia elements (like the 8 handles), it's important to use unique string IDs for keys rather than array indices to avoid React warnings and potential rendering issues during updates.

## [2026-02-26] Task T20 Complete
- Updated `api/src/ai/agent/stages/design.ts` to target v1.1 schema and include new element types/styles.
- Updated `api/src/agent/engine/prompts.ts` with a new `DESIGN SCHEMA (v1.1)` section detailing supported types and style fields.
- Fixed regression in `api/src/ai/agent/stages/build.ts` where `summarizeFrameElementTypes` was hardcoded to v1.0 types.
- Ambiguity handling guidance added to both design stage and chat prompts: make reasonable assumptions rather than asking for clarification.
- Type check passed for `api` package.

## [2026-02-26] Task T22 Complete
- `api/src/ai/agent/stages/build.ts` now summarizes design intent with stable v1.1 element ordering (`rect`, `text`, `image`, `circle`, `line`, `path`, `group`) so newer element types are always represented in prompt context.
- Added style-intent cues to build prompt context by scanning frame elements for `opacity`, `shadow`, and `gradient` usage and translating them into human-readable guidance (layering/depth, hierarchy, mood/contrast).
- Added geometric/composition cues for `circle`, `line`, `path`, and `group` to preserve visual direction without leaking design schema fields into runtime `GameDefinition` output.
- Verified `pnpm -C api type-check` passes after the build-stage summary changes.

## [2026-02-25] Task T14 Complete — Wave 2 Cross-Platform Parity Pass

### Feature Parity Matrix

| Feature | Web | Native | Notes |
|---------|-----|--------|-------|
| Rect element rendering | ✅ | ✅ | Skia `Rect` — both platforms |
| Circle element rendering | ✅ | ✅ | Skia `Circle` — both platforms |
| Line element rendering | ✅ | ✅ | Skia `Line` + `vec()` — both platforms |
| Path element rendering | ✅ | ✅ | Skia `Path` — both platforms |
| Text element rendering | ✅ | ✅ | Skia `Text` (no Paragraph needed) — both platforms |
| Image element rendering | ✅ | ✅ | `useImage` hook + `Image` component — both platforms |
| Image async resolution | ✅ | ✅ | `useDesignImageResolver` — both platforms |
| Image placeholder fallback | ✅ | ✅ | Grey rect + "IMG" label — both platforms |
| Linear gradient | ✅ | ✅ | Skia `LinearGradient` as child — both platforms |
| Radial gradient | ✅ | ✅ | Skia `RadialGradient` as child — both platforms |
| Shadow effect | ✅ | ✅ | Skia `Shadow` in `Group` wrapper — both platforms |
| Opacity | ✅ | ✅ | `Group opacity` prop — both platforms |
| Frame selection overlay | ✅ | ✅ | Blue stroke `Rect` — both platforms |
| Element selection overlay | ✅ | ✅ | Blue stroke `Rect` + 8 handles + rotation handle — both platforms |
| Frame label text | ✅ | ✅ | Skia `Text` above frame — both platforms |
| Hit testing (rect/text/image) | ✅ | ✅ | AABB in `hitTestDesignCanvas` — both platforms |
| Hit testing (circle) | ✅ | ✅ | Point-in-ellipse test — both platforms |
| Hit testing (line) | ✅ | ✅ | Point-to-segment distance — both platforms |
| Hit testing (path) | ✅ | ✅ | AABB 40×40 fallback — both platforms |
| Pan/scroll camera | ✅ | ✅ | Mouse drag (web) / GestureDetector Pan (native) |
| Pinch-to-zoom camera | ✅ | ✅ | Mouse wheel (web) / GestureDetector Pinch (native) |
| Zoom-to-fit | ✅ | ✅ | `useDesignCameraShared.zoomToFit` — shared logic |
| Keyboard shortcuts `[`, `]`, `f` | ✅ | N/A | Web-only (no keyboard hardware assumption on native) |
| Phase badge + action buttons | ✅ | ✅ | Identical UI in both panels |

### Platform Differences (Expected/Correct)
- **Input handling**: Web uses `onWheel`/`onMouseDown`/`onMouseMove`/`onMouseUp` (DOM events). Native uses `GestureDetector` with `Gesture.Pan()` + `Gesture.Pinch()` from `react-native-gesture-handler`.
- **Keyboard shortcuts**: Web only — `window.addEventListener('keydown')` for `[`, `]`, `f`. Native has no equivalent (correct).
- **GestureHandlerRootView**: Native panel wraps renderer in `GestureHandlerRootView`. Web panel wraps in a plain `View` with DOM event handlers spread on it.

### Bug Fixed
- **Web panel had duplicate "Start Implementation" button**: Two consecutive `{designPhase === "approved" && ...}` blocks — one using `backgroundColor: "#10b981"`, another using `backgroundColor: c.success || "#10b981"`. Removed the duplicate. Now matches native panel (single button).

### Pre-existing Hints (not errors, not blocking)
- `DesignCanvasRenderer.tsx`: `DesignElement` and `DesignFrame` imports are declared but never used (types are referenced only in function signatures via `any`). File owned by concurrent task — not touched.
- `DesignCanvasPanel.native.tsx`: `runOnJS` from `react-native-reanimated` shows as deprecated hint. Pre-existing, working, not blocking.

### TypeScript Check
- `npx tsc --noEmit -p apps/slopcade/tsconfig.json` → 0 errors in `panels/` directory. All remaining errors are pre-existing in unrelated files (shaders `.glsl`, amen animation, GameHallCarousel reanimated types, CodeEditor native bundle).

## [2026-02-26] Task T24 Complete — Rendering Optimization
- Added `WorldBounds` interface and two pure helpers: `getElementWorldBounds` (all 6 element types) and `isOutsideViewport` (AABB rejection test).
- `viewportBounds` useMemo: recomputes only when camera.translateX/Y, scale, width, height change. Formula: `worldLeft = -translateX/scale`, `worldRight = worldLeft + width/scale`.
- `sortedElementsByFrameId` useMemo: Map<frameId, DesignElement[]> pre-sorted by zIndex — eliminates inline `.slice().sort()` on every render.
- Frame-level culling: entire `<Group>` returned as `null` if frame bounding box is outside viewport.
- Element-level culling: `return null` before entering the type-switch for off-screen elements.
- `allElements` memo kept using `document.frames` (not culled) so images preload before scroll-into-view.
- `__DEV__` logging updated: logs `Render #N: X visible / Y total (Z culled)` using the new memos.
- TypeScript: all pre-existing errors are unrelated (GLSL modules, native bundle); no new errors in DesignCanvasRenderer.tsx (LSP clean).
- Tests: 8/8 test files pass. Pre-existing OOM crash from MicButton test persists (unrelated).
- Bounding box rules: line → min/max of x1,y1,x2,y2; path → x,y + 40×40 fallback; all others → x,y,width,height.

## Design Canvas Interactions
- When implementing drag/resize/rotate in a Skia canvas, it's better to handle pointer events at the parent `View` level rather than using `TouchableWithoutFeedback` inside the canvas. This allows for continuous tracking (`onPointerMove`) even when the pointer leaves the element's bounds.
- Skia's `transform` array applies transformations in order. To rotate an element around its center, use `[{ translateX: cx }, { translateY: cy }, { rotate: angle }, { translateX: -cx }, { translateY: -cy }]`.
- When debouncing saves to a remote document, ensure the local state is updated immediately for smooth interactions, while the remote save happens in the background.

## Design Canvas Interactions
- Implemented drag, resize, rotate, and snapping in `useDesignInteractions.ts`.
- Used `useRef` for interaction state to avoid re-renders during drag.
- Handled React Native Web event propagation by stopping propagation on `onMouseDown` when interacting with an element, while allowing `onPress` to fire for selection.
- Snapping logic computes targets from frame edges and other elements' bounds, finding the closest match within an 8px threshold (scaled by camera zoom).
- Rotation uses `Math.atan2` to compute angle from element center to mouse position, with shift-key snapping to 15-degree increments.

## T18: Multi-select and Group Basics (2026-02-26)

### Architecture
- Multi-select state (`selectedElementIds: string[]`) lives locally in `DesignCanvasPanel.tsx` (NOT in EditorProvider)
- `useDesignInteractions` accepts optional `selectedElementIds` for multi-drag support
- `DesignCanvasRenderer` accepts optional `selectedElementIds` for the combined bounding box overlay

### onElementTap Signature
- Updated to `(frameId: string, elementId: string | null, shiftKey?: boolean)` to support shift-click
- `shiftKey` comes from `event.nativeEvent.shiftKey` in the renderer's TouchableWithoutFeedback press handler
- Native panel ignores `shiftKey` (future work)

### DashPathEffect in Skia
- `DashPathEffect` IS exported from `@shopify/react-native-skia` (via renderer/components/pathEffects)
- Used as a child of `<Path>` to create dashed strokes: `<Path><DashPathEffect intervals={[dashLen, gapLen]} /></Path>`
- Intervals should be scaled by `1 / camera.scale` to stay visually consistent at any zoom level

### Group Element Schema
- `DesignElementGroupSchema` has a required `childIds: string[]` field — always include this when creating group elements
- Ungroup converts the group to a `rect` element (same bounds), since the schema uses flat structure with no nested children

### interactionState Ref
- When adding a new interaction type (`multi-drag`), all state assignments to `interactionState.current` must include ALL fields of the union type (TypeScript will error on missing required fields)
- `initialElements: Record<string, DesignElement>` stores deep-copied initial element states for multi-drag delta computation

### React-hooks Lint Warnings
- `useEffect(() => { setSelectedElementIds([]); }, [selectedDesignFrameId])` — the dep-array trigger pattern causes a lint warning ("more deps than necessary") but is a valid React pattern and doesn't fail TypeScript checks
- Pre-existing `hitTestHandles`/`getElementBounds` in `onMouseDown`/`onMouseMove` dep arrays — pre-existing ESLint warnings that don't affect tsc
- Added graceful fallbacks for missing images, fonts, and invalid paths in DesignCanvasRenderer to prevent blank rendering or crashes.
- Added a warning banner in DesignCanvasPanel to alert users when elements may not render correctly.
