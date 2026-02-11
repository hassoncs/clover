# Fixed Toolbar + Separate Sheets — Implementation Plan

**Goal:** Replace the monolithic BottomSheetHost with a fixed toolbar pinned at the bottom of the screen, plus separate bottom sheets for chat and tool panels.

**Architecture:**
- **EditorToolbar** — Fixed `View` at the bottom: composer input + tool icon tabs + send button. Always visible.
- **ChatSheet** — `@gorhom/bottom-sheet` that opens when user sends a message. Contains chat messages (scrollable), composer, and tool tabs in footer. Has X to dismiss, draggable.
- **ToolSheet** — `@gorhom/bottom-sheet` that opens when a tool tab is tapped. Contains that tool's panel content. Has X to dismiss, draggable.
- Chat and Tool sheets are mutually exclusive. Dismissing either returns to just the toolbar.

---

## Task 1: Create EditorToolbar component

New file: `app/components/editor/EditorToolbar.tsx`

A fixed-height View pinned at the bottom of the screen containing:
- Composer input row (TextInput + send button) — uses regular TextInput, NOT BottomSheetTextInput
- Tool icon tabs row (Images, Sounds, Colors, Tweaks, Text + arrow/publish button)

Props:
- `onSendMessage: (text: string) => void`
- `onTabPress: (tabId: EditorTab) => void`
- `isSending: boolean`

No bottom sheet involvement. Just a styled View.

## Task 2: Create ChatSheet component

New file: `app/components/editor/ChatSheet.tsx`

A BottomSheet that opens when triggered. Contains:
- Header with X button and "Edit" title
- BottomSheetFlatList with inverted chat messages
- Composer (BottomSheetTextInput) in footer
- Tool tabs in footer

Props:
- `visible: boolean`
- `onDismiss: () => void`
- `messages, sendMessage, isRunning, isSending, submitAnswer, submitUserAnswer, pendingQuestions` (from useCreateGameChat)

## Task 3: Create ToolSheet component

New file: `app/components/editor/ToolSheet.tsx`

A BottomSheet that opens when a tool tab is tapped. Contains:
- Header with X button and tab name title
- BottomSheetScrollView with the active tool panel content

Props:
- `activeTab: EditorTab | null`
- `onDismiss: () => void`

## Task 4: Make Composer work both inside and outside bottom sheets

The Composer currently uses BottomSheetTextInput. It needs to work in the toolbar (regular TextInput) and in sheets (BottomSheetTextInput).

Add a `variant` prop: `"toolbar" | "sheet"` that switches the input component.

## Task 5: Rewrite BottomSheetHost → orchestrator

Replace BottomSheetHost contents with:
- Always render EditorToolbar
- Conditionally render ChatSheet (when chat is active)
- Conditionally render ToolSheet (when a tool tab is active)
- Manage which sheet is open via state

## Task 6: Remove AssetGalleryPanel "Entities / UI Components" mode switcher

Remove the mode switcher from AssetGalleryPanel. Default to entities mode only.

## Task 7: Type check and verify
