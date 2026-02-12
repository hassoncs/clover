# File Tree Sidebar — VS Code-Quality Cross-Platform Implementation

## TL;DR

> **Quick Summary**: Build a fully-featured hierarchical file tree component (expand/collapse, DnD reparenting, inline rename, multi-select, search, keyboard nav, virtualization, multi-root) in `packages/ui/` using `@headless-tree/core` for shared state with platform-specific renderers (`@headless-tree/react` on web, custom Reanimated + Gesture Handler on native). Includes API changes to return hierarchical file data and integration into the editor sidebar.
> 
> **Deliverables**:
> - `packages/ui/src/FileTree/` — cross-platform FileTree component (web + native)
> - Updated tRPC endpoint returning hierarchical workspace file data
> - `useFileTree` hook for state management
> - Integration into `ResponsiveEditorLayout` as a new Explorer panel
> - Removal of orphaned `app/components/editor/FileTree.tsx`
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (deps) → Task 2 (types) → Task 3 (API) → Task 5 (web renderer) → Task 9 (integration)

---

## Context

### Original Request
Build a file picker sidebar for the editor view. Should be a generic, reusable component with expandable/collapsible hierarchical file tree, animated, with file icons, drag-and-drop (including reparenting), inline renaming. Must work on both web and React Native (iOS/Android). VS Code sidebar quality.

### Interview Summary
**Key Discussions**:
- **Architecture**: `@headless-tree/core` for shared state + platform renderers (user agreed)
- **Data model**: API will return hierarchical data (not infer from flat paths)
- **MVP scope**: Full feature set in one pass — no phasing
- **Component location**: `packages/ui/` following SortableList pattern
- **Multi-root**: Support from the start
- **Tests**: After implementation, not TDD

**Research Findings**:
- Existing `SortableList` in `packages/ui/` is the exact pattern to follow: `types.ts` + `.web.tsx` + `.native.tsx` + barrel exports
- `@headless-tree/core` state management is platform-agnostic; `dragAndDropFeature` and `hotkeysFeature` are DOM-dependent
- headless-tree outputs flat visible-node list with depth metadata → maps perfectly to FlashList
- `@mgcrea/react-native-dnd` provides useDraggable/useDroppable hooks for reparenting on native
- react-native-sortables CANNOT do reparenting (confirmed by author, Issue #297)
- Libraries already installed: reanimated ^4.1.6, gesture-handler ^2.30.0, @shopify/flash-list ^2.2.2, @dnd-kit/*
- NOT installed: @headless-tree/core, @headless-tree/react, @mgcrea/react-native-dnd

### Metis Review
**Identified Gaps** (addressed):
- **Native DnD risk**: `@mgcrea/react-native-dnd` may have Reanimated v4 compatibility issues → Added spike task (Task 4) with fallback
- **API data schema undefined**: Need exact hierarchical response shape → Defined in Task 3
- **Multi-select on touch**: Long-press + checkboxes pattern → Defined in native renderer task
- **Keyboard nav on mobile**: Web-only for MVP → Scoped to web renderer
- **Edge cases**: Empty folders, deep nesting, special characters, rapid interactions → Added to acceptance criteria
- **Performance threshold**: Need 60fps with 1000+ nodes → Added to success criteria

---

## Work Objectives

### Core Objective
Deliver a production-quality, cross-platform hierarchical file tree component with full VS Code-level feature parity (DnD reparenting, inline rename, multi-select, search, keyboard nav, virtualization) living in `packages/ui/`, powered by `@headless-tree/core`, and integrated into the editor sidebar.

### Concrete Deliverables
- `packages/ui/src/FileTree/types.ts` — shared types & interface
- `packages/ui/src/FileTree/FileTree.web.tsx` — web renderer using `@headless-tree/react`
- `packages/ui/src/FileTree/FileTree.native.tsx` — native renderer using Reanimated + Gesture Handler
- `packages/ui/src/FileTree/index.ts` + `index.web.ts` + `index.native.ts` — barrel exports
- `packages/ui/src/FileTree/useFileTreeState.ts` — shared state hook wrapping headless-tree core
- Updated `chatThreads.listWorkspaceFiles` tRPC endpoint with hierarchical response
- `app/components/editor/sidebar/ExplorerPanel.tsx` — sidebar panel integrating FileTree
- Updated `Sidebar.tsx` with Explorer panel
- Tests for tree utilities and components
- Orphaned `app/components/editor/FileTree.tsx` deleted

### Definition of Done
- [ ] FileTree renders hierarchical data on both web and native
- [ ] Expand/collapse animates smoothly on both platforms
- [ ] File selection opens file in StageArea editor tabs
- [ ] DnD reparenting works on web (native: works OR graceful fallback documented)
- [ ] Inline rename triggers API save on both platforms
- [ ] Search/filter narrows visible tree on both platforms
- [ ] Multi-select works on web (keyboard) and native (long-press toggle)
- [ ] Keyboard navigation works on web (arrows, enter, space, home, end, typeahead)
- [ ] Virtualization handles 1000+ nodes at 60fps
- [ ] Multi-root workspace renders multiple top-level trees
- [ ] All automated tests pass
- [ ] No TypeScript errors (`tsc --noEmit`)

### Must Have
- Cross-platform (web + iOS + Android)
- Hierarchical expand/collapse with animation
- File type icons (by extension)
- Single & multi-select
- DnD reparenting on web
- Inline rename
- Search/filter
- Keyboard navigation on web
- Virtualization for large trees
- Multi-root workspace support
- ARIA accessibility on web (role="tree", role="treeitem")
- Integration into editor sidebar

### Must NOT Have (Guardrails)
- No file system operations (create/delete file/folder) — tree is read-only + rename only
- No git integration (branch indicators, diff markers)
- No file preview on hover
- No context menus (right-click/long-press) — selection and DnD only
- No file drag from OS into tree (no external DnD sources)
- No lazy loading / pagination of tree data — full tree loaded upfront
- No custom icon themes — use a fixed icon mapping by file extension
- No collaborative multi-user tree state
- No undo/redo for tree operations
- Web DnD: use headless-tree built-in, do NOT build custom DnD on web
- Native DnD: if spike (Task 4) reveals Reanimated v4 incompatibility, fall back to expand/collapse + selection only (no DnD on native)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest in packages, bun test available)
- **Automated tests**: Tests after implementation
- **Framework**: vitest (for packages/ui)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **FileTree web** | Playwright (playwright skill) | Navigate editor, interact with tree, assert DOM, screenshot |
| **FileTree native** | Bash (build verification) + interactive_bash (Metro) | Build succeeds, Metro resolves platform files |
| **API endpoint** | Bash (curl) | Send requests, parse JSON, assert hierarchical structure |
| **Types/utilities** | Bash (vitest) | Run unit tests |
| **Integration** | Playwright (playwright skill) | Full flow: sidebar → tree → file tab → editor |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Install dependencies
├── Task 2: Define shared types & data model
└── Task 4: Native DnD spike (research + prototype)

Wave 2 (After Wave 1):
├── Task 3: API endpoint for hierarchical data
├── Task 5: Web renderer (FileTree.web.tsx)
└── Task 6: Native renderer — core tree (FileTree.native.tsx)

Wave 3 (After Wave 2):
├── Task 7: Native DnD integration (based on spike results)
├── Task 8: useFileTree state hook + multi-root support
└── Task 9: Editor sidebar integration

Wave 4 (After Wave 3):
├── Task 10: Tests (unit + integration)
└── Task 11: Cleanup (delete orphan, update docs)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 5, 6 | 2, 4 |
| 2 | None | 3, 5, 6, 8 | 1, 4 |
| 3 | 1, 2 | 8, 9 | 5, 6 |
| 4 | 1 | 7 | 2, 3, 5, 6 |
| 5 | 1, 2 | 9, 10 | 3, 6 |
| 6 | 1, 2 | 7, 9, 10 | 3, 5 |
| 7 | 4, 6 | 9 | 8 |
| 8 | 2, 3 | 9 | 7 |
| 9 | 5, 6, 7, 8 | 10 | None |
| 10 | 5, 6, 9 | 11 | None |
| 11 | 10 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 4 | quick (1), unspecified-low (2), deep (4) |
| 2 | 3, 5, 6 | unspecified-high (3), visual-engineering (5), visual-engineering (6) |
| 3 | 7, 8, 9 | deep (7), unspecified-high (8), visual-engineering (9) |
| 4 | 10, 11 | unspecified-high (10), quick (11) |

---

## TODOs

- [x] 1. Install Dependencies

  **What to do**:
  - Install `@headless-tree/core` and `@headless-tree/react` in `packages/ui`
  - Install `@mgcrea/react-native-dnd` in `app/` (for native DnD spike)
  - Verify all packages resolve correctly for both web and native bundlers
  - Run `tsc --noEmit` to ensure no type conflicts

  **Must NOT do**:
  - Do not install react-arborist or react-complex-tree (we're using headless-tree)
  - Do not modify existing dependency versions
  - Do not install @tanstack/react-virtual (web virtualization handled by headless-tree)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple dependency installation, no complex logic
  - **Skills**: [`game-authoring`]
    - `game-authoring`: Project context for package structure and install commands

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: Tasks 3, 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/ui/package.json` — Where to add headless-tree deps (peerDependencies pattern)
  - `app/package.json` — Where to add @mgcrea/react-native-dnd

  **API/Type References**:
  - `packages/ui/src/SortableList/` — Reference for how dependencies are structured across packages

  **External References**:
  - npm: `@headless-tree/core` — https://www.npmjs.com/package/@headless-tree/core
  - npm: `@headless-tree/react` — https://www.npmjs.com/package/@headless-tree/react
  - npm: `@mgcrea/react-native-dnd` — https://www.npmjs.com/package/@mgcrea/react-native-dnd

  **Acceptance Criteria**:
  - [ ] `@headless-tree/core` importable from `packages/ui/src/` — `import { syncDataLoaderFeature } from '@headless-tree/core'` compiles
  - [ ] `@headless-tree/react` importable from `packages/ui/src/` — `import { useTree } from '@headless-tree/react'` compiles
  - [ ] `@mgcrea/react-native-dnd` importable from `app/` — `import { DndProvider } from '@mgcrea/react-native-dnd'` compiles
  - [ ] `tsc --noEmit` passes with zero new errors in both `packages/ui` and `app`
  - [ ] `pnpm install` succeeds without conflicts

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Dependencies install and resolve correctly
    Tool: Bash
    Preconditions: Clean working tree
    Steps:
      1. Run: pnpm install
      2. Assert: Exit code 0, no peer dep warnings for new packages
      3. Run: cd packages/ui && npx tsc --noEmit
      4. Assert: No new errors related to headless-tree
      5. Run: cd app && npx tsc --noEmit
      6. Assert: No new errors related to @mgcrea/react-native-dnd
    Expected Result: All new packages install and type-check cleanly
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `chore(deps): add headless-tree and react-native-dnd packages`
  - Files: `packages/ui/package.json`, `app/package.json`, `pnpm-lock.yaml`
  - Pre-commit: `tsc --noEmit`

---

- [x] 2. Define Shared Types & Data Model

  **What to do**:
  - Create `packages/ui/src/FileTree/types.ts` with:
    - `FileTreeNode` type: `{ id: string; name: string; type: 'file' | 'folder'; children?: string[]; parentId: string | null; meta?: { size?: number; extension?: string; icon?: string } }`
    - `FileTreeRoot` type: `{ id: string; name: string; children: string[]; }`
    - `FileTreeData` type: `Record<string, FileTreeNode>` (flat map keyed by ID, as headless-tree expects)
    - `FileTreeProps` interface for the cross-platform component: `{ data: FileTreeData; roots: string[]; onSelectFile: (id: string) => void; onRenameFile?: (id: string, newName: string) => void; onMoveFile?: (id: string, newParentId: string, index: number) => void; selectedIds?: string[]; expandedIds?: string[]; onExpandedChange?: (ids: string[]) => void; searchQuery?: string; }`
    - `FileIconMap` — mapping of file extensions to icon components/emojis
    - Utility function `pathsToTree(files: { filename: string; size: number }[]): FileTreeData` for backward compatibility with flat file lists
  - Create barrel exports: `index.ts`, `index.web.ts`, `index.native.ts`

  **Must NOT do**:
  - Do not add any rendering logic — types only
  - Do not create platform-specific types — the interface must be identical across web/native
  - Do not add headless-tree-specific types to the public API — keep it abstracted

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Pure type definitions, no UI or complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Tasks 3, 5, 6, 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/ui/src/SortableList/types.ts` — Follow this exact pattern for shared types
  - `packages/ui/src/SortableList/index.ts` — Barrel export pattern
  - `packages/ui/src/SortableList/index.web.ts` + `index.native.ts` — Platform split pattern

  **API/Type References**:
  - `app/components/editor/useWorkspaceFiles.ts:7-10` — Current flat file query response shape (`{ filename, size }[]`)
  - headless-tree data model: Items keyed by string ID, each with `name` and optional `children` (array of child IDs)

  **External References**:
  - headless-tree data model example: https://github.com/lukasbach/headless-tree/blob/main/packages/sb-react/src/utils/data.ts
  - Growi's tree item type: https://github.com/growilabs/growi/blob/master/apps/app/src/features/page-tree/

  **Acceptance Criteria**:
  - [ ] `FileTreeNode`, `FileTreeData`, `FileTreeProps` types exported from `packages/ui/src/FileTree/types.ts`
  - [ ] `pathsToTree()` utility converts `[{filename:'src/a.ts',size:100},{filename:'src/b.ts',size:200}]` into proper `FileTreeData` with folder nodes
  - [ ] Barrel files exist: `index.ts`, `index.web.ts`, `index.native.ts`
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Types compile and pathsToTree works
    Tool: Bash (bun/node REPL)
    Preconditions: Task 1 complete (deps installed)
    Steps:
      1. Run: cd packages/ui && npx tsc --noEmit
      2. Assert: No errors related to FileTree types
      3. Create a small test script that imports pathsToTree and runs it with sample data:
         Input: [{filename:'src/utils/a.ts',size:100},{filename:'src/utils/b.ts',size:200},{filename:'readme.md',size:50}]
         Assert: Output has folder 'src', folder 'src/utils', files 'a.ts', 'b.ts', 'readme.md'
         Assert: 'src' folder's children includes 'src/utils' folder ID
         Assert: Each node has correct parentId
    Expected Result: Types compile cleanly, pathsToTree produces correct tree
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ui): add FileTree types and data model`
  - Files: `packages/ui/src/FileTree/types.ts`, `packages/ui/src/FileTree/index.ts`, `packages/ui/src/FileTree/index.web.ts`, `packages/ui/src/FileTree/index.native.ts`
  - Pre-commit: `cd packages/ui && npx tsc --noEmit`

---

- [x] 3. API Endpoint — Hierarchical Workspace File Data

  **What to do**:
  - Update the `chatThreads.listWorkspaceFiles` tRPC endpoint to return hierarchical tree data
  - Response shape: `{ tree: FileTreeData; roots: string[] }` where `FileTreeData` is the flat keyed map and `roots` is array of top-level node IDs
  - If the underlying storage (R2) returns flat paths, build the tree server-side using similar logic to `pathsToTree`
  - Maintain backward compatibility: keep the existing flat response available via a query parameter or separate endpoint
  - Handle edge cases: empty workspace, single file, deeply nested (10+ levels), files with special characters

  **Must NOT do**:
  - Do not change the R2 storage format
  - Do not add file create/delete operations — read-only
  - Do not add pagination — return full tree

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API modification requiring understanding of tRPC router, R2 storage, and data transformation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `app/components/editor/useWorkspaceFiles.ts:7-10` — Current tRPC query: `chatThreads.listWorkspaceFiles.useQuery({ gameId })` returns flat `{ filename, size }[]`
  - `app/components/editor/useWorkspaceFiles.ts:15-18` — `chatThreads.readWorkspaceFile.useQuery({ gameId, filename })` for content
  - `app/components/editor/useWorkspaceFiles.ts:20` — `chatThreads.writeWorkspaceFile.useMutation()` for saves

  **API/Type References**:
  - `packages/ui/src/FileTree/types.ts` — `FileTreeData` and `FileTreeNode` types (from Task 2)

  **Documentation References**:
  - Find the tRPC router definition for `chatThreads` — likely in `api/src/` directory

  **Acceptance Criteria**:
  - [ ] `chatThreads.listWorkspaceFiles` returns `{ tree: FileTreeData; roots: string[] }` shape
  - [ ] Flat file list `['src/a.ts', 'src/b.ts', 'readme.md']` transforms to tree with `src/` folder containing `a.ts` and `b.ts`, and `readme.md` at root
  - [ ] Empty workspace returns `{ tree: {}, roots: [] }`
  - [ ] Files with special characters in names handled (spaces, dots, dashes)
  - [ ] Response validates against `FileTreeData` TypeScript type
  - [ ] Existing `useWorkspaceFiles` hook updated to consume new response shape

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: API returns hierarchical tree data
    Tool: Bash (curl)
    Preconditions: API server running on localhost:8789, test game with files exists
    Steps:
      1. curl -s http://localhost:8789/api/trpc/chatThreads.listWorkspaceFiles?input={"gameId":"test-game"} | jq '.result.data'
      2. Assert: Response has 'tree' key (object with string keys)
      3. Assert: Response has 'roots' key (array of strings)
      4. Assert: At least one node in tree has type 'folder' with children array
      5. Assert: File nodes have name, type:'file', and meta.size
    Expected Result: Hierarchical tree data with folders and files
    Evidence: Response body saved to .sisyphus/evidence/task-3-api-tree.json

  Scenario: Empty workspace returns empty tree
    Tool: Bash (curl)
    Preconditions: API server running, game with no files
    Steps:
      1. curl with empty workspace gameId
      2. Assert: tree is {}, roots is []
    Expected Result: Empty but valid response
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(api): return hierarchical tree data from listWorkspaceFiles`
  - Files: `api/src/routes/chatThreads.ts` (or wherever router lives), `app/components/editor/useWorkspaceFiles.ts`
  - Pre-commit: `cd api && pnpm test`

---

- [x] 4. Native DnD Spike — Validate @mgcrea/react-native-dnd with Reanimated v4

  **What to do**:
  - Create a minimal prototype in `packages/ui/src/FileTree/__spike__/` to validate:
    1. `@mgcrea/react-native-dnd` works with `react-native-reanimated` v4.1.6
    2. `useDraggable` + `useDroppable` hooks can implement tree reparenting
    3. Drag visual feedback (ghost item, drop target highlight) performs at 60fps
    4. Gesture handler integration with scroll views (FlashList)
  - If `@mgcrea/react-native-dnd` fails compatibility:
    - Try `react-native-reanimated-dnd` as backup
    - If both fail: document custom gesture-handler approach with layout measurement
  - **Output a decision document**: `.sisyphus/drafts/native-dnd-spike-results.md` with:
    - Which library works (or "custom" if none)
    - API patterns to use
    - Performance measurements
    - Known limitations

  **Must NOT do**:
  - Do not build the full tree renderer — this is a 2-3 node prototype only
  - Do not modify any existing code
  - Do not spend more than 2 hours on this spike

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Research-heavy spike requiring compatibility investigation and prototyping
  - **Skills**: [`game-authoring`]
    - `game-authoring`: Project context for native build and Metro configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7 (native DnD integration)
  - **Blocked By**: Task 1 (needs dependencies installed)

  **References**:

  **Pattern References**:
  - `packages/ui/src/SortableList/SortableList.native.tsx` — How native DnD is currently done (react-native-sortables)
  - `app/components/editor/InteractionLayer.tsx` — Gesture.Pan() pattern for entity dragging

  **External References**:
  - @mgcrea/react-native-dnd: https://github.com/mgcrea/react-native-dnd
  - react-native-reanimated-dnd: https://github.com/entropyconquers/react-native-reanimated-dnd
  - Reanimated v4 migration: https://docs.swmansion.com/react-native-reanimated/docs/guides/migration

  **Acceptance Criteria**:
  - [ ] Decision document written to `.sisyphus/drafts/native-dnd-spike-results.md`
  - [ ] Document contains: chosen library, API pattern, performance notes, limitations
  - [ ] If library works: minimal prototype shows drag from node A → drop on folder B → state updates
  - [ ] If library fails: alternative approach documented with code sketch
  - [ ] Spike prototype files in `packages/ui/src/FileTree/__spike__/` (will be deleted after)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Spike results documented
    Tool: Bash
    Steps:
      1. cat .sisyphus/drafts/native-dnd-spike-results.md
      2. Assert: File exists and contains "Decision:", "Library:", "Performance:"
      3. Assert: Contains either "APPROVED" or "FALLBACK" conclusion
    Expected Result: Clear go/no-go decision for native DnD
    Evidence: Document contents captured
  ```

  **Commit**: NO (spike artifacts are temporary)

---

- [x] 5. Web Renderer — FileTree.web.tsx

  **What to do**:
  - Create `packages/ui/src/FileTree/FileTree.web.tsx` using `@headless-tree/react`
  - Features to implement:
    - `useTree` with features: `syncDataLoaderFeature`, `selectionFeature`, `dragAndDropFeature`, `renamingFeature`, `hotkeysCoreFeature`, `searchFeature`
    - Expand/collapse with CSS transitions (smooth animation)
    - File type icons based on extension (use a simple icon map: 📄 .md, 📋 .json, 🎮 .gd/.tscn, 🎨 .gdshader, 📁 folder, etc.)
    - Indent lines (VS Code-style tree guides)
    - DnD with visual drop indicators (before/after/inside)
    - Inline rename (double-click → text input → Enter to confirm, Escape to cancel)
    - Multi-select (Ctrl+click, Shift+click)
    - Keyboard navigation (Arrow keys, Enter to open, Space to select, F2 to rename, Delete to request delete)
    - Search: filter tree by filename substring
    - Virtualization via `@tanstack/react-virtual` or headless-tree's built-in scroll support
    - Multi-root: render multiple root nodes as top-level collapsible sections
  - ARIA accessibility: `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`, `aria-level`
  - Style with VS Code dark theme colors matching existing editor palette (#111827, #1F2937, #374151, #6366F1)

  **Must NOT do**:
  - Do not build custom DnD — use headless-tree's built-in `dragAndDropFeature`
  - Do not build custom keyboard handling — use `hotkeysCoreFeature`
  - Do not use react-arborist or react-complex-tree
  - Do not add context menus

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI component with animations, DnD, accessibility, and styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: VS Code-quality UI implementation with proper styling and interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 6)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `packages/ui/src/SortableList/SortableList.web.tsx` — Web component pattern with @dnd-kit
  - `app/components/editor/FileTree.tsx:62-112` — Existing style values (colors, spacing, font sizes) — match these
  - `app/components/editor/sidebar/Sidebar.tsx` — Sidebar panel styling pattern

  **API/Type References**:
  - `packages/ui/src/FileTree/types.ts` — `FileTreeProps` interface (from Task 2)

  **External References**:
  - headless-tree comprehensive example: https://github.com/lukasbach/headless-tree/blob/main/examples/comprehensive/src/main.tsx
  - headless-tree storybook: https://headless-tree.lukasbach.com/storybook/react/
  - Growi page tree (production headless-tree usage): https://github.com/growilabs/growi/blob/master/apps/app/src/features/page-tree/components/ItemsTree.tsx
  - Teable tree component: https://github.com/teableio/teable/blob/develop/packages/ui-lib/src/shadcn/ui/tree.tsx
  - headless-tree features API: `syncDataLoaderFeature`, `selectionFeature`, `dragAndDropFeature`, `renamingFeature`, `hotkeysCoreFeature`, `searchFeature`, `expandAllFeature`

  **WHY Each Reference Matters**:
  - SortableList.web.tsx: Shows exactly how to structure a web-only component in packages/ui with DnD
  - Comprehensive example: Shows how to configure all headless-tree features together
  - Growi ItemsTree: Production file tree using headless-tree with async data + virtualization + DnD
  - Existing FileTree.tsx colors: Must match the established dark theme palette

  **Acceptance Criteria**:
  - [ ] Component renders hierarchical tree from `FileTreeData`
  - [ ] Folders expand/collapse with smooth CSS animation
  - [ ] File icons appear next to filenames based on extension
  - [ ] Single click selects file, calls `onSelectFile`
  - [ ] Double-click on filename enters rename mode, Enter confirms, Escape cancels
  - [ ] DnD: can drag file into folder (reparenting), visual drop indicator shows
  - [ ] Multi-select: Ctrl+click toggles selection, Shift+click range-selects
  - [ ] Keyboard: Arrow up/down moves focus, Right expands, Left collapses, Enter opens
  - [ ] Search: typing filters tree to matching filenames
  - [ ] Multi-root: multiple root nodes render as separate collapsible sections
  - [ ] ARIA: tree has role="tree", items have role="treeitem", expanded state announced
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Tree renders with expand/collapse
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running with FileTree rendered on a test page
    Steps:
      1. Navigate to page with FileTree
      2. Wait for: [role="tree"] visible (timeout: 5s)
      3. Assert: [role="treeitem"] count > 0
      4. Find a folder node (has expand arrow)
      5. Click folder node
      6. Assert: Children appear (new treeitem elements visible)
      7. Click folder again
      8. Assert: Children hidden
      9. Screenshot: .sisyphus/evidence/task-5-tree-expand.png
    Expected Result: Tree renders, folders expand and collapse
    Evidence: .sisyphus/evidence/task-5-tree-expand.png

  Scenario: DnD reparenting on web
    Tool: Playwright (playwright skill)
    Preconditions: Tree rendered with files and folders
    Steps:
      1. Identify a file node and a folder node
      2. Drag file node onto folder node
      3. Wait for: drop indicator visible
      4. Release drag
      5. Assert: File now appears as child of the target folder
      6. Screenshot: .sisyphus/evidence/task-5-dnd-reparent.png
    Expected Result: File moved into folder via drag-and-drop
    Evidence: .sisyphus/evidence/task-5-dnd-reparent.png

  Scenario: Keyboard navigation
    Tool: Playwright (playwright skill)
    Steps:
      1. Click on tree to focus it
      2. Press ArrowDown 3 times
      3. Assert: 4th item is focused (has focus indicator)
      4. Press ArrowRight on a folder
      5. Assert: Folder expands
      6. Press ArrowLeft
      7. Assert: Folder collapses
      8. Press F2
      9. Assert: Rename input appears
      10. Type "new-name.ts" + Enter
      11. Assert: onRenameFile callback was called
    Expected Result: Full keyboard navigation works
    Evidence: .sisyphus/evidence/task-5-keyboard-nav.png
  ```

  **Commit**: YES
  - Message: `feat(ui): implement FileTree web renderer with headless-tree`
  - Files: `packages/ui/src/FileTree/FileTree.web.tsx`
  - Pre-commit: `cd packages/ui && npx tsc --noEmit`

---

- [x] 6. Native Renderer — Core Tree (FileTree.native.tsx)

  **What to do**:
  - Create `packages/ui/src/FileTree/FileTree.native.tsx` with:
    - Use `@headless-tree/core` directly (NOT `@headless-tree/react`) for state — only load platform-agnostic features: `syncDataLoaderFeature`, `selectionFeature`, `searchFeature`, `renamingFeature`
    - Do NOT load `dragAndDropFeature` or `hotkeysFeature` (DOM-dependent)
    - Render visible nodes as a FlashList (flat list with depth-based indentation)
    - Expand/collapse with Reanimated v4 layout animations (`LinearTransition`)
    - Entering/exiting animations for child nodes (`FadeInDown` / `FadeOutUp`)
    - File type icons matching web (same extension → icon map)
    - Single tap to select file
    - Long-press to toggle multi-select mode
    - Inline rename: long-press on name → TextInput appears → blur or submit to confirm
    - Search: TextInput at top filters tree
    - Multi-root: multiple FlashList sections with collapsible headers
    - Touch targets minimum 44pt height
    - Scroll performance: 60fps with 1000+ nodes

  **Must NOT do**:
  - Do not implement DnD in this task — that's Task 7 (depends on spike results)
  - Do not use @headless-tree/react — use core directly
  - Do not import anything from `document` or `window`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex native UI with animations, gesture handling, and performance requirements
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Native component implementation with animation and touch handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Tasks 7, 9, 10
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `packages/ui/src/SortableList/SortableList.native.tsx` — Native component pattern with Sortable.Flex
  - `app/components/editor/FileTree.tsx` — Existing RN styles (colors, heights, spacing to match)
  - `app/components/editor/sidebar/HierarchyPanel.tsx` — Native panel layout pattern with search input

  **API/Type References**:
  - `packages/ui/src/FileTree/types.ts` — `FileTreeProps` interface (from Task 2)

  **External References**:
  - Reanimated v4 layout animations: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/
  - Reanimated accordion example: https://docs.swmansion.com/react-native-reanimated/examples/accordion/
  - FlashList docs: https://shopify.github.io/flash-list/
  - headless-tree core createTree API: https://github.com/lukasbach/headless-tree/blob/main/packages/core/src/core/create-tree.ts

  **WHY Each Reference Matters**:
  - SortableList.native.tsx: Exact structure for native component in packages/ui
  - Reanimated accordion: Almost exactly what expand/collapse tree nodes need
  - FlashList: Required for virtualization of flat node list
  - headless-tree createTree: Need to understand the non-React API for direct core usage

  **Acceptance Criteria**:
  - [ ] Component renders hierarchical tree from `FileTreeData` on iOS/Android
  - [ ] Folders expand/collapse with Reanimated layout animation
  - [ ] File icons appear next to filenames
  - [ ] Tap selects file, calls `onSelectFile`
  - [ ] Long-press on filename enters rename mode
  - [ ] Search input filters visible tree nodes
  - [ ] Multi-root renders multiple collapsible sections
  - [ ] Touch targets are minimum 44pt
  - [ ] FlashList renders 1000+ nodes without scroll jank
  - [ ] No `document` or `window` references
  - [ ] `tsc --noEmit` passes
  - [ ] Metro bundler resolves `.native.tsx` correctly

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Native tree builds and renders
    Tool: Bash (build verification)
    Preconditions: Metro running on port 8085
    Steps:
      1. Run: cd app && RCT_METRO_PORT=8085 npx expo run:ios --no-bundler 2>&1 | tail -20
      2. Assert: Build succeeds with no errors related to FileTree
      3. Verify Metro resolves FileTree.native.tsx:
         Run: curl -s "http://localhost:8085/packages/ui/src/FileTree/index.bundle?platform=ios" | head -50
      4. Assert: Bundle contains FileTree.native code, not .web code
    Expected Result: Native FileTree builds and bundles correctly
    Evidence: Build output captured

  Scenario: Platform resolution correct
    Tool: Bash
    Steps:
      1. Run: ls packages/ui/src/FileTree/
      2. Assert: Contains FileTree.web.tsx AND FileTree.native.tsx
      3. Assert: Contains index.ts, index.web.ts, index.native.ts
    Expected Result: All platform files present
    Evidence: Directory listing captured
  ```

  **Commit**: YES
  - Message: `feat(ui): implement FileTree native renderer with Reanimated animations`
  - Files: `packages/ui/src/FileTree/FileTree.native.tsx`
  - Pre-commit: `cd packages/ui && npx tsc --noEmit`

---

- [x] 7. Native DnD Integration (Based on Spike Results)

  **What to do**:
  - Read spike results from `.sisyphus/drafts/native-dnd-spike-results.md` (Task 4 output)
  - **If spike APPROVED a library**: Integrate the chosen DnD library into `FileTree.native.tsx`:
    - Wrap tree in DnD provider
    - Make each file/folder row a Draggable
    - Make each folder row a Droppable zone
    - On drop: call `onMoveFile(draggedId, targetFolderId, dropIndex)`
    - Visual feedback: highlight drop target folder, show insertion line
    - Long-press to initiate drag (don't conflict with selection long-press)
  - **If spike FALLBACK (no library works)**: Build minimal custom DnD using gesture-handler:
    - Long-press + pan gesture to drag
    - Layout measurement registry for drop zone detection
    - Shared value for drag position → reanimated animated style
    - Hit-test against registered folder layouts on UI thread
  - **If spike says DnD is not feasible**: Document limitation, skip native DnD, ensure expand/collapse + selection UX is polished as the alternative

  **Must NOT do**:
  - Do not start this task before reading spike results
  - Do not use a different library than what the spike recommends
  - Do not break existing expand/collapse/selection functionality

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex gesture integration that depends on spike research findings
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Native gesture/animation integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 4 (spike), 6 (native renderer)

  **References**:

  **Pattern References**:
  - `.sisyphus/drafts/native-dnd-spike-results.md` — **READ THIS FIRST** — spike decision document
  - `packages/ui/src/FileTree/FileTree.native.tsx` — The component to add DnD to (from Task 6)
  - `app/components/editor/InteractionLayer.tsx` — Existing gesture-handler drag pattern

  **External References**:
  - Depends on spike results — see spike document for specific library docs

  **Acceptance Criteria**:
  - [ ] **If DnD integrated**: Can drag file onto folder, folder highlights, file moves on drop
  - [ ] **If DnD integrated**: Long-press initiates drag, does not conflict with selection
  - [ ] **If DnD integrated**: 60fps during drag animation
  - [ ] **If DnD not feasible**: README documents limitation, selection UX is polished
  - [ ] No regressions to expand/collapse or selection behavior
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Native DnD works (if implemented)
    Tool: Bash (build verification)
    Steps:
      1. Build and run on iOS simulator
      2. Assert: No build errors
      3. Assert: FileTree renders with DnD gesture handlers registered
    Expected Result: Native app builds with DnD integration
    Evidence: Build output captured

  Scenario: No regression to existing tree features
    Tool: Bash
    Steps:
      1. cd packages/ui && npx tsc --noEmit
      2. Assert: No new errors
      3. Verify FileTree.native.tsx still exports default component matching FileTreeProps
    Expected Result: Type-safe, no regressions
    Evidence: tsc output captured
  ```

  **Commit**: YES
  - Message: `feat(ui): add DnD reparenting to native FileTree` (or `docs: document native DnD limitation` if fallback)
  - Files: `packages/ui/src/FileTree/FileTree.native.tsx`
  - Pre-commit: `cd packages/ui && npx tsc --noEmit`

---

- [x] 8. useFileTree State Hook + Multi-Root Support

  **What to do**:
  - Create `packages/ui/src/FileTree/useFileTreeState.ts`:
    - Wraps `@headless-tree/core` `createTree` or similar core API
    - Manages: expanded state, selected items, focused item, search query, rename state
    - Accepts `FileTreeData` + `roots: string[]` (multi-root)
    - Provides: `visibleNodes` (flat array with depth for native), `treeInstance` (for web to pass to useTree)
    - Handles multi-root by creating a virtual root node that parents all workspace roots
    - State persistence: save expanded/collapsed state to AsyncStorage/localStorage by workspace ID
  - Create `app/components/editor/useEditorFileTree.ts`:
    - Connects `useWorkspaceFiles` (tRPC data) to `useFileTreeState`
    - Maps API response to `FileTreeData`
    - Wires `onSelectFile` → `openFile()` from `useWorkspaceFiles`
    - Wires `onRenameFile` → `chatThreads.renameWorkspaceFile` mutation (if exists) or save
    - Wires `onMoveFile` → `chatThreads.moveWorkspaceFile` mutation (if exists) or save

  **Must NOT do**:
  - Do not add new tRPC mutations (rename/move) — stub them if they don't exist yet
  - Do not persist state to server — local only
  - Do not manage file content — only tree structure state

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex state management bridging headless-tree core with React and tRPC
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `app/components/editor/useWorkspaceFiles.ts` — The existing hook to integrate with
  - `app/components/editor/inspector/InspectorProvider.tsx` — Pattern for context-based state management in editor
  - `app/lib/utils/storage.ts` — Local storage pattern for state persistence

  **API/Type References**:
  - `packages/ui/src/FileTree/types.ts` — `FileTreeData`, `FileTreeProps` types

  **External References**:
  - headless-tree core createTree: https://github.com/lukasbach/headless-tree/blob/main/packages/core/src/core/create-tree.ts
  - Growi useTreeFeatures: https://github.com/growilabs/growi/blob/master/apps/app/src/features/page-tree/hooks/_inner/use-tree-features.ts

  **Acceptance Criteria**:
  - [ ] `useFileTreeState` accepts `FileTreeData` + `roots` and returns expanded/selected/focused state
  - [ ] Multi-root: virtual root node parents all workspace roots
  - [ ] `useEditorFileTree` connects tRPC data → tree state → callbacks
  - [ ] File selection in tree opens file tab in StageArea
  - [ ] Expanded state persists across component remounts (via local storage)
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: File selection opens editor tab
    Tool: Playwright (playwright skill)
    Preconditions: Editor page with FileTree integrated
    Steps:
      1. Navigate to editor page
      2. Click a file in the tree
      3. Assert: File tab appears in StageArea tab bar
      4. Assert: FileViewer shows file content
    Expected Result: Tree selection and editor tabs are synced
    Evidence: .sisyphus/evidence/task-8-file-select.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add useFileTree state hook with multi-root support`
  - Files: `packages/ui/src/FileTree/useFileTreeState.ts`, `app/components/editor/useEditorFileTree.ts`
  - Pre-commit: `tsc --noEmit`

---

- [x] 9. Editor Sidebar Integration

  **What to do**:
  - Create `app/components/editor/sidebar/ExplorerPanel.tsx`:
    - Uses `useEditorFileTree` hook (from Task 8)
    - Renders `<FileTree>` component from `packages/ui`
    - Header: "EXPLORER" with collapse button
    - Search input at top (wired to tree search)
    - Active file highlighted in tree
  - Update `app/components/editor/sidebar/Sidebar.tsx`:
    - Add ExplorerPanel as the first panel (above HierarchyPanel)
    - Adjust flex ratios: Explorer (flex: 3), Hierarchy (flex: 2), Properties (flex: 2), Debug (flex: 1)
  - Update `app/components/editor/StageArea.tsx`:
    - Remove inline file tab management if tree handles file selection
    - OR keep tab bar but sync with tree selection
  - Delete orphaned `app/components/editor/FileTree.tsx`

  **Must NOT do**:
  - Do not change the ChatSidebar or viewport layout
  - Do not remove existing sidebar panels (Hierarchy, Properties, Debug)
  - Do not change the editor's responsive breakpoint logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI integration requiring layout adjustments and component composition
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout integration and UI polish

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3 final)
  - **Blocks**: Tasks 10
  - **Blocked By**: Tasks 5, 6, 7, 8

  **References**:

  **Pattern References**:
  - `app/components/editor/sidebar/Sidebar.tsx` — Container to modify (add Explorer panel)
  - `app/components/editor/sidebar/HierarchyPanel.tsx` — Panel pattern to follow (header + search + content)
  - `app/components/editor/ResponsiveEditorLayout.tsx` — Desktop layout (Sidebar width = 320px)
  - `app/components/editor/StageArea.tsx` — Tab management to sync with tree selection
  - `app/components/editor/useWorkspaceFiles.ts` — Data source hook

  **API/Type References**:
  - `app/components/editor/useEditorFileTree.ts` — Hook from Task 8
  - `packages/ui/src/FileTree/` — FileTree component from Tasks 5/6

  **Acceptance Criteria**:
  - [ ] ExplorerPanel renders in Sidebar above HierarchyPanel
  - [ ] FileTree shows workspace files in hierarchical view
  - [ ] Clicking file in tree opens it in StageArea tab bar + FileViewer
  - [ ] Active file in editor is highlighted in tree
  - [ ] Search input in Explorer filters the tree
  - [ ] Sidebar layout balanced: Explorer panel has most space
  - [ ] Orphaned `app/components/editor/FileTree.tsx` is deleted
  - [ ] Mobile layout still works (no FileTree on mobile, or in bottom sheet)
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full editor integration flow
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, editor page accessible, game with workspace files
    Steps:
      1. Navigate to: http://localhost:8085/editor/[test-game-id]
      2. Wait for: sidebar visible with "EXPLORER" header (timeout: 10s)
      3. Assert: File tree shows hierarchical files
      4. Click on a .gdshader file in the tree
      5. Wait for: tab appears in StageArea tab bar with filename
      6. Assert: CodeEditor shows shader code
      7. Assert: Clicked file is highlighted in tree (active state)
      8. Click on a different file
      9. Assert: New tab appears, new file is highlighted, previous is deselected
      10. Screenshot: .sisyphus/evidence/task-9-full-integration.png
    Expected Result: Tree ↔ editor tab sync works end-to-end
    Evidence: .sisyphus/evidence/task-9-full-integration.png

  Scenario: Explorer panel with HierarchyPanel coexist
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to editor page
      2. Assert: Sidebar contains both "EXPLORER" and "Hierarchy" headers
      3. Assert: Both panels are visible (not overlapping)
      4. Screenshot: .sisyphus/evidence/task-9-sidebar-layout.png
    Expected Result: All sidebar panels visible and properly laid out
    Evidence: .sisyphus/evidence/task-9-sidebar-layout.png
  ```

  **Commit**: YES
  - Message: `feat(editor): integrate FileTree into sidebar as Explorer panel`
  - Files: `app/components/editor/sidebar/ExplorerPanel.tsx`, `app/components/editor/sidebar/Sidebar.tsx`, `app/components/editor/StageArea.tsx`
  - Pre-commit: `tsc --noEmit`

---

- [ ] 10. Tests — Unit + Integration

  **What to do**:
  - Write tests for:
    - `pathsToTree()` utility: flat paths → tree conversion, edge cases (empty, single file, deep nesting, special chars)
    - `useFileTreeState` hook: expand/collapse, selection, search filtering, multi-root
    - `FileTree.web.tsx`: render test, expand/collapse interaction, selection callback
    - API endpoint: hierarchical response shape, empty workspace, special characters
  - Test framework: vitest (for `packages/ui`) and existing test setup for API
  - Test location: `packages/ui/src/FileTree/__tests__/` and `api/src/__tests__/`

  **Must NOT do**:
  - Do not write E2E tests (Playwright scenarios in acceptance criteria serve that purpose)
  - Do not test headless-tree internals — only test our integration layer
  - Do not test native renderer (difficult to unit test RN animations)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple test files across different packages with different test runners
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after integration)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 5, 6, 9

  **References**:

  **Pattern References**:
  - Existing test files in `packages/ui/` and `api/src/__tests__/` — follow existing patterns

  **Test References**:
  - Find existing vitest config in `packages/ui/` — use same setup
  - Find existing API test patterns in `api/src/__tests__/`

  **Acceptance Criteria**:
  - [ ] `pathsToTree` tests pass: empty, single file, nested folders, special characters, duplicate paths
  - [ ] `useFileTreeState` tests pass: expand, collapse, select, search, multi-root
  - [ ] Web renderer tests pass: renders tree, handles clicks, fires callbacks
  - [ ] API tests pass: returns hierarchical data, handles empty workspace
  - [ ] All tests: `cd packages/ui && pnpm test` → PASS
  - [ ] All tests: `cd api && pnpm test` → PASS

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run: cd packages/ui && pnpm test -- --reporter=verbose 2>&1
      2. Assert: All FileTree tests pass (0 failures)
      3. Run: cd api && pnpm test 2>&1
      4. Assert: All API tests pass (0 failures)
    Expected Result: Full green test suite
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(ui,api): add FileTree unit and integration tests`
  - Files: `packages/ui/src/FileTree/__tests__/*.test.ts`, `api/src/__tests__/workspace-files.test.ts`
  - Pre-commit: `pnpm test`

---

- [ ] 11. Cleanup + Final Verification

  **What to do**:
  - Delete orphaned `app/components/editor/FileTree.tsx` (if not already deleted in Task 9)
  - Delete spike artifacts: `packages/ui/src/FileTree/__spike__/` (if exists from Task 4)
  - Delete spike decision doc: `.sisyphus/drafts/native-dnd-spike-results.md`
  - Run full type check: `tsc --noEmit` across all packages
  - Run full test suite
  - Verify web build: `pnpm build` or equivalent
  - Update architecture doc `docs/architecture/responsive-sidebar-implementation.md` — replace react-complex-tree references with headless-tree
  - Verify no unused imports or dead code from old FileTree

  **Must NOT do**:
  - Do not modify any functional code — cleanup only
  - Do not remove the architecture doc, only update the library references

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple cleanup and verification commands
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 10)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 10

  **References**:

  **Pattern References**:
  - `app/components/editor/FileTree.tsx` — File to delete
  - `docs/architecture/responsive-sidebar-implementation.md` — Doc to update

  **Acceptance Criteria**:
  - [ ] `app/components/editor/FileTree.tsx` no longer exists
  - [ ] `packages/ui/src/FileTree/__spike__/` no longer exists
  - [ ] `tsc --noEmit` passes for all packages
  - [ ] `pnpm test` passes for all packages
  - [ ] No references to old FileTree in any import statements
  - [ ] Architecture doc updated with headless-tree references

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Clean codebase
    Tool: Bash
    Steps:
      1. Run: test ! -f app/components/editor/FileTree.tsx && echo "DELETED" || echo "STILL EXISTS"
      2. Assert: Output is "DELETED"
      3. Run: grep -r "from.*editor/FileTree" app/ --include="*.ts" --include="*.tsx" | wc -l
      4. Assert: Count is 0 (no imports of old FileTree)
      5. Run: tsc --noEmit 2>&1 | grep -c "error"
      6. Assert: No new errors
      7. Run: pnpm test 2>&1 | tail -5
      8. Assert: All tests pass
    Expected Result: No dead code, no broken imports, all checks pass
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `chore: cleanup old FileTree and update architecture docs`
  - Files: deleted files, `docs/architecture/responsive-sidebar-implementation.md`
  - Pre-commit: `tsc --noEmit && pnpm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore(deps): add headless-tree and react-native-dnd packages` | package.json files, lockfile | `tsc --noEmit` |
| 2 | `feat(ui): add FileTree types and data model` | `packages/ui/src/FileTree/types.ts`, barrel files | `tsc --noEmit` |
| 3 | `feat(api): return hierarchical tree data from listWorkspaceFiles` | API route, useWorkspaceFiles | `pnpm test` |
| 4 | No commit (spike) | — | — |
| 5 | `feat(ui): implement FileTree web renderer with headless-tree` | FileTree.web.tsx | `tsc --noEmit` |
| 6 | `feat(ui): implement FileTree native renderer with Reanimated` | FileTree.native.tsx | `tsc --noEmit` |
| 7 | `feat(ui): add DnD reparenting to native FileTree` | FileTree.native.tsx | `tsc --noEmit` |
| 8 | `feat(editor): add useFileTree state hook with multi-root support` | useFileTreeState.ts, useEditorFileTree.ts | `tsc --noEmit` |
| 9 | `feat(editor): integrate FileTree into sidebar as Explorer panel` | ExplorerPanel.tsx, Sidebar.tsx, StageArea.tsx | `tsc --noEmit` |
| 10 | `test(ui,api): add FileTree unit and integration tests` | test files | `pnpm test` |
| 11 | `chore: cleanup old FileTree and update architecture docs` | deleted files, docs | `tsc --noEmit && pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
# Type check
cd packages/ui && npx tsc --noEmit  # Expected: 0 errors
cd app && npx tsc --noEmit          # Expected: 0 errors
cd api && npx tsc --noEmit          # Expected: 0 errors

# Tests
cd packages/ui && pnpm test         # Expected: all pass
cd api && pnpm test                 # Expected: all pass

# Build
pnpm build                          # Expected: no errors

# Platform resolution
ls packages/ui/src/FileTree/        # Expected: types.ts, FileTree.web.tsx, FileTree.native.tsx, index files
```

### Final Checklist
- [ ] FileTree renders on web with full feature set (DnD, rename, search, keyboard, multi-select)
- [ ] FileTree renders on native with core features (expand/collapse, selection, rename, search)
- [ ] Native DnD works OR limitation documented with graceful fallback
- [ ] API returns hierarchical tree data
- [ ] Editor sidebar shows Explorer panel with working file tree
- [ ] File selection syncs with editor tabs
- [ ] Multi-root workspace support works
- [ ] 1000+ node virtualization verified at 60fps
- [ ] All "Must NOT Have" guardrails verified absent
- [ ] All automated tests pass
- [ ] Zero TypeScript errors
