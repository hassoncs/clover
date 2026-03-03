# .pen Renderer — Clean Break Implementation Plan

## Overview

Replace the current flat `DesignDocument` model and renderer with a .pen-native document model that achieves full rendering parity with Pencil.dev. The renderer stays Skia-based, cross-platform (web + native), and lives in `packages/design-canvas/`.

## Architecture

```
shared/src/types/pen.ts          ← .pen document schema (Zod)
packages/design-canvas/src/
  pen/                           ← NEW: all .pen-specific logic
    types.ts                     ← TypeScript types derived from Zod
    variables.ts                 ← Variable resolver ($--name → concrete value)
    themes.ts                    ← Theme context, cascading overrides
    components.ts                ← Ref resolution, descendants override application
    layout.ts                    ← Flexbox layout engine (tree → positioned rects)
    text-measure.ts              ← Text measurement for fit_content sizing
    render/                      ← Skia rendering
      PenRenderer.tsx            ← Top-level: walks resolved tree, emits Skia nodes
      nodes/                     ← Per-node-type renderers
        FrameNode.tsx
        TextNode.tsx
        RectangleNode.tsx
        EllipseNode.tsx
        PathNode.tsx
        LineNode.tsx
        PolygonNode.tsx
        IconFontNode.tsx
        GroupNode.tsx
        NoteNode.tsx             ← No-op (not rendered)
      fills.tsx                  ← Solid/gradient/image fill rendering
      strokes.tsx                ← Stroke rendering (inside/center/outside)
      effects.tsx                ← Shadow, blur, background_blur
    hitTest.ts                   ← Hit testing on resolved/laid-out tree
    parse.ts                     ← Parse + validate .pen JSON → PenDocument
  camera/                        ← KEEP existing (adapt zoomToFit for PenNode[])
  interactions/                  ← KEEP existing (adapt for tree selection model)
  panels/                        ← KEEP shell (adapt to new renderer)
  host/types.ts                  ← EXPAND for tree selection (node path instead of frame+element)
  document/useDesignDocument.ts  ← ADAPT for PenDocument load/save
  ops/canvasOps.ts               ← REWRITE for tree mutations
```

### Key Design Decisions

1. **Resolve-then-render pipeline**: PenDocument → resolve variables → resolve refs → compute layout → render Skia primitives. Each stage is a pure function, testable in isolation.

2. **Layout is a pure function**: `layoutTree(nodes, variables, viewport) → LayoutNode[]` where each `LayoutNode` has computed `absoluteX`, `absoluteY`, `computedWidth`, `computedHeight`. The renderer only reads these computed values — no layout logic in render code.

3. **Variable resolution is eager**: Before rendering, walk the tree once and replace all `$--name` references with concrete values for the active theme. This simplifies every downstream consumer.

4. **Ref resolution produces a flat-ish tree**: Ref nodes are expanded inline (deep clone of component + apply descendants overrides). The renderer never sees `ref` nodes — only resolved concrete nodes.

---

## Phase 1: Document Schema + Parser
**Goal**: Define the .pen type system and parse real .pen files.
**Dependency**: None — pure types + parsing.
**Verification**: Unit tests parse waypoint.pen successfully.

### Task 1.1: Pen Document Zod Schema
**File**: `shared/src/types/pen.ts`
**Category**: `ultrabrain` | **Skills**: None needed

Define Zod schemas for the full .pen format:

```
PenDocument         — top level: version, themes, variables, children
PenNode             — discriminated union on "type"
PenFrame            — type:"frame", children, layout, gap, padding, justify, align, fill, stroke, cornerRadius, clip, effects, reusable, slot
PenRectangle        — type:"rectangle", fill, stroke, cornerRadius, effects
PenEllipse          — type:"ellipse", innerRadius, startAngle, sweepAngle, fill, stroke
PenLine             — type:"line", stroke
PenPolygon          — type:"polygon", polygonCount, cornerRadius, fill, stroke
PenPath             — type:"path", geometry, fillRule, fill, stroke
PenText             — type:"text", content (string | TextSpan[]), fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textAlign, textAlignVertical, textGrowth, fill
PenGroup            — type:"group", children, layout
PenIconFont         — type:"icon_font", icon, iconFamily, fontSize, fill
PenRef              — type:"ref", ref (id), descendants, reusable
PenNote             — type:"note", content

PenEntityBase       — id, name?, x?, y?, width?, height?, rotation?, opacity?, flipX?, flipY?, enabled?, theme?, visible?
PenFill             — string | FillColor | FillGradient | FillImage | FillMeshGradient | PenFill[]
PenStroke           — { align, thickness (number | {top,right,bottom,left}), join, cap, dashPattern, fill }
PenEffect           — { shadow?, blur?, background_blur? }
PenShadow           — { color, offsetX, offsetY, blur, spread?, inner? }
PenVariable         — { type: "color"|"number"|"string"|"boolean", value: literal | ThemedValue[] }
PenThemedValue      — { value: any, theme?: { [axis]: string } }
PenPadding          — number | [vertical, horizontal] | [top, right, bottom, left]
PenSizing           — number | "fill_container" | "fill_container(N)" | "fit_content" | "fit_content(N)"
```

Also export `parsePenDocument(data: unknown): PenDocument` with Zod validation.

### Task 1.2: Parser + Test Fixture
**File**: `shared/src/types/__tests__/pen.test.ts`
**Category**: `quick`

- Copy `waypoint.pen` to `shared/src/types/__tests__/fixtures/waypoint.pen`
- Write test: `parsePenDocument(JSON.parse(fs.readFileSync(...)))` succeeds
- Write test: validates a minimal hand-crafted .pen doc
- Write test: rejects invalid docs with clear errors

---

## Phase 2: Variable + Theme Resolution
**Goal**: Resolve all `$--name` references to concrete values.
**Dependency**: Phase 1 (types).
**Verification**: Unit tests resolve themed variables correctly.

### Task 2.1: Variable Resolver
**File**: `packages/design-canvas/src/pen/variables.ts`
**Category**: `quick`

```typescript
interface ThemeContext {
  axes: Record<string, string>; // e.g. { Mode: "Dark" }
}

function resolveVariable(
  name: string,  // e.g. "--primary"
  variables: PenDocument["variables"],
  theme: ThemeContext
): string | number | boolean;

function resolveValue<T>(
  value: T,
  variables: PenDocument["variables"],
  theme: ThemeContext
): T;  // If T contains "$--xxx", resolve it. Otherwise return as-is.
```

### Task 2.2: Theme Context + Cascade
**File**: `packages/design-canvas/src/pen/themes.ts`
**Category**: `quick`

```typescript
function buildThemeContext(
  documentThemes: PenDocument["themes"],
  nodeThemeOverride?: Record<string, string>,
  parentContext?: ThemeContext
): ThemeContext;
```

Nodes can set `theme: { Mode: "Dark" }` which overrides the parent context for that node and its children.

### Task 2.3: Tree-wide Variable Resolution Pass
**File**: `packages/design-canvas/src/pen/variables.ts`
**Category**: `quick`

```typescript
function resolveTreeVariables(
  nodes: PenNode[],
  variables: PenDocument["variables"],
  themes: PenDocument["themes"],
  parentTheme?: ThemeContext
): ResolvedPenNode[];  // Same shape, but all $--refs replaced with concrete values
```

Walk the tree depth-first. At each node, build the local ThemeContext (inheriting parent + applying node override), then resolve all property values.

### Task 2.4: Tests
**File**: `packages/design-canvas/src/pen/__tests__/variables.test.ts`
**Category**: `quick`

- Resolve simple variable
- Resolve themed variable (Light vs Dark)
- Resolve nested theme override (parent=Light, child overrides to Dark)
- Resolve number and string variables
- Unresolved variable returns the `$--name` as-is (graceful fallback)

---

## Phase 3: Component (Ref) Resolution
**Goal**: Expand all `ref` nodes into concrete node trees.
**Dependency**: Phase 1 (types), Phase 2 (variables — for resolving variable refs in descendants overrides).
**Verification**: Unit tests correctly expand refs with descendants overrides.

### Task 3.1: Component Registry
**File**: `packages/design-canvas/src/pen/components.ts`
**Category**: `ultrabrain`

```typescript
function buildComponentRegistry(
  nodes: PenNode[]
): Map<string, PenNode>;
// Walk tree, collect all nodes with reusable: true, index by id

function resolveRef(
  refNode: PenRef,
  registry: Map<string, PenNode>
): PenNode;
// 1. Deep clone the referenced component
// 2. Apply descendants overrides (slash-separated paths)
// 3. Return the resolved tree (with refNode's own x/y/width/height/etc. applied)

function resolveAllRefs(
  nodes: PenNode[],
  registry: Map<string, PenNode>
): PenNode[];
// Walk tree, replace every ref with resolved clone
// Handle nested refs (component containing refs to other components)
// Detect circular refs and bail
```

Key complexity: descendants override paths are slash-separated (`instanceId/childId/grandchildId`). The override is a partial property patch applied to that descendant after cloning.

### Task 3.2: Tests
**File**: `packages/design-canvas/src/pen/__tests__/components.test.ts`
**Category**: `quick`

- Resolve simple ref → clones component
- Apply descendants override → changes nested text content
- Override disables a child (enabled: false)
- Nested refs (component A contains ref to component B)
- Circular ref detection
- Ref with own width/height overrides component's dimensions

---

## Phase 4: Layout Engine
**Goal**: Compute absolute positions for all nodes from the flexbox tree.
**Dependency**: Phase 1 (types), Phase 3 (ref resolution — layout needs the resolved tree).
**Verification**: Unit tests verify layout positions match expected values.

### Task 4.1: Layout Engine Core
**File**: `packages/design-canvas/src/pen/layout.ts`
**Category**: `ultrabrain` | **Skills**: None

This is the hardest piece. Implements a subset of CSS Flexbox:

```typescript
interface LayoutRect {
  x: number;       // absolute x in world space
  y: number;       // absolute y in world space
  width: number;   // computed width
  height: number;  // computed height
}

interface LayoutNode {
  node: ResolvedPenNode;  // original node (variables + refs resolved)
  rect: LayoutRect;       // computed position + size
  children: LayoutNode[]; // laid-out children
  clip: boolean;          // whether to clip children to this rect
}

function layoutTree(
  nodes: ResolvedPenNode[],
  textMeasure: TextMeasureFn
): LayoutNode[];
```

Layout rules:
1. **`layout: "none"` (or absent)**: Children use their own `x`/`y` relative to parent. `width`/`height` are literal.
2. **`layout: "horizontal"`**: Children are laid out left-to-right. `gap` between them. `padding` insets the content area. `justifyContent` distributes along main axis. `alignItems` aligns along cross axis.
3. **`layout: "vertical"`**: Same but top-to-bottom.
4. **`"fill_container"`**: Size = remaining space in parent (like `flex: 1`).
5. **`"fill_container(N)"`**: Same but with N as fallback if no parent constraint.
6. **`"fit_content"`**: Size = intrinsic size of content (measured children or text measurement).
7. **`"fit_content(N)"`**: Same with fallback.
8. **Padding**: Parse `number`, `[v, h]`, or `[top, right, bottom, left]` into 4 values.
9. **Top-level nodes**: Use their own `x`/`y` as absolute canvas position.

### Task 4.2: Text Measurement
**File**: `packages/design-canvas/src/pen/text-measure.ts`
**Category**: `quick`

```typescript
type TextMeasureFn = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight?: string,
  maxWidth?: number
) => { width: number; height: number };
```

For initial implementation: estimate based on fontSize × character count × 0.6 ratio. Can be refined later with actual Skia Paragraph measurement.

### Task 4.3: Tests
**File**: `packages/design-canvas/src/pen/__tests__/layout.test.ts`
**Category**: `quick`

- Absolute positioning (layout: none)
- Horizontal layout with gap
- Vertical layout with padding
- fill_container sizing
- fit_content sizing
- Nested layouts (vertical containing horizontal)
- justifyContent: center, space-between
- alignItems: center, stretch

---

## Phase 5: Skia Renderer
**Goal**: Walk the laid-out tree and emit Skia primitives for each node.
**Dependency**: Phase 4 (layout — renderer reads LayoutNode tree).
**Verification**: Render waypoint.pen on screen, visual comparison.

### Task 5.1: Fill Rendering
**File**: `packages/design-canvas/src/pen/render/fills.tsx`
**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux`

Render all fill types as Skia children:
- Solid color → `color` prop
- Gradient → `<LinearGradient>`, `<RadialGradient>`, or angular (sweep) gradient
- Image fill → `<Image>` with fit mode
- Multiple fills → render in order (stack)
- `enabled: false` → skip

### Task 5.2: Stroke Rendering
**File**: `packages/design-canvas/src/pen/render/strokes.tsx`
**Category**: `visual-engineering`

Render strokes with alignment:
- `center` → default Skia stroke
- `inside` → clip to shape, stroke at 2× width
- `outside` → expand shape by stroke width, stroke at 2× width
- Per-side thickness → 4 individual line segments
- Dash pattern support

### Task 5.3: Effects Rendering
**File**: `packages/design-canvas/src/pen/render/effects.tsx`
**Category**: `visual-engineering`

- `shadow` → Skia `<Shadow>` (dx, dy, blur, color). Inner shadows need masking.
- `blur` → Skia `<Blur>` image filter
- `background_blur` → Skia `<BackdropBlur>` (if supported, else skip)
- Multiple effects stacked

### Task 5.4: Node Renderers
**Files**: `packages/design-canvas/src/pen/render/nodes/*.tsx`
**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux`

Each renderer receives a `LayoutNode` and emits Skia elements:

| File | Node Type | Key Logic |
|------|-----------|-----------|
| `FrameNode.tsx` | frame | Rect with cornerRadius, fill, stroke, effects. `<Group clip={...}>` if `clip:true`. Recursively render children. |
| `RectangleNode.tsx` | rectangle | Same as frame but no children |
| `EllipseNode.tsx` | ellipse | `<Circle>` or ellipse path. Support innerRadius (donut), startAngle/sweepAngle (arc) |
| `TextNode.tsx` | text | Skia `<Paragraph>` with font resolution. Handle textGrowth modes. Rich text spans. |
| `PathNode.tsx` | path | Skia `<Path>` from geometry string. Transform to node position. fillRule support. |
| `LineNode.tsx` | line | Skia `<Line>` with stroke |
| `PolygonNode.tsx` | polygon | Generate regular polygon path from polygonCount + cornerRadius |
| `IconFontNode.tsx` | icon_font | Render icon glyph from lucide/feather/material-symbols font. Fallback to placeholder. |
| `GroupNode.tsx` | group | `<Group>` with opacity/transform, render children |
| `NoteNode.tsx` | note | No-op (return null) |

### Task 5.5: Top-Level Renderer
**File**: `packages/design-canvas/src/pen/render/PenRenderer.tsx`
**Category**: `visual-engineering`

```tsx
interface PenRendererProps {
  document: PenDocument;
  camera: { translateX: number; translateY: number; scale: number };
  width: number;
  height: number;
  selectedNodePath?: string[];  // path from root to selected node
  onNodeTap?: (nodePath: string[]) => void;
}

function PenRenderer({ document, camera, width, height, ... }: PenRendererProps) {
  // 1. Build component registry
  // 2. Resolve all refs
  // 3. Resolve all variables for active theme
  // 4. Compute layout
  // 5. Cull to viewport
  // 6. Render Skia tree
  // Memoize aggressively — recompute only when document/theme changes
}
```

### Task 5.6: Frame Title Labels
**Category**: `quick`

Render frame names above top-level frames (like Pencil.dev shows "Row 1 — Onboarding & Auth" labels).

---

## Phase 6: Integration + Panel Wiring
**Goal**: Wire the new renderer into the existing panel shell and pencil app.
**Dependency**: Phase 5 (renderer exists).
**Verification**: Load waypoint.pen in the pencil app, pan/zoom, see rendered frames.

### Task 6.1: Update Host Types
**File**: `packages/design-canvas/src/host/types.ts`
**Category**: `quick`

Expand `DesignCanvasHost` for tree-based selection:
```typescript
interface DesignCanvasHost {
  document: PenDocument | null;  // was DesignDocument
  selectedNodePath: string[] | null;  // path from root to selected node
  selectNode: (path: string[]) => void;
  clearSelection: () => void;
  activeTheme: Record<string, string>;  // e.g. { Mode: "Light" }
  setActiveTheme: (theme: Record<string, string>) => void;
  // ... keep designMode, designPhase
}
```

### Task 6.2: Update Document Hook
**File**: `packages/design-canvas/src/document/useDesignDocument.ts`
**Category**: `quick`

Adapt to load/save PenDocument instead of DesignDocument. The IO interface stays the same (loadDocument returns string, saveDocument takes string).

### Task 6.3: Update Panel Impl
**File**: `packages/design-canvas/src/panels/DesignCanvasPanelImpl.tsx`
**Category**: `visual-engineering`

Replace `<DesignCanvasRenderer>` with `<PenRenderer>`. Keep the panel header, zoom controls, frame navigation. Adapt frame list to read from `document.children` (top-level frames).

### Task 6.4: Update Hit Testing
**File**: `packages/design-canvas/src/pen/hitTest.ts`
**Category**: `quick`

Hit test against the laid-out tree. Return the path from root to the deepest hit node. Used for selection + cursor changes.

### Task 6.5: Update Canvas Ops
**File**: `packages/design-canvas/src/ops/canvasOps.ts`
**Category**: `quick`

Rewrite for tree mutations:
- `insertNode(parentPath, node, index)`
- `updateNode(nodePath, patch)`
- `deleteNode(nodePath)`
- `moveNode(fromPath, toParentPath, index)`

### Task 6.6: Update Pencil App
**File**: `apps/pencil/app/index.tsx`
**Category**: `quick`

- Load waypoint.pen from filesystem (or bundled asset)
- Wire up new host interface
- Update `__PENCIL_BRIDGE__` for new document model

### Task 6.7: Update Interactions
**File**: `packages/design-canvas/src/interactions/useDesignInteractions.ts`
**Category**: `visual-engineering`

Adapt drag/resize/rotate to work with tree-based node paths and layout-computed positions.

### Task 6.8: Update Package Exports
**File**: `packages/design-canvas/src/index.ts`
**Category**: `quick`

Export new types: `PenRenderer`, `PenRendererProps`, new host types, new ops.

---

## Phase 7: Layers Panel + Selection Chrome
**Goal**: Show the layer tree sidebar and selection handles like Pencil.dev.
**Dependency**: Phase 6 (integration complete).
**Verification**: Layers panel shows node hierarchy, clicking selects, selection handles appear.

### Task 7.1: Layers Panel Component
**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux`

Tree view showing all nodes with expand/collapse. Shows node type icon + name. Click to select. Drag to reorder (stretch goal).

### Task 7.2: Selection Chrome
**Category**: `visual-engineering`

Blue bounding box + resize handles on selected node (already exists in current renderer, adapt for tree-based selection with layout-computed rects).

---

## Phase 8: Polish + Parity Fixes
**Goal**: Close remaining gaps found during visual comparison.
**Dependency**: Phase 7.
**Verification**: Side-by-side comparison with Pencil.dev rendering of waypoint.pen.

### Task 8.1: Font Loading
Load actual fonts (Inter, SF Pro, etc.) for accurate text rendering. Register with Skia FontManager.

### Task 8.2: Icon Font Rendering
Bundle lucide icon font (or SVG paths) for icon_font node rendering.

### Task 8.3: Corner Radius Variations
Support per-corner radius (4-value cornerRadius arrays).

### Task 8.4: Clip/Overflow
Ensure frames with `clip: true` properly clip children using Skia clip paths.

### Task 8.5: FlipX/FlipY
Apply scale transforms for flipped nodes.

### Task 8.6: Image Fill Loading
Async load image URLs and render as fills on frames.

---

## Parallelization Map

```
Phase 1 ─────────────────────────────────┐
                                          │
Phase 2 (variables/themes) ──────────────┤── can start after Phase 1
Phase 3 (component resolution) ──────────┤── can start after Phase 1
                                          │
Phase 4 (layout engine) ─────────────────┤── needs Phase 1 + 3
                                          │
Phase 5.1-5.3 (fills/strokes/effects) ───┤── can start after Phase 1 (pure rendering utils)
Phase 5.4-5.6 (node renderers) ──────────┤── needs Phase 4 + 5.1-5.3
                                          │
Phase 6 (integration) ───────────────────┤── needs Phase 5
Phase 7 (layers + selection) ────────────┤── needs Phase 6  
Phase 8 (polish) ────────────────────────┘── needs Phase 7
```

**Wave 1** (parallel): Phase 1
**Wave 2** (parallel): Phase 2 + Phase 3 + Phase 5.1-5.3
**Wave 3** (parallel): Phase 4
**Wave 4** (parallel): Phase 5.4-5.6
**Wave 5**: Phase 6
**Wave 6**: Phase 7
**Wave 7**: Phase 8

## Migration Notes

- The old `DesignDocument` types in `shared/src/types/design.ts` remain for backward compat — don't delete yet
- The old `DesignCanvasRenderer.tsx` stays as a fallback until new renderer is proven
- The pencil app switches to new renderer; other apps (slopcade editor) keep old renderer until migration
- `design-migrations.ts` can later include a `DesignDocument → PenDocument` converter if needed

## Estimated Scope

| Phase | Tasks | Complexity | Est. Files |
|-------|-------|------------|------------|
| 1. Schema | 2 | Medium | 2 |
| 2. Variables | 4 | Low-Medium | 3 |
| 3. Components | 2 | High | 2 |
| 4. Layout | 3 | Very High | 3 |
| 5. Renderer | 6 | High | 14 |
| 6. Integration | 8 | Medium | 8 |
| 7. Layers/Selection | 2 | Medium | 2 |
| 8. Polish | 6 | Low-Medium | 6 |
| **Total** | **33** | | **~40 files** |
