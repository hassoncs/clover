# OpenPencil → Slopcade Integration Analysis

## Executive Summary

We have **two design tool implementations** that need to converge:

| | **Our Pencil** (Slopcade) | **OpenPencil** (open-pencil/open-pencil) |
|---|---|---|
| **License** | Proprietary (ours) | MIT (free to take anything) |
| **Renderer** | React Native Skia (Shopify) | Skia CanvasKit WASM |
| **Layout** | Custom flexbox (hand-rolled) | Yoga WASM (Meta's flexbox) |
| **UI Framework** | React Native / Expo | Vue 3 / Tauri |
| **Data Model** | `.pen` JSON (PenDocument) | Kiwi binary (Figma-native `.fig`) |
| **AI Tools** | 4 MCP tools (open/screenshot/get/apply_ops) | 75+ MCP tools (full design automation) |
| **Component System** | `PenRef` with descendants override | Figma-compatible COMPONENT/INSTANCE sync |
| **Collaboration** | None | P2P WebRTC + Yjs CRDT |
| **File Compat** | Custom `.pen` only | Figma `.fig` import/export + clipboard |
| **Editor UI** | Basic canvas panel | Full editor (toolbar, layers, properties, variables, AI chat) |
| **Platform** | Web + iOS + Android | Web + Desktop (Tauri) |

**Key Insight**: OpenPencil is ~10x more feature-complete in the design tool dimension. Our advantage is mobile/native support and tight integration with our game engine. The right strategy is **cherry-pick their engine/ideas into our React stack**, not fork their Vue app.

---

## What They Have That We Want (Prioritized)

### Tier 1: HIGH VALUE — Port ASAP

#### 1. Yoga WASM Layout Engine
- **What**: Production-quality flexbox layout via Meta's Yoga library
- **Theirs**: `packages/core/src/layout.ts` — 278 lines, clean adapter
- **Ours**: `packages/design-canvas/src/pen/layout.ts` — 334 lines, hand-rolled flexbox
- **Why port**: Yoga is battle-tested (used in React Native itself). Our hand-rolled version will always have edge cases. Yoga handles `WRAP`, `SPACE_BETWEEN`, `ABSOLUTE` positioning, nested auto-layout — all correctly.
- **Effort**: LOW — drop-in replacement. Same concepts, just backed by Yoga WASM instead of custom math. They already proved the mapping from Figma layout props → Yoga nodes.
- **Approach**: Keep our `PenFrame` types, replace the layout computation with Yoga WASM calls. Use their `layout.ts` as the reference for prop mapping.

#### 2. Rich Design Tool Suite (75 tools → MCP)
- **What**: Full set of design operations: create shapes, set fills/strokes/effects, manage components, variables, layout, text styling, export
- **Theirs**: `packages/core/src/tools/schema.ts` — 1804 lines, 75+ tools with typed params and execute functions
- **Ours**: `packages/game-inspector-mcp/src/tools/pencil.ts` — 223 lines, 4 basic tools (open/screenshot/get/apply_ops)
- **Why port**: This is the biggest gap. Their AI agents can do ANYTHING with a design. Ours can only do crude batch ops. Every `defineTool()` in their schema is a capability we're missing.
- **Effort**: MEDIUM — tools are framework-agnostic (they target a `FigmaAPI` abstraction). We need to build the equivalent API adapter for our `PenDocument` model, then port the tool definitions.
- **Approach**: Create a `PenAPI` class (analogous to their `FigmaAPI`) that wraps our document model. Then port their `defineTool()` definitions, adapting node types from Figma's UPPERCASE to our lowercase format.

#### 3. Figma `.fig` File Import/Export
- **What**: Read and write native Figma files via Kiwi binary codec
- **Theirs**: `packages/core/src/kiwi/` — full encoder/decoder for Figma's binary format, plus `fig-export.ts`
- **Ours**: Nothing — we only support our custom `.pen` JSON
- **Why port**: Opens the door to Figma interop. Designers can work in Figma and we can import their files. Massive UX win.
- **Effort**: HIGH — the Kiwi codec is complex (533 schema definitions, Zstd compression, vector network blobs). But it's already written and MIT licensed.
- **Approach**: Vendor their `kiwi/` directory wholesale. Build a bidirectional converter: `.fig` ↔ `PenDocument`. This lets us keep our simpler internal format while supporting Figma I/O.

#### 4. Full Editor Panel UI
- **What**: Complete design editor with toolbar, layers panel, properties inspector, variable editor, AI chat
- **Theirs**: `src/components/` — full Vue 3 SFC library (color picker, property panels, layers, toolbar, canvas)
- **Ours**: `packages/design-canvas/src/panels/` — basic canvas panel with web/native split
- **Why port**: A design tool without proper panels is just a canvas. We need layers, properties, variables, component management.
- **Effort**: HIGH — their UI is Vue, ours is React. Can't copy-paste. But we can use their UI as a **pixel-perfect spec** and rebuild in React.
- **Approach**: Screenshot their editor panels. Use them as design reference. Build equivalent React Native components using our existing `@slopcade/ui` library. Prioritize: properties panel → layers panel → toolbar → variables.

### Tier 2: MEDIUM VALUE — Port After Tier 1

#### 5. Component Library System
- **What**: Publish, share, and consume reusable design components across documents
- **Theirs**: COMPONENT/COMPONENT_SET/INSTANCE with override key format `"childId:propName"`, sync propagation
- **Ours**: `PenRef` with `descendants` override map, `buildComponentRegistry()` + `resolveRef()`
- **Status**: We have the basics. Their system is more mature (component sets for variants, proper override keys).
- **Effort**: MEDIUM — extend our existing `PenRef` system with variant support and cross-document component references.

#### 6. Collaboration (P2P WebRTC + Yjs)
- **What**: Real-time co-editing with no server, using CRDTs for conflict resolution
- **Theirs**: `src/composables/use-collab.ts` — Trystero (WebRTC P2P) + Yjs CRDT + y-indexeddb
- **Ours**: Nothing
- **Why port**: Enables live collaborative design sessions
- **Effort**: MEDIUM — Yjs has React bindings. Trystero is framework-agnostic. The hard part is mapping our PenDocument to Yjs shared types.
- **Approach**: Use `y-indexeddb` for persistence, Trystero for signaling, and map PenDocument nodes to a Yjs `Y.Map`.

#### 7. Color System (culori)
- **What**: Perceptual color manipulation, OkHCL support, proper color space conversions
- **Theirs**: `packages/core/src/color.ts` — 50 lines using culori library
- **Ours**: Basic hex/rgba handling scattered across components
- **Effort**: LOW — add culori dependency, create a shared color utility module.

#### 8. Variable/Theming System
- **What**: Design tokens with modes (light/dark), collections, bound variables
- **Theirs**: Full `Variable`/`VariableCollection` types in scene-graph, variables panel in UI
- **Ours**: `PenVariable` schema with basic type/value, `PenTheme` with values array
- **Status**: We have the schema foundations. Need to build the runtime resolution and UI.
- **Effort**: MEDIUM — extend our existing types, build variable resolution in the renderer.

### Tier 3: NICE TO HAVE — Future Work

#### 9. Shader Effects (SkSL)
- **What**: Custom shader effects for visual post-processing
- **Their roadmap**: Listed as future work ("Shader effects (SkSL), skewing, native OkHCL color support")
- **Our existing**: We already have a shader effects system in `packages/effects-system/` for our game engine
- **Approach**: We're actually AHEAD here. Integrate our existing effects system with the design canvas.

#### 10. Live Reload (MCP → Editor)
- **What**: When AI modifies a `.pen`/`.fig` file, the editor updates immediately
- **Their roadmap**: Listed as future ("Live reload when .fig file changes on disk")
- **Our existing**: We have a bridge pattern (`__PENCIL_BRIDGE__`) that can receive ops
- **Approach**: Enhance our bridge to support WebSocket push. When MCP tools modify the document, push changes to the editor via bridge.

#### 11. CLI & Headless Operations
- **What**: Inspect, analyze, export designs without GUI
- **Theirs**: `packages/cli/` — full CLI with info, tree, find, export, analyze commands
- **Effort**: LOW after Tier 1 tools are ported — CLI is just a different interface to the same operations.

---

## Recommended Strategy: CHERRY-PICK, NOT FORK

**Why not fork the whole thing?**
1. They're Vue, we're React — can't reuse UI components directly
2. They're CanvasKit WASM, we're React Native Skia — different rendering APIs
3. They're browser/desktop only, we need mobile too
4. Forking creates a maintenance burden tracking upstream changes

**What to vendor (copy wholesale):**
- `packages/core/src/kiwi/` — Figma binary codec (complex, no reason to rewrite)
- `packages/core/src/vector.ts` — vector network blob format
- `packages/core/src/color.ts` — color utilities (tiny, clean)

**What to port (rewrite for our stack):**
- `packages/core/src/layout.ts` → Replace our layout with Yoga WASM adapter
- `packages/core/src/tools/schema.ts` → Port tool definitions to work with PenDocument
- `packages/core/src/figma-api.ts` → Inspiration for our `PenAPI` class
- `src/components/` → Rebuild panels in React using their UI as spec

**What to reference (learn patterns, implement our own way):**
- Collaboration architecture (Yjs + WebRTC patterns)
- Component sync algorithm
- Editor state management patterns
- Screenshot/export pipeline

---

## Implementation Order

```
Phase 1: Engine Foundations (1-2 weeks)
├── 1.1: Vendor Kiwi codec + vector utilities
├── 1.2: Replace layout engine with Yoga WASM  
├── 1.3: Add culori color system
└── 1.4: Build PenAPI abstraction layer

Phase 2: AI Power (1-2 weeks)
├── 2.1: Port 75+ design tools to PenAPI
├── 2.2: Wire tools into MCP server
├── 2.3: Add .fig ↔ PenDocument converter
└── 2.4: Live reload via bridge WebSocket

Phase 3: Editor UI (2-3 weeks)  
├── 3.1: Properties inspector panel
├── 3.2: Layers panel
├── 3.3: Toolbar with shape/text tools
├── 3.4: Variables/design tokens panel
└── 3.5: Component library browser

Phase 4: Collaboration & Polish (1-2 weeks)
├── 4.1: Yjs CRDT document model
├── 4.2: WebRTC P2P via Trystero
├── 4.3: Presence/cursors
└── 4.4: Shader effects integration
```

**Total estimated effort: 5-9 weeks** with AI agent assistance for the porting work.

---

## Key Technical Decisions Needed

1. **Layout engine**: Replace our hand-rolled flexbox with Yoga WASM? (Recommendation: YES)
2. **File format**: Keep `.pen` JSON as primary, add `.fig` as import/export? Or switch to `.fig` as primary? (Recommendation: Keep `.pen` primary, add `.fig` I/O)
3. **Data model**: Keep our tree-based `PenDocument` or switch to flat map like OpenPencil? (Recommendation: Keep tree — simpler for JSON serialization, convert to flat map internally for operations)
4. **MCP strategy**: Port their 75 tools or design our own tool set? (Recommendation: Port theirs — they've already figured out what AI agents need)
5. **Collaboration library**: Yjs + Trystero (their choice) or something else? (Recommendation: Yjs is the standard — use it)
