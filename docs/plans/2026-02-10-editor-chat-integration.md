# Editor + Chat Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the AI chat interface into the editor screen. The + button drops you into an editor with game preview on top and chat in a bottom sheet. Delete all deprecated creation flows.

**Architecture:** The editor already has `StageContainer` (game preview) + `BottomSheetHost` (@gorhom/bottom-sheet with snap points) + `BottomDock` (toolbar). We replace the bottom sheet content with our chat interface. The separate `/create-game` modal becomes the editor itself. Delete the old Maker page generation modal, old `AIRunPanelHost`, and old `AIEditorPanel`.

**Tech Stack:** React Native (Expo), @gorhom/bottom-sheet, tRPC, Jotai, Godot WebView.

---

## Task 1: Delete deprecated creation flows

**Files:**
- Delete: `app/components/editor/AIRunPanelHost.tsx`
- Delete: `app/components/editor/AIEditor/AIEditorPanel.tsx`
- Delete: `app/components/editor/AIEditor/RunControls.tsx`
- Delete: `app/components/editor/AIEditor/RunProgress.tsx`
- Delete: `app/components/editor/AIEditor/TierSelector.tsx`
- Delete: `app/components/editor/AIEditor/CostDisplay.tsx`
- Delete: `app/components/editor/AIEditor/PlanningDocEditor.tsx`
- Delete: `app/components/editor/AIEditor/PlanningGateChecklist.tsx`
- Delete: `app/components/editor/AIEditor/planning-gates.ts`
- Delete: `app/components/editor/AIEditor/index.ts`
- Delete: `app/components/editor/AIGenerateModal.tsx`
- Modify: `app/app/editor/[id].tsx` — remove `AIRunPanelHost` import/usage
- Modify: `app/components/editor/BottomSheetHost.tsx` — remove `AIGenerateModal` import
- Modify: `app/app/(tabs)/maker.tsx` — remove old "New Game" modal generation flow

**Steps:**
1. Remove `<AIRunPanelHost />` from `editor/[id].tsx`
2. Remove `AIGenerateModal` import and usage from `BottomSheetHost.tsx`
3. Delete all the AIEditor files listed above
4. Clean up the Maker page — remove the `games.generate` modal, keep the game list
5. Remove `showAIRunPanel` and `toggleAIRunPanel` from `EditorProvider` if only used by deleted components
6. Verify with LSP diagnostics — fix any broken imports
7. Commit: `chore: delete deprecated AI editor and generation flows`

---

## Task 2: Wire + button → editor for new game

**Files:**
- Modify: `app/app/(tabs)/_layout.tsx` — change `goToCreateGame` to create game + navigate to editor
- Modify: `app/app/editor/[id].tsx` — accept `isNew` param to auto-open chat sheet

**Steps:**
1. Update `goToCreateGame` in `_layout.tsx`:
   - If not authenticated → redirect to profile (already done)
   - Create a new game via `trpc.games.create` with minimal definition
   - Create a thread for the game via `trpc.chatThreads.createThread`
   - Navigate to `/editor/{gameId}?threadId={threadId}&chatOpen=true`
2. In `editor/[id].tsx`, read `chatOpen` and `threadId` params
3. If `chatOpen=true`, auto-open the bottom sheet to the chat tab at 90% snap point
4. Commit: `feat: + button creates game and opens editor with chat`

---

## Task 3: Add chat tab to editor bottom sheet

**Files:**
- Modify: `app/components/editor/BottomSheetHost.tsx` — add "Chat" tab
- Modify: `app/components/editor/BottomDock.tsx` — add chat icon to dock
- Modify: `app/components/editor/EditorProvider.tsx` — add 'chat' to EditorTab type, add threadId/gameId state

**Steps:**
1. Add `'chat'` to the `EditorTab` type union in `EditorProvider.tsx`
2. Add `threadId` and `chatOpen` state to EditorProvider context
3. Add chat icon to `BottomDock` DOCK_ITEMS: `{ id: "chat", icon: "💬", label: "Chat", tab: "chat" }`
4. In `BottomSheetHost`, when `activeTab === 'chat'`, render the chat interface instead of editor panels
5. The chat interface = `ChatTimeline` + `Composer` (reuse from create-game components)
6. Pass `threadId` and `gameId` from EditorProvider into the chat components
7. Commit: `feat: add chat tab to editor bottom sheet`

---

## Task 4: Integrate useCreateGameChat into editor

**Files:**
- Modify: `app/components/editor/BottomSheetHost.tsx` — wire chat state
- Keep: `app/components/create-game/ChatTimeline.tsx` (shared component)
- Keep: `app/components/create-game/Composer.tsx` (shared component)
- Keep: `app/components/create-game/useCreateGameChat.ts` (shared hook)
- Keep: `app/components/create-game/useThreads.ts` (shared hook)

**Steps:**
1. In `BottomSheetHost`, import `useCreateGameChat` and `useThreads`
2. When chat tab is active, render:
   - `ChatTimeline` with messages from `useCreateGameChat`
   - `Composer` at the bottom of the sheet
3. The hook uses `threadId` from EditorProvider context
4. When AI writes files (game definition), the game preview should update
   - This is the bridge: `writeFile` tool writes to `games/{gameId}/workspace/`
   - EditorProvider watches for definition changes and reloads `StageContainer`
5. Commit: `feat: wire chat into editor bottom sheet`

---

## Task 5: Thread list in editor

**Files:**
- Modify: `app/components/editor/BottomSheetHost.tsx` — show thread list when no thread active
- Reuse: `app/components/create-game/ThreadList.tsx`

**Steps:**
1. When `activeTab === 'chat'` and no `threadId`, show ThreadList for this game
2. Selecting a thread sets `threadId` in EditorProvider and loads messages
3. "New Chat" creates a new thread for this game
4. Thread list is compact — inline in the sheet, not a sidebar
5. Commit: `feat: add thread list to editor chat tab`

---

## Task 6: Profile page draft/published badges + edit flow

**Files:**
- Modify: `app/app/(tabs)/profile.tsx` — add draft/published badge, tap draft → editor

**Steps:**
1. `games.list` already returns all user games — add `isPublic` to the response
2. Show "Draft" badge (gray) or "Published" badge (green) on each game card
3. Tap a draft game → navigate to `/editor/{id}?chatOpen=true`
4. Tap a published game → navigate to `/game-detail/{id}` (existing)
5. Commit: `feat: add draft/published badges to profile, drafts open editor`

---

## Task 7: Clean up /create-game route

**Files:**
- Decide: Delete `app/app/create-game.tsx` OR keep as redirect

**Steps:**
1. Since the + button now goes directly to editor, `/create-game` is no longer needed
2. Option A: Delete it entirely
3. Option B: Keep it as a redirect → creates game + navigates to editor (for deep links)
4. For now: Delete it. If we need a deep link, we can add it back.
5. Remove the route from `app/app/_layout.tsx`
6. Commit: `chore: remove standalone create-game route`

---

## Task 8: Verify end-to-end

**Steps:**
1. Wipe D1: `rm -rf api/.wrangler/state/v3/d1`
2. `pnpm dev`
3. Manual test flow:
   - Sign in → tap + → should create game + open editor with chat sheet open
   - Send message in chat → AI responds → game preview updates (eventually)
   - Close chat sheet → see game preview full screen
   - Reopen chat → messages still there
   - Go to profile → see draft game with "Draft" badge → tap → opens editor
4. `pnpm tsc --noEmit` on app/ — verify clean

---

## Parallel execution

```
Task 1 (delete deprecated)
  ├── Task 2 (wire + button)        ← parallel
  └── Task 6 (profile badges)       ← parallel
        ↓
      Task 3 (chat tab in sheet)
        ↓
      Task 4 (wire chat hook)
        ↓
      Task 5 (thread list)
        ↓
      Task 7 (cleanup create-game)
        ↓
      Task 8 (verification)
```

---

## Desktop vs Mobile layout

**Mobile (from screenshot):**
- Game preview = top half of screen
- Bottom sheet = chat, pulls up over game preview
- Snap points: 12% (peek), 50% (half), 90% (full)
- Toolbar at very bottom

**Desktop/Web:**
- Game preview = left side (flex: 1)
- Chat panel = right side (400px fixed width, always visible)
- No bottom sheet needed — use a fixed sidebar
- Toolbar below game preview

The `BottomSheetHost` already handles mobile. For web, we can use `Platform.OS === 'web'` to render a side panel instead. This can be a follow-up task.
