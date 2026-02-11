# BottomSheetHost Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the editor's `BottomSheetHost` from a messy chat-as-tab layout into a clean three-state bottom sheet (minimized, tool panel, chat mode) with always-visible composer and tab bar.

**Architecture:** The bottom sheet operates in two layout modes sharing one `<BottomSheet>`. In "tool mode" the composer + tab bar are fixed at the top via `BottomSheetView` with scrollable tool content below. In "chat mode" the composer + tab bar move to the footer via `footerComponent` and the scrollable area becomes an inverted `BottomSheetFlatList` of chat messages. Thread picker UI is removed entirely (one thread per game, auto-created).

**Tech Stack:** `@gorhom/bottom-sheet` v5, React Native, `BottomSheetFlatList`, `BottomSheetFooter`, `BottomSheetTextInput`, `BottomSheetView`

---

## Summary of Changes

### What's changing:
1. `BottomSheetHost.tsx` — complete rewrite
2. `EditorProvider.tsx` — remove `threadId`/`setThreadId`/`chatOpen`/`setChatOpen`, simplify `EditorTab` type
3. `Composer.tsx` — switch `TextInput` → `BottomSheetTextInput`
4. Navigation callers (`_layout.tsx`, `profile.tsx`, `maker.tsx`, `[id].tsx`) — remove `threadId`/`chatOpen` params
5. Thread management moves internal to BottomSheetHost (auto-create on first message)

### What's NOT changing:
- `useCreateGameChat.ts` — works as-is (takes threadId + gameId)
- `useThreads.ts` — still used internally for auto-creation
- All panel components (`AssetsPanel`, `PropertiesPanel`, `LayersPanel`, `DebugPanel`, `AssetGalleryPanel`)
- `ChatMessage` component
- `ResponsiveEditorLayout.tsx` — still renders `<BottomSheetHost />`

---

## Task 1: Simplify EditorProvider — Remove Thread/Chat State

**Files:**
- Modify: `app/components/editor/EditorProvider.tsx`

**Step 1: Update the EditorTab type**

Remove `"chat"` from the union (we'll add it back differently in Task 3). For now keep the type but remove thread-related state:

```typescript
// BEFORE
export type EditorTab = "gallery" | "assets" | "properties" | "layers" | "debug" | "chat";

// AFTER (keep chat — it will be dynamically shown)
export type EditorTab = "gallery" | "assets" | "properties" | "layers" | "debug" | "chat";
```

Actually, keep `"chat"` in the type — it's still a valid tab, just conditionally shown.

**Step 2: Remove thread/chat state from EditorProvider**

Remove these from the provider:
- `threadId` / `setThreadId` state
- `chatOpen` / `setChatOpen` state  
- `initialChatOpen` prop
- `threadId` prop
- `initialActiveTab` / `initialSheetSnapPoint` chat-conditional logic

Remove from `EditorProviderProps`:
```typescript
// Remove these:
threadId?: string;
initialChatOpen?: boolean;
```

Remove from `EditorContextValue`:
```typescript
// Remove these:
threadId: string | null;
chatOpen: boolean;
setThreadId: (id: string | null) => void;
setChatOpen: (open: boolean) => void;
```

Remove from provider body:
```typescript
// Remove these lines:
const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
const [chatOpen, setChatOpen] = useState(Boolean(initialChatOpen));
const initialActiveTab: EditorTab = initialChatOpen ? "chat" : "gallery";
const initialSheetSnapPoint: SheetSnapPoint = initialChatOpen ? 2 : 0;
```

Replace initial state:
```typescript
const initialState: EditorState = {
  mode: "edit",
  selectedEntityId: null,
  activeTab: "gallery",      // always start on gallery
  sheetSnapPoint: 0,         // always start minimized
  document: initialDefinition,
  isDirty: false,
  undoStack: [],
  redoStack: [],
  cameraPosition: { x: 0, y: 0 },
  cameraZoom: initialDefinition.camera?.zoom ?? 1,
};
```

Remove from the `value` useMemo object and its dependency array:
- `threadId`, `chatOpen`, `setThreadId`, `setChatOpen`

**Step 3: Run type check**

Run: `pnpm tsc --noEmit` from repo root.
Expected: Type errors in `BottomSheetHost.tsx`, `[id].tsx`, and navigation files referencing removed props. These will be fixed in subsequent tasks.

**Step 4: Commit**

```bash
git add app/components/editor/EditorProvider.tsx
git commit -m "refactor: remove thread/chat state from EditorProvider"
```

---

## Task 2: Clean Up Navigation Callers

**Files:**
- Modify: `app/app/editor/[id].tsx`
- Modify: `app/app/(tabs)/_layout.tsx`
- Modify: `app/app/(tabs)/profile.tsx`
- Modify: `app/app/(tabs)/maker.tsx`

**Step 1: Update `[id].tsx` editor screen**

Remove `threadId` and `chatOpen` from search params and `EditorProvider` props:

```typescript
// Remove from useLocalSearchParams:
// threadId, chatOpen (and their type declarations)

// Remove from EditorProvider:
// threadId={threadId}
// initialChatOpen={chatOpen === "true"}
```

The `EditorProvider` call becomes:
```tsx
<EditorProvider
  gameId={id === "ephemeral" ? "preview" : (id ?? "preview")}
  initialDefinition={gameDefinition}
  isEphemeral={id === "ephemeral"}
  ephemeralSource={...}
>
```

**Step 2: Update `_layout.tsx`**

Change the create-game flow to not pass `threadId` or `chatOpen`:

```typescript
// BEFORE:
router.push(`/editor/${game.id}?threadId=${thread.threadId}&chatOpen=true`);

// AFTER — also remove the thread creation since BottomSheetHost will auto-create:
router.push(`/editor/${game.id}`);
```

Remove the `trpc.chatThreads.createThread.mutate` call from the create game flow (the thread will be auto-created on first message in BottomSheetHost).

**Step 3: Update `profile.tsx` and `maker.tsx`**

```typescript
// BEFORE:
router.push(`/editor/${game.id}?chatOpen=true`);

// AFTER:
router.push(`/editor/${game.id}`);
```

**Step 4: Run type check**

Run: `pnpm tsc --noEmit`
Expected: Errors only in `BottomSheetHost.tsx` (which still references old context values). All navigation files should be clean.

**Step 5: Commit**

```bash
git add app/app/editor/[id].tsx app/app/\(tabs\)/_layout.tsx app/app/\(tabs\)/profile.tsx app/app/\(tabs\)/maker.tsx
git commit -m "refactor: remove threadId/chatOpen from navigation params"
```

---

## Task 3: Update Composer to Use BottomSheetTextInput

**Files:**
- Modify: `app/components/create-game/Composer.tsx`

**Step 1: Replace TextInput with BottomSheetTextInput**

```typescript
// BEFORE:
import { View, TextInput, Pressable, ... } from 'react-native';

// AFTER:
import { View, Pressable, ... } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
```

Replace `<TextInput` with `<BottomSheetTextInput` in the JSX. The component accepts the same props as `TextInput`, so no other changes needed.

Remove the `useRef<TextInput>` — `BottomSheetTextInput` handles its own ref internally for keyboard communication.

Remove the web-specific `handleChangeText` logic that accesses `inputRef.current` as `HTMLTextAreaElement` — the `BottomSheetTextInput` handles sizing differently. Keep the basic `setText(newText)` version:

```typescript
const handleChangeText = useCallback((newText: string) => {
  setText(newText);
}, []);
```

**Step 2: Run type check**

Run: `pnpm tsc --noEmit`
Expected: Clean (Composer is used in BottomSheetHost which will be rewritten next).

**Step 3: Commit**

```bash
git add app/components/create-game/Composer.tsx
git commit -m "refactor: switch Composer to BottomSheetTextInput for keyboard handling"
```

---

## Task 4: Rewrite BottomSheetHost

This is the core task. Complete rewrite of `app/components/editor/BottomSheetHost.tsx`.

**Files:**
- Rewrite: `app/components/editor/BottomSheetHost.tsx`

**Step 1: Write the new component**

The component implements two layout modes:

```tsx
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useEditor, type EditorTab } from "./EditorProvider";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AssetGalleryPanel } from "./AssetGallery/AssetGalleryPanel";
import { ChatMessage as ChatMessageComponent } from "@/components/create-game/ChatMessage";
import { Composer } from "@/components/create-game/Composer";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { useThreads } from "@/components/create-game/useThreads";
import type { ChatMessage } from "@/components/create-game/types";

// Tool tabs — Chat is added dynamically when messages exist
const TOOL_TABS: { id: EditorTab; label: string }[] = [
  { id: "gallery", label: "Gallery" },
  { id: "assets", label: "Add" },
  { id: "properties", label: "Properties" },
  { id: "layers", label: "Layers" },
  { id: "debug", label: "Debug" },
];

export function BottomSheetHost() {
  const {
    mode,
    activeTab,
    setActiveTab,
    sheetSnapPoint,
    setSheetSnapPoint,
    selectedEntityId,
    gameId,
  } = useEditor();

  const sheetRef = useRef<BottomSheet>(null);

  // --- Thread management (internal, auto-create) ---
  const effectiveGameId = gameId !== "preview" ? gameId : null;
  const { threads, createThread, initForGame } = useThreads();
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveGameId) {
      initForGame(effectiveGameId);
    }
  }, [effectiveGameId, initForGame]);

  // Auto-select first thread if one exists
  useEffect(() => {
    if (!threadId && threads.length > 0) {
      setThreadId(threads[0].id);
    }
  }, [threads, threadId]);

  // --- Chat state ---
  const {
    messages,
    sendMessage,
    isRunning,
    isSending,
    submitAnswer,
    submitUserAnswer,
    pendingQuestions,
  } = useCreateGameChat(threadId, effectiveGameId);

  const isChatMode = activeTab === "chat";
  const hasMessages = messages.length > 0;

  // Build tabs list: tool tabs + conditional chat tab
  const tabs = useMemo(() => {
    const base = TOOL_TABS;
    if (hasMessages || isChatMode) {
      return [...base, { id: "chat" as EditorTab, label: "Chat" }];
    }
    return base;
  }, [hasMessages, isChatMode]);

  // --- Snap points ---
  // Tool mode: small (just composer+tabs), medium, large
  // Chat mode: medium, large (no tiny snap — need to see messages)
  const toolSnapPoints = useMemo(() => ["12%", "50%", "90%"], []);
  const chatSnapPoints = useMemo(() => ["50%", "90%"], []);
  const snapPoints = isChatMode ? chatSnapPoints : toolSnapPoints;

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetSnapPoint(index as 0 | 1 | 2);
    },
    [setSheetSnapPoint]
  );

  // --- Send message handler (auto-creates thread if needed) ---
  const handleSendMessage = useCallback(
    async (text: string) => {
      let tid = threadId;
      if (!tid && effectiveGameId) {
        tid = await createThread(effectiveGameId);
        setThreadId(tid);
      }
      if (tid) {
        sendMessage(text, tid, effectiveGameId ?? undefined);
        // Auto-switch to chat tab
        if (activeTab !== "chat") {
          setActiveTab("chat");
        }
        // Expand sheet
        sheetRef.current?.snapToIndex(isChatMode ? 1 : 2);
      }
    },
    [threadId, effectiveGameId, createThread, sendMessage, activeTab, setActiveTab, isChatMode]
  );

  // --- Render helpers ---
  const renderChatMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatMessageComponent
        message={item}
        onSubmitUserAnswer={submitUserAnswer}
        onSubmitClarification={submitAnswer}
        onRetry={() => {}}
      />
    ),
    [submitUserAnswer, submitAnswer]
  );

  const renderTabBar = useCallback(
    () => (
      <View style={styles.tabHeader}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id === "properties" && !selectedEntityId;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
                isDisabled && styles.tabButtonDisabled,
              ]}
              onPress={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isDisabled && styles.tabLabelDisabled,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [tabs, activeTab, selectedEntityId, setActiveTab]
  );

  // --- Footer for chat mode (composer + tabs pinned at bottom) ---
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footerContainer}>
          <Composer onSend={handleSendMessage} isSubmitting={isSending} />
          {renderTabBar()}
        </View>
      </BottomSheetFooter>
    ),
    [handleSendMessage, isSending, renderTabBar]
  );

  // --- Tool panel content ---
  const renderToolContent = useCallback(() => {
    switch (activeTab) {
      case "gallery":
        return (
          <AssetGalleryPanel
            onTemplatePress={(templateId) => {
              console.log("Template pressed:", templateId);
            }}
          />
        );
      case "assets":
        return <AssetsPanel />;
      case "properties":
        return <PropertiesPanel />;
      case "layers":
        return <LayersPanel />;
      case "debug":
        return <DebugPanel />;
      default:
        return null;
    }
  }, [activeTab]);

  if (mode === "playtest") {
    return null;
  }

  // ========== CHAT MODE ==========
  if (isChatMode) {
    return (
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={chatSnapPoints}
        onChange={handleSheetChange}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        enablePanDownToClose={false}
        enableDynamicSizing={false}
        footerComponent={renderFooter}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetFlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderChatMessage}
          inverted
          contentContainerStyle={styles.chatContentContainer}
          ListFooterComponent={
            isRunning && !pendingQuestions ? (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>Building your game...</Text>
              </View>
            ) : null
          }
        />
      </BottomSheet>
    );
  }

  // ========== TOOL MODE ==========
  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetSnapPoint}
      snapPoints={toolSnapPoints}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      {/* Fixed header: Composer + Tab Bar (always visible) */}
      <BottomSheetView>
        <Composer onSend={handleSendMessage} isSubmitting={isSending} />
        {renderTabBar()}
      </BottomSheetView>

      {/* Scrollable tool content */}
      <BottomSheetScrollView contentContainerStyle={styles.toolContentContainer}>
        {renderToolContent()}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
```

**Step 2: Write styles**

```typescript
const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#1F2937",
  },
  handleIndicator: {
    backgroundColor: "#6B7280",
    width: 40,
  },
  // Tab bar
  tabHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabButtonDisabled: {
    opacity: 0.4,
  },
  tabLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabLabelDisabled: {
    color: "#6B7280",
  },
  // Chat mode
  chatContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footerContainer: {
    backgroundColor: "#1F2937",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 13,
    color: "#71717A",
  },
  // Tool mode
  toolContentContainer: {
    flexGrow: 1,
  },
});
```

**Step 3: Verify inverted FlatList message ordering**

Note: `inverted` FlatList renders items bottom-to-top, so `messages` array (chronological, oldest first) will display correctly with newest at the bottom. The `ListFooterComponent` in an inverted list appears at the TOP, which is what we want for the typing indicator.

Wait — actually that's wrong. In an inverted FlatList, `ListFooterComponent` appears at the top (visually) and `ListHeaderComponent` at the bottom. The typing indicator should appear at the bottom (after the last message). So we should use `ListHeaderComponent` instead:

```tsx
ListHeaderComponent={
  isRunning && !pendingQuestions ? (
    <View style={styles.typingContainer}>
      <Text style={styles.typingText}>Building your game...</Text>
    </View>
  ) : null
}
```

Also, for inverted FlatList, the data should be reversed (newest first) since inverted renders the first item at the bottom. We need to reverse the messages array:

```typescript
const reversedMessages = useMemo(
  () => [...messages].reverse(),
  [messages]
);
```

And use `reversedMessages` as the `data` prop.

**Step 4: Run type check**

Run: `pnpm tsc --noEmit`
Expected: Should be clean. If `useThreads` returns threads with a different shape, adjust the auto-select logic.

**Step 5: Commit**

```bash
git add app/components/editor/BottomSheetHost.tsx
git commit -m "refactor: rewrite BottomSheetHost with three-state layout"
```

---

## Task 5: Verify & Fix Type Errors

**Files:**
- Any files with remaining type errors

**Step 1: Full type check**

Run: `pnpm tsc --noEmit`

**Step 2: Fix any remaining references**

Check for any remaining references to removed context values (`threadId`, `chatOpen`, `setThreadId`, `setChatOpen`, `initialChatOpen`) and remove them.

**Step 3: Run type check again**

Run: `pnpm tsc --noEmit`
Expected: Clean.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve remaining type errors from bottom sheet refactor"
```

---

## Task 6: Manual Testing Checklist

Run the app and verify:

1. **Minimized state**: Sheet shows composer + tab bar. Can type in composer.
2. **Tool panel**: Tap a tab (e.g., Gallery) → sheet shows tool content below tabs. Content scrolls properly.
3. **Send first message**: Type and send → Chat tab appears in tab bar, auto-activates. Sheet expands. Composer + tabs move to footer. Messages visible and scrollable.
4. **Switch tabs**: While in chat mode, tap "Gallery" → returns to tool mode (composer + tabs at top, gallery content below).
5. **Return to chat**: Tap "Chat" tab → back to chat mode with messages.
6. **Keyboard**: Tap composer → keyboard appears, sheet adjusts properly. Dismiss keyboard → sheet restores.
7. **Properties tab**: Disabled when no entity selected, enabled when entity selected.
8. **Playtest mode**: Bottom sheet hidden entirely.

---

## Architecture Diagram

```
BottomSheetHost
├── State: threadId (local), messages (from useCreateGameChat)
├── Computed: isChatMode, hasMessages, tabs (dynamic)
│
├── TOOL MODE (activeTab !== "chat")
│   └── <BottomSheet snapPoints={["12%","50%","90%"]}>
│       ├── <BottomSheetView>           ← FIXED (always visible)
│       │   ├── <Composer />
│       │   └── <TabBar />
│       └── <BottomSheetScrollView>     ← SCROLLABLE (tool content)
│           └── {renderToolContent()}
│
└── CHAT MODE (activeTab === "chat")
    └── <BottomSheet snapPoints={["50%","90%"]} footerComponent={footer}>
        └── <BottomSheetFlatList>       ← SCROLLABLE (messages, inverted)
            └── {renderChatMessage()}
        Footer:
        ├── <Composer />
        └── <TabBar />
```
