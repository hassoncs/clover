# Pencil UI Redesign — Pencil.dev Style

## TL;DR

> **Quick Summary**: Redesign the Pencil design tool's UI to match the aesthetic shown in the Pencil.dev screenshot — dark theme, proper design tool layout with macOS-style titlebar, left tool sidebar, collapsible layers panel, and a minimizable chat panel on the right.
>
> **Deliverables**:
> - Fully rewritten `apps/pencil/app/index.tsx` with new layout components
> - Updated `PenCanvasPanelImpl.tsx` — floating ToolPalette suppressed/integrated
>
> **Estimated Effort**: Medium (1 file rewrite, 1 component update)
> **Parallel Execution**: NO — sequential (task 2 depends on task 1 design decisions)
> **Critical Path**: Task 1 → Task 2 → Task 3 (verify)

---

## Context

### Original Request
Redesign the Pencil tool to look like the screenshot of Pencil.dev. Copy their toolbar buttons and style, keep chat on the right but allow it to minimize.

### What We Saw in the Screenshot
- macOS-style title bar: traffic light dots (red/yellow/green), sidebar toggle icons, document filename "slopcade.pen" with breadcrumb path in center, "Agents & MCP" button right side, undo/redo, light/dark toggle, expand icon
- Left narrow vertical toolbar (~48px wide): stacked tool buttons for pointer, frame/rectangle, text, image, hand/pan, sticky note, pen/path, fill/eraser, sliders, with a layers toggle at top
- Left layers panel (~200px, collapsible via toolbar button): shows layer tree with type icons
- Main canvas: PenCanvasPanel unchanged
- Right chat sidebar (~340px): "Chat" header + "+ New Chat" button, example prompt pills when chat is empty, model selector dropdown at bottom with icons, collapsible to a thin 40px strip with rotated "Chat" label

### Current State of Files
- `apps/pencil/app/index.tsx` (676 lines): basic top toolbar (New/Load/Save text buttons), ResizableSplit with canvas + inline ChatSidebar component
- `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` (1396 lines): Contains floating `ToolPalette` (pointer + pen tools only, positioned absolute mid-left), internal `LayersPanel` in canvas area, and internal header

### Research Findings
- PenCanvasPanel accepts `selectedNodePaths`, `onSelectionChange`, `agentCursors`, `onInteractionEnd`, `onAddNode`, `onDocumentChange` props
- Internal `showLayers` state in PenCanvasPanelImpl controls its own LayersPanel — we'll want to suppress this when we have our own
- The floating `ToolPalette` is rendered only `if (onAddNode)` is passed, inside the canvas area
- Colors: existing purple theme (#818cf8 accent, #050310 bg, #0d0a1e panels, #2d2650 borders)
- New color scheme: near-black (#0d0d0d bg, #111111 sidebars, #242424 borders, keep #818cf8 accent)

---

## Work Objectives

### Core Objective
Replace the current basic toolbar + layout with a proper Figma/Pencil.dev-style design tool UI while keeping all existing functionality intact.

### Concrete Deliverables
- `apps/pencil/app/index.tsx` — fully rewritten UI (new components: TitleBar, ToolSidebar, LayersPanel, ChatSidebar, ChatCollapsedStrip)
- `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` — hide/remove floating ToolPalette (it's replaced by the new sidebar) and hide the internal CANVAS header (the titlebar replaces it)

### Definition of Done
- [ ] `pnpm web` starts without TypeScript errors
- [ ] App renders with new layout matching the screenshot design
- [ ] All tools in ToolSidebar activate correctly (pointer, frame, text, image, hand, note, pen)
- [ ] Chat sidebar opens, accepts input, collapses to strip, reopens
- [ ] Layers panel shows document layers, toggles with sidebar button
- [ ] Undo/redo work via titlebar buttons and Cmd+Z shortcut
- [ ] New/Load/Save work via titlebar buttons

### Must Have
- macOS-style title bar with traffic light dots, filename, undo/redo, New/Load/Save
- Left vertical tool sidebar with all 7+ tool buttons
- Layers panel that toggles show/hide from tool sidebar
- Chat sidebar with example prompts, model selector row, "New Chat" button
- Chat collapses to a thin 40px strip with "Chat" label
- Dark theme: `#0d0d0d` bg, `#111111` sidebars, `#242424` borders, `#e8e8e8` text, `#818cf8` accent
- Zero TypeScript errors (run `tsc --noEmit`)
- All existing functionality preserved (usePencilBridge, usePencilServer, undo/redo shortcuts, document persistence, multiplayer cursors)

### Must NOT Have (Guardrails)
- Do NOT break `usePencilBridge`, `usePencilServer`, or `applyDesignChatOpsToDocument` — keep all imports and hooks
- Do NOT change `PenCanvasPanel` props API — it must still receive the same props
- Do NOT add new npm dependencies — use `Ionicons` and existing RN primitives only
- Do NOT use CSS `@keyframes` or `style` tags — use Reanimated or StyleSheet only
- Do NOT change any files outside `apps/pencil/app/index.tsx` and `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` (unless minor)
- Do NOT add horizontal scrolling or overflow issues

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test files for pencil app UI)
- **Automated tests**: None (UI-only visual change)
- **Framework**: N/A
- **Agent-Executed QA**: YES via browser screenshot

### QA Policy
Agent will use `pnpm web` to start the Pencil app and take screenshots to verify the layout matches expectations.

---

## Execution Strategy

### Sequential Execution

```
Step 1: Rewrite apps/pencil/app/index.tsx
  - All new components (TitleBar, ToolSidebar, LayersPanel, ChatSidebar, ChatCollapsedStrip)
  - New color constants
  - Keep all existing state/logic
  
Step 2: Update PenCanvasPanelImpl.tsx
  - Remove/hide floating ToolPalette (or accept activeTool as prop)
  - Remove/hide internal "CANVAS" header (it's replaced by TitleBar)
  - Keep LayersPanel logic but conditionally hide based on new prop

Step 3: TypeScript check + visual verify
  - Run tsc --noEmit in the pencil app
  - Start web and screenshot
```

---

## TODOs

- [x] 1. Rewrite `apps/pencil/app/index.tsx` with Pencil.dev-style UI

  **What to do**:
  - Define a color constants object `C` at the top with the new dark theme colors
  - Create `TitleBar` component (44px height):
    - Left: three colored dots (red=#ff5f57, yellow=#febc2e, green=#28c840, each 12px, gap 8), then a divider, then 3 icon buttons (grid-outline, bookmark-outline, add)
    - Center: document-outline icon + "slopcade.pen" text (fontSize 13, fontWeight 500) + "/" separator + muted path text + green dot if isConnected
    - Right: undo/redo buttons (arrow-undo-outline / arrow-redo-outline, disabled when !canUndo/!canRedo), divider, New/Load/Save buttons (with icons + labels), divider, "Agents & MCP" pill button with flash-outline icon, divider, sunny-outline, expand-outline buttons
  - Create `ToolSidebar` component (48px wide):
    - Background `#111111`, border-right `#242424`
    - Top: layers toggle button (layers-outline icon, active = `#2a2a2a` bg, `#e8e8e8` icon)
    - Separator line
    - Tool buttons for: pointer (navigate-outline), frame (square-outline), text (text-outline), image (image-outline), hand (hand-left-outline), note (document-text-outline), pen (pencil-outline)
    - Each button: 36×36, borderRadius 7, icon 16px — inactive color `#555555`, active color `#e8e8e8` with `#2a2a2a` bg
    - Separator
    - Two more utility buttons: diamond-outline (fill), options-outline (properties)
    - Flex spacer then search-outline zoom button at bottom
  - Create `LayersPanel` component (200px wide):
    - Header row: "Layers" label (uppercase, fontSize 11, textSecondary)
    - ScrollView with layer tree rendering using `doc.children`
    - Each layer row: 26px tall, chevron for expand/collapse, type icon (use same TYPE_ICONS map), name text
    - Selected row gets `#1e1e2a` background
    - Depth indentation: `8 + depth * 14` paddingLeft
  - Create `ChatSidebar` component (340px wide):
    - Background `#111111`, border-left `#242424`
    - Header: "Chat" title (13px, fontWeight 600) on left + "+ New Chat" button (bordered pill) + chevron-forward close button on right
    - Context pill if a node is selected
    - Messages ScrollView (flex 1)
    - Empty state: centered hint text + 4 example prompt pills + 2 tip texts
    - When messages exist: user bubbles (right-aligned, `#818cf8` bg) + AI bubbles (left-aligned, `#1a1a1a` bg, bordered)
    - Bottom section (bordered top):
      - "Design with Claude or Codex" muted center text
      - Input row: TextInput + circular send button (`#818cf8` bg, arrow-up icon)
      - Model selector row: bordered pill with flash icon + "Claude Opus 4.6 (Best)" text + chevron-down + right side icon buttons (flash, attach, mic, person-circle)
  - Create `ChatCollapsedStrip` component (40px wide):
    - Pressable that calls onOpen
    - Centered: chatbubble-outline icon + "Chat" text rotated 90deg
  - Main `PencilScreen` component:
    - Keep ALL existing state: useDocumentHistory, selectedNodePaths, chatOpen, usePencilBridge, usePencilServer, all handlers
    - Add: `showLayers` state (default true), `activeTool` state (ToolId, default "pointer")
    - New layout: `<SafeAreaView>` > `<TitleBar>` + `<View row>` > `<ToolSidebar>` + `{showLayers && <LayersPanel>}` + `<View flex1><PenCanvasPanel /></View>` + `{chatOpen ? <ChatSidebar> : <ChatCollapsedStrip>}`
    - Map activeTool → PenCanvasPanel's "pointer" | "pen" expectation
    - Remove all old toolbar/layout code

  **Must NOT do**:
  - Do NOT remove any existing logic (useDocumentHistory, hooks, handlers, effect for undo/redo, persistDocument)
  - Do NOT add new package imports outside what's already in the file
  - Do NOT use ResizableSplit — the new layout is a fixed flex row

  **Recommended Agent Profile**:
  > Visual engineering task — pure React Native layout and styling with no logic changes
  - **Category**: `visual-engineering`
  - **Skills**: none needed
  - **Parallelization**: Sequential — do this first

  **References**:
  - Current file: `apps/pencil/app/index.tsx` — read carefully, preserve ALL imports and logic
  - Existing imports to keep: `ResizableSplit` can be removed, `PenCanvasPanel` keep, all lib imports keep, `Ionicons` from `@expo/vector-icons` (add this import)
  - Tool palette in `PenCanvasPanelImpl.tsx:311-350` — the floating palette we're replacing
  - Color reference from screenshot: very dark (#0d0d0d, #111111, #242424), accent #818cf8
  - Ionicons icon names: navigate-outline, square-outline, text-outline, image-outline, hand-left-outline, document-text-outline, pencil-outline, layers-outline, diamond-outline, options-outline, search-outline, arrow-undo-outline, arrow-redo-outline, grid-outline, bookmark-outline, add, cloud-upload-outline, folder-open-outline, document-outline, flash-outline, sunny-outline, expand-outline, chatbubble-outline, chevron-forward, attach-outline, mic-outline, person-circle-outline, albums-outline, text-outline, ellipse-outline, star-outline, remove-outline, shapes-outline, git-network-outline, apps-outline, chevron-down

  **Acceptance Criteria**:
  - [ ] File compiles: `cd apps/pencil && npx tsc --noEmit` — 0 errors
  - [ ] New color constant object `C` exists at top of file
  - [ ] Components TitleBar, ToolSidebar, LayersPanel, ChatSidebar, ChatCollapsedStrip all present
  - [ ] `PencilScreen` uses new layout structure with flex row
  - [ ] `chatOpen ? <ChatSidebar> : <ChatCollapsedStrip>` pattern in render

  **QA Scenarios**:
  ```
  Scenario: Visual layout check
    Tool: Bash (start web + screenshot via agent-browser)
    Steps:
      1. cd /Users/hassoncs/Workspaces/Personal/slopcade && pnpm web:pencil (or equivalent)
      2. agent-browser open http://localhost:8085 (pencil port)
      3. agent-browser screenshot --full .sisyphus/evidence/task-1-layout.png
    Expected Result: Screenshot shows dark layout with left toolbar, layers panel, canvas, chat sidebar — NOT the old simple toolbar
    Evidence: .sisyphus/evidence/task-1-layout.png
  
  Scenario: Chat collapse
    Tool: agent-browser
    Steps:
      1. Find and click the chevron-forward (close) button in chat header
      2. agent-browser screenshot .sisyphus/evidence/task-1-chat-collapsed.png
    Expected Result: Chat collapses to a thin 40px strip with chat icon
    Evidence: .sisyphus/evidence/task-1-chat-collapsed.png
  ```

  **Commit**: YES
  - Message: `feat(pencil): redesign UI to match Pencil.dev style`
  - Files: `apps/pencil/app/index.tsx`
  - Pre-commit: `cd apps/pencil && npx tsc --noEmit`

---

- [x] 2. Update `PenCanvasPanelImpl.tsx` — suppress floating ToolPalette and internal header

  **What to do**:
  - **Option A (preferred)**: Add an optional prop `hidePalette?: boolean` to `PenCanvasPanelProps`. When true, don't render the `<ToolPalette>` component. Pass `hidePalette={true}` from the main screen. This keeps backward compatibility.
  - **Option B (simpler)**: Accept `activeTool?: "pointer" | "pen"` as a prop and sync internal `activeTool` state with it via useEffect. This lets the parent control the tool.
  - Implement BOTH: `hidePalette` prop + `externalActiveTool` prop so parent can control tool from ToolSidebar
  - **For the internal header**: Add an optional `hideHeader?: boolean` prop. When true, don't render the `<View style={styles.header}>` at line 894. This way the TitleBar from index.tsx serves as the only header.
  - **Internal LayersPanel**: Add `hideLayers?: boolean` prop. When true, don't render `{showLayers && <LayersPanel>}`. The new LayersPanel in index.tsx replaces it.
  - Update `PencilScreen` in index.tsx to pass: `hidePalette={true}`, `externalActiveTool={penCanvasTool}`, `hideHeader={true}`, `hideLayers={true}`

  **Must NOT do**:
  - Do NOT change the existing default behavior (no props = same as before)
  - Do NOT modify the actual canvas rendering, hit testing, or event handlers
  - Do NOT change the public export shape of `PenCanvasPanelProps`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1 (need to know what props to pass from index.tsx)
  - **Blocks**: Task 3

  **References**:
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:28-37` — PenCanvasPanelProps interface
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:304-350` — ToolPalette component
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:888-976` — render return start, header at line 894
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:1029-1034` — ToolPalette usage inside canvas
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:985-991` — showLayers / LayersPanel usage
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx:436-438` — activeTool state

  **Acceptance Criteria**:
  - [ ] `PenCanvasPanelProps` has new optional props: `hidePalette?: boolean`, `externalActiveTool?: "pointer" | "pen"`, `hideHeader?: boolean`, `hideLayers?: boolean`
  - [ ] When `hidePalette={true}`, floating ToolPalette does not render
  - [ ] When `externalActiveTool` changes, internal `activeTool` state syncs (useEffect)
  - [ ] When `hideHeader={true}`, the CANVAS header row does not render
  - [ ] When `hideLayers={true}`, internal LayersPanel never shows
  - [ ] tsc --noEmit passes on the design-canvas package

  **QA Scenarios**:
  ```
  Scenario: No floating palette when hidePalette=true
    Tool: agent-browser
    Steps:
      1. Open the pencil app
      2. agent-browser snapshot -i
      3. Verify there is no floating dark rounded box with pointer/pen icons overlaid mid-left of canvas
    Expected Result: The floating absolute-positioned tool palette is gone; only the left sidebar shows tools
    Evidence: .sisyphus/evidence/task-2-no-palette.png
  ```

  **Commit**: YES (group with task 1)
  - Message: `feat(pencil): redesign UI to match Pencil.dev style`
  - Files: `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx`, `apps/pencil/app/index.tsx`

---

## Final Verification Wave

- [x] F1. **Visual Check** — `visual-engineering`
  Open the pencil web app, take a full-page screenshot. Verify:
  - Dark bg (#0d0d0d or near-black) across entire app
  - Left side: 48px tool sidebar + 200px layers panel both visible
  - Center: canvas area
  - Right side: 340px chat sidebar
  - Titlebar shows traffic lights, "slopcade.pen" filename, undo/redo buttons, Agents & MCP button
  - Collapse chat, verify thin strip appears
  Output: `APPROVE` or `REJECT: {what's wrong}`

- [x] F2. **TypeScript Check** — `quick`
  Run `cd apps/pencil && npx tsc --noEmit`
  Run `cd packages/design-canvas && npx tsc --noEmit`
  Output: `Build [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- Single commit after both tasks: `feat(pencil): redesign UI to match Pencil.dev style`
- Files: `apps/pencil/app/index.tsx`, `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx`
- Pre-commit check: tsc --noEmit on both packages

---

## Success Criteria

### Verification Commands
```bash
# TypeScript check
cd apps/pencil && npx tsc --noEmit  # Expected: 0 errors
cd packages/design-canvas && npx tsc --noEmit  # Expected: 0 errors

# Visual check
pnpm web  # (runs pencil web app, check at localhost:8085 or similar)
```

### Final Checklist
- [ ] New dark theme layout renders matching screenshot aesthetic
- [ ] All 7 tool buttons in left sidebar functional
- [ ] Layers panel toggles correctly  
- [ ] Chat collapses/expands correctly
- [ ] Undo/redo work via titlebar and keyboard
- [ ] New/Load/Save work via titlebar
- [ ] Zero TypeScript errors
- [ ] No floating ToolPalette over canvas
