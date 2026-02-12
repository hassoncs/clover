# File Tree Sidebar — Learnings & Conventions

## Project Patterns

### Package Structure (following SortableList)
- `packages/ui/src/FileTree/` directory
- `types.ts` — shared types
- `FileTree.web.tsx` — web implementation
- `FileTree.native.tsx` — native implementation
- `index.ts`, `index.web.ts`, `index.native.ts` — barrel exports

### Dependencies
- `@headless-tree/core` — platform-agnostic state management
- `@headless-tree/react` — web React integration
- `@mgcrea/react-native-dnd` — native DnD (to be validated in spike)

### Data Model
- Flat map keyed by ID: `Record<string, FileTreeNode>`
- Each node has: `id`, `name`, `type: 'file' | 'folder'`, `children?: string[]`, `parentId: string | null`
- Multi-root support via `roots: string[]` array

## Decisions

### Native DnD Strategy
- Task 4 will spike @mgcrea/react-native-dnd compatibility with Reanimated v4
- If incompatible: fallback to expand/collapse + selection only on native

### Web Features
- Use headless-tree built-in features: `dragAndDropFeature`, `hotkeysCoreFeature`, `searchFeature`
- Do NOT build custom DnD or keyboard handling on web

### Styling
- VS Code dark theme colors: #111827 (bg), #1F2937 (hover), #374151 (border), #6366F1 (accent)

## Headless Tree Core in React Native (New Learnings)
- `createTree` takes a single config object with all features merged.
- To drive state from React, pass `setState` in the config that updates a local React state, then sync back via `tree.setConfig({ state, ... })`.
- Feature implementations (e.g. `syncDataLoaderFeature`) are passed as objects in `features` array, while their config (e.g. `dataLoader`) is at the top level.
- `FlashList` types might require casting (`as any` or explicit props) if `@shopify/flash-list` is not a direct dependency of the workspace package.
- Virtual root node is needed for multi-root support when using `syncDataLoaderFeature` which expects a single `rootItemId`.
