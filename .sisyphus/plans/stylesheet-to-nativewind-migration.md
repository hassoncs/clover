# StyleSheet → NativeWind Migration Plan

## Overview

Convert hardcoded colors in StyleSheet.create files to semantic NativeWind classes.
86 files use StyleSheet.create. ~122 files have hardcoded hex colors. Many overlap.

## Phase 0: Color Mapping Reference

### Available Tailwind Theme Colors (from `packages/theme/src/tailwind.ts`)

| Tailwind Class | Token Value | Hex |
|---|---|---|
| `text-text-primary` / `text-text` | `colors.text.primary` | `#111827` |
| `text-text-secondary` | `colors.text.secondary` | `#6b7280` |
| `text-text-tertiary` | `colors.text.tertiary` | `#9ca3af` |
| `text-text-inverse` / `text-white` | `colors.text.inverse` | `#ffffff` |
| `bg-background` | `semantic.background` | `#ffffff` |
| `bg-surface` | `semantic.surface` | `#ffffff` |
| `border-border` | `semantic.border` | `#e5e7eb` |
| `bg-primary` / `bg-primary-500` | `primary.500` | `#0ea5e9` |
| `bg-primary-{50-900}` | `primary.*` | scale |
| `bg-secondary` / `bg-secondary-500` | `secondary.500` | `#64748b` |
| `bg-secondary-{50-900}` | `secondary.*` | scale |
| `text-success` / `bg-success` | `colors.success` | `#10b981` |
| `text-warning` / `bg-warning` | `colors.warning` | `#f59e0b` |
| `text-error` / `bg-error` | `colors.error` | `#ef4444` |
| `text-info` / `bg-info` | `colors.info` | `#3b82f6` |
| `bg-destructive` | `colors.error` | `#ef4444` |
| `text-muted-foreground` | `secondary.500` | `#64748b` |
| `bg-muted` | `secondary.100` | `#f1f5f9` |
| `bg-ed-*` | CSS vars | editor theme |

### Existing Convention (from codebase)

Files already using NativeWind use `theme-` prefix pattern:
- `bg-theme-background`, `bg-theme-surface`, `bg-theme-surface-elevated`
- `text-theme-text`, `text-theme-text-muted`, `text-theme-text-secondary`, `text-theme-text-inverse`
- `border-theme-border`
- `bg-theme-primary`, `bg-theme-success`, `bg-theme-error`, `bg-theme-warning`

**NOTE**: The `theme-` prefix classes are NOT in the tailwind config. They must come from a custom plugin or CSS layer. Need to verify this before starting work. The tailwind preset defines `text`, `surface`, `background`, `border` etc. directly (no `theme-` prefix). The existing codebase uses `theme-` prefix extensively — follow this convention.

### Hardcoded Color → Semantic Mapping

| Hardcoded Color | Semantic Equivalent | Tailwind Class |
|---|---|---|
| `#FFFFFF`, `#fff`, `white` | text inverse / surface | `text-white` or `bg-white` |
| `#000000`, `#000`, `black` | — | `text-black` or `bg-black` |
| `#111827` | dark background | `bg-secondary-900` |
| `#1F2937` | dark surface | `bg-secondary-800` |
| `#374151` | dark border/elevated | `bg-secondary-700` |
| `#4B5563` | — | `bg-secondary-600` |
| `#6B7280` | text secondary | `text-secondary-500` |
| `#9CA3AF` | text tertiary | `text-secondary-400` |
| `#D1D5DB` | light text | `text-secondary-300` |
| `#E5E7EB` | border | `border-border` |
| `#F3F4F6` | light surface | `bg-secondary-100` |
| `#F9FAFB` | — | `bg-secondary-50` |
| `#6366F1` | indigo/accent | `bg-primary` (if primary=indigo) |
| `#4F46E5` | indigo darker | `bg-primary-600` (approx) |
| `#818CF8` | indigo lighter | `bg-primary-400` (approx) |
| `#EF4444` | error/red | `text-error` / `bg-error` |
| `#10B981` | success/green | `text-success` / `bg-success` |
| `#F59E0B` | warning/amber | `text-warning` / `bg-warning` |
| `#3B82F6` | info/blue | `text-info` / `bg-info` |
| `#4CAF50` | green (Material) | `text-success` (close enough) |
| `#22C55E` | green-500 | `text-success` |
| `#2563EB` | blue-600 | `text-info` (approx) |
| `#1a1a2e` | very dark bg | custom / `bg-black` |

**IMPORTANT**: Colors like `#6366F1` (indigo) are used as accent but the theme `primary` is `#0ea5e9` (sky blue). The codebase uses indigo extensively as the de-facto accent. This is a **design decision** — either:
1. Change the primary token to indigo, or
2. Add an `accent` color to the theme for indigo

---

## Phase 1: EASY — Pure Static StyleSheet, No Animation/Platform Logic

Files where StyleSheet.create contains ONLY static styles with hardcoded colors, no `Animated.*`, no `Platform.*`, no dynamic style computation.

### Chunk 1A: Editor Panels (dark theme, gray scale colors)
**~6 files, 1 commit**

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `components/editor/PanelTabBar.tsx` | 6 colors (grays, indigo, white) | Easy |
| `components/editor/sidebar/Sidebar.tsx` | 2 colors (grays) | Easy |
| `components/editor/ChatSheet.tsx` | 4 colors (grays, white) | Easy |
| `components/editor/ToolSheet.tsx` | 4 colors (grays, white) | Easy |
| `components/editor/preview/BinaryPreviewPanel.tsx` | 3 colors (grays, white) | Easy |
| `components/editor/FileViewer.tsx` | 6 colors (grays, white, indigo) | Easy |

### Chunk 1B: Editor Sub-panels
**~5 files, 1 commit**

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `components/editor/DiagnosticsPanel.tsx` | 8 colors (grays, error, warning) | Easy |
| `components/editor/panels/LayersPanel.tsx` | 8 colors (grays, indigo, white) | Easy |
| `components/editor/panels/HierarchyPanel.tsx` | 1 color (white) | Easy |
| `components/editor/panels/ExplorerPanel.tsx` | 0 (uses theme context) | Skip |
| `components/editor/ChatSidebar.tsx` | 0 (uses theme context) | Skip |

### Chunk 1C: Social Components
**~4 files, 1 commit**

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `components/social/LikersBottomSheet.tsx` | 7 colors (grays, white) | Easy |
| `components/social/CommentsBottomSheet.tsx` | 4 colors (grays, white) | Easy |
| `components/editor/AssetGallery/PrefabGrid.tsx` | 3 colors (grays, indigo) | Easy |
| `components/image-search/ImageSearchResults.tsx` | 2 colors (gray, indigo) | Easy |

### Chunk 1D: Simple UI Components
**~4 files, 1 commit**

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `components/editor/PreviewGate.tsx` | 4 colors (dark bg, error, gray, indigo) | Easy |
| `components/create-game/SharedDocumentPanel.tsx` | 5 colors (grays, white, rgba) | Easy |
| `components/create-game/ThreadList.tsx` | 5 colors (dark bg, indigo, white, gray) | Easy |
| `components/create-game/ChatMessageList.tsx` | 2 colors (grays) | Easy |

### Chunk 1E: More Editor Components
**~4 files, 1 commit**

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `components/editor/ResizablePanelLayout.native.tsx` | 4 colors (grays) | Easy |
| `components/editor/code-editor/CodeEditor.native.tsx` | 2 colors (gray bg) | Easy |
| `components/editor/graph/GraphEditor.native.tsx` | 2 colors (gray bg) | Easy |
| `components/create-game/ChatConversation.tsx` | 1 color (gray bg) | Easy |

---

## Phase 2: MEDIUM — Static Styles + Inline Hardcoded Colors

Files with StyleSheet AND inline `style={{ color: "#xxx" }}` or `color="#xxx"` props.

### Chunk 2A: Editor Complex Panels
**~4 files, 1 commit each**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/editor/panels/PropertiesPanel.tsx` | 20+ colors | Color picker palette — keep hardcoded for palette array |
| `components/editor/panels/AssetsPanel.tsx` | 10 colors | Mix of styles + inline |
| `components/editor/panels/DebugPanel.tsx` | 5 colors + Platform.OS | Platform check is simple |
| `components/editor/panels/LiveStatePanel.tsx` | 5 colors + Platform.select | Has Platform.select for fontFamily |

### Chunk 2B: Asset Gallery
**~3 files, 1 commit**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/editor/AssetGallery/QuickGenerationForm.tsx` | 15+ colors | Many inline + stylesheet |
| `components/editor/AssetGallery/PrefabAssetCard.tsx` | 15+ colors | Dynamic status colors |
| `components/editor/AssetGallery/PrimitivePreview.tsx` | 2 colors (defaults) | Props with defaults |

### Chunk 2C: Editor Chrome
**~4 files, 1 commit**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/editor/EditorTopBar.tsx` | 2 colors (white) | Inline color props |
| `components/editor/PreviewControls.tsx` | 5 colors + rgba | Has rgba overlays |
| `components/editor/inspector/ContextMenu.tsx` | 10 colors | StyleSheet + rgba |
| `components/editor/inspector/InspectOverlay.tsx` | 8 colors + rgba | Overlay colors |

### Chunk 2D: Asset Alignment
**~2 files, 1 commit**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/editor/AssetAlignment/AssetAlignmentEditor.tsx` | 20+ colors | Slider tint colors + stylesheet |
| `components/editor/AssetAlignment/AlignmentPreviewCanvas.tsx` | 3 colors | Dynamic light/dark |

### Chunk 2E: Generation & Progress
**~1 file, 1 commit**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/editor/Generation/GenerationProgressTracker.tsx` | 15+ colors + rgba | Status-dependent colors |

### Chunk 2F: Social & Navigation
**~3 files, 1 commit**

| File | Hardcoded Colors | Notes |
|---|---|---|
| `components/image-search/ImageSearchResultCard.tsx` | 5 colors + rgba | Dark card theme |
| `components/shared/SearchInput.tsx` | 1 rgba | Border color |
| `components/shared/ErrorBoundary.tsx` | 3 colors | Simple error display |

---

## Phase 3: HARD — Dynamic Styles, Animations, Platform-Specific

### DO NOT CONVERT (keep StyleSheet):

| File | Reason |
|---|---|
| `components/AnimatedSplashScreen.tsx` | Heavy Animated.* usage |
| `components/navigation/SidebarPlaceholder.tsx` | Animated.View + translateX |
| `components/navigation/FloatingTabBar.tsx` | Complex navigation component |
| `components/ui/MicButton.tsx` | Animated pulse effect |
| `components/ui/ShimmerText.web.tsx` | WebkitTextFillColor, web-only |
| `components/ui/ShimmerText.native.tsx` | Reanimated + LinearGradient |
| `components/editor/InteractionLayer.tsx` | Reanimated gestures |
| `components/editor/preview/ImagePreview.tsx` | Reanimated pinch-zoom |
| `components/editor/StageArea.tsx` | Complex layout + dynamic |
| `components/game/AssetLoadingScreen.tsx` | Animated progress bar |
| `components/game/GameDialog.tsx` | Animated fade overlay |
| `components/game/DevToolbar.tsx` | Platform.OS + complex |
| `components/game/TuningPanel.tsx` | Reanimated slide panel |
| `lib/game-engine/VirtualJoystickOverlay.tsx` | Dynamic touch positions |
| `lib/game-engine/VirtualDPadOverlay.tsx` | Dynamic touch + CSS triangles |
| `lib/game-engine/VirtualButtonsOverlay.tsx` | Dynamic touch positions |
| `lib/game-engine/TapZoneOverlay.tsx` | Dynamic debug colors |
| `lib/game-engine/InputDebugOverlay.tsx` | Debug overlay |
| `lib/game-engine/GameRuntimeStyles.ts` | Shared runtime styles |
| `lib/game-engine/ui/overlay/OverlayRenderer.tsx` | Dynamic game UI rendering |
| `lib/godot/GodotView.native.tsx` | 2 colors, native-only |
| `lib/godot/GodotView.web.tsx` | Web-only iframe |
| `components/WithGodot.tsx` | 1 color, wrapper |
| `components/editor/code-editor/theme.ts` | CodeMirror theme object |
| `components/discover/DiscoverMockScreen.tsx` | Mock/demo screen |
| `components/discover/mockData.ts` | Mock data colors |
| `app/examples/*.tsx` (all) | Example/demo pages |
| `app/godot-test.tsx` | Test page |
| `packages/ui/src/TextureButton.tsx` | Package component |
| `packages/ui/src/FileTree/*` | Package component |
| `packages/ui/src/stories/*` | Storybook stories |
| `components/create-game/ChatMessage.tsx` | 40+ colors, very complex |
| `components/create-game/ChatTextArea.tsx` | Dynamic + Platform |

### MAYBE LATER (color-only changes, keep StyleSheet):

These files can have their hardcoded colors replaced with token imports without converting to className:

| File | Approach |
|---|---|
| `components/editor/ActivityBar.tsx` | Uses editor theme context already |
| `components/editor/panels/LiveStatePanel.tsx` | Uses editor theme context |
| `components/editor/panels/ExplorerPanel.tsx` | Uses editor theme context |
| `components/editor/panels/HierarchyPanel.tsx` | Uses editor theme context |
| `components/navigation/AppFrameHeader.tsx` | Uses editor theme context |

---

## Phase 4: Page-Level Files (Inline Colors Only, No StyleSheet)

These files have hardcoded colors in JSX props but no StyleSheet.create. Convert inline `color="#xxx"` to semantic values.

**~8 files, 2 commits**

| File | Notes |
|---|---|
| `app/editor/[id].tsx` | 1 ActivityIndicator color |
| `app/themes/[id].tsx` | 2 ActivityIndicator colors |
| `app/themes/index.tsx` | 3 colors |
| `app/play/[id].tsx` | 1 ActivityIndicator color |
| `app/play/preview.tsx` | 1 ActivityIndicator color |
| `app/game/[id].tsx` | 1 ActivityIndicator color |
| `app/game-detail/[id].tsx` | 3 colors |
| `app/(tabs)/browse.tsx` | 3 colors |

---

## Execution Strategy

### Pre-work (before any conversion):
1. **Verify `theme-` prefix**: Confirm where `bg-theme-*` classes come from. Check for a Tailwind plugin or CSS layer that maps `theme-*` → the token values.
2. **Decide on indigo**: The codebase uses `#6366F1` (indigo) as accent but theme `primary` is `#0ea5e9` (sky). Either update the primary token or add an `accent` color.
3. **Create a color mapping cheat sheet** as a dev reference.

### Per-chunk workflow:
1. Convert StyleSheet styles to className
2. Remove unused StyleSheet entries
3. Remove `StyleSheet` import if fully converted
4. Run `tsc --noEmit` on changed files
5. Visual smoke test (if possible)
6. Atomic commit: `refactor(ui): convert {component} from StyleSheet to NativeWind`

### Commit message format:
```
refactor(ui): convert editor panel styles to NativeWind

- PanelTabBar, Sidebar, ChatSheet, ToolSheet, BinaryPreviewPanel, FileViewer
- Replace hardcoded hex colors with semantic theme classes
```

---

## Summary

| Phase | Files | Commits | Effort |
|---|---|---|---|
| 1 (Easy) | ~23 | 5 | Low |
| 2 (Medium) | ~17 | 6 | Medium |
| 3 (Hard/Skip) | ~35 | 0 | Skip |
| 4 (Pages) | ~8 | 2 | Low |
| **Total convertible** | **~48** | **~13** | |
| **Skip/Later** | **~38** | — | |
