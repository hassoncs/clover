# Universal Chat Component — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reusable `@slopcade/chat` package for React Native / Expo that renders AI chat conversations with support for text, thinking, tool calls, tool results, JSON, and error parts — with streaming and infinite scroll.

**Architecture:**
- New package: `packages/chat` following the monorepo's workspace pattern
- Uses FlatList with `inverted` prop for newest-first message ordering
- Normalized message model with part types (text, thinking, tool_call, tool_result, json, error)
- Renderer registry pattern for extensibility
- Streaming via patch-based updates to message state
- Adapters for OpenAI and Anthropic API response formats

**Tech Stack:** React Native 0.81+, Expo, NativeWind, TypeScript (strict), react-native-reanimated

---

## Package Structure

```
packages/chat/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Main exports
    ├── types.ts                          # All TypeScript types
    ├── Chat.tsx                          # Main Chat component
    ├── ChatList.tsx                      # FlatList wrapper with virtualization
    ├── Message.tsx                       # Single message renderer
    ├── Input.tsx                         # User input component
    ├── adapters/
    │   ├── index.ts                      # Adapter exports
    │   ├── openai.ts                    # OpenAI format adapter
    │   └── anthropic.ts                 # Anthropic format adapter
    ├── renderers/
    │   ├── index.ts                      # Renderer registry
    │   ├── TextPart.tsx                 # Text part renderer
    │   ├── ThinkingPart.tsx             # Thinking/reasoning renderer
    │   ├── ToolCallPart.tsx             # Tool call renderer (expandable)
    │   ├── ToolResultPart.tsx           # Tool result renderer
    │   ├── JsonPart.tsx                 # JSON block renderer
    │   └── ErrorPart.tsx                # Error message renderer
    ├── hooks/
    │   ├── useChatState.ts               # Message state management
    │   ├── useInfiniteScroll.ts          # Load older messages
    │   └── useStreaming.ts               # Streaming response handling
    └── utils/
        ├── generateId.ts                 # Unique ID generation
        └── time.ts                       # Timestamp formatting
```

---

## TypeScript Types

### Core Types (`packages/chat/src/types.ts`)

```typescript
// Role types
type Role = 'system' | 'user' | 'assistant' | 'tool';

// Part type union
type PartType = 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'json' | 'error';

// Base part interface
interface BasePart {
  id: string;
  type: PartType;
}

// Text part
interface TextPart extends BasePart {
  type: 'text';
  content: string;
}

// Thinking/reasoning part (collapsible)
interface ThinkingPart extends BasePart {
  type: 'thinking';
  content: string;
}

// Tool call part
interface ToolCallPart extends BasePart {
  type: 'tool_call';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown> | string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

// Tool result part
interface ToolResultPart extends BasePart {
  type: 'tool_result';
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// JSON part (formatted code block)
interface JsonPart extends BasePart {
  type: 'json';
  content: unknown;
  formatted: string;
}

// Error part
interface ErrorPart extends BasePart {
  type: 'error';
  message: string;
  code?: string;
}

// Union of all part types
type MessagePart = 
  | TextPart 
  | ThinkingPart 
  | ToolCallPart 
  | ToolResultPart 
  | JsonPart 
  | ErrorPart;

// Message status
type MessageStatus = 'streaming' | 'complete' | 'error';

// Provider metadata
interface ProviderMeta {
  provider: 'openai' | 'anthropic' | 'custom';
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  [key: string]: unknown;
}

// Main ChatMessage interface
interface ChatMessage {
  id: string;
  role: Role;
  createdAt: number;
  status: MessageStatus;
  parts: MessagePart[];
  providerMeta?: ProviderMeta;
}

// Chat configuration
interface ChatConfig {
  initialMessages?: ChatMessage[];
  onMessageSend?: (message: ChatMessage) => void;
  onMessageUpdate?: (message: ChatMessage) => void;
  loadMoreMessages?: (beforeId: string) => Promise<ChatMessage[]>;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  maxMessages?: number;
  enableInfiniteScroll?: boolean;
  enableStreaming?: boolean;
}

// Chat actions
interface ChatActions {
  sendMessage: (content: string, parts?: MessagePart[]) => void;
  appendPart: (messageId: string, part: MessagePart) => void;
  updatePart: (messageId: string, partId: string, updates: Partial<MessagePart>) => void;
  removePart: (messageId: string, partId: string) => void;
  clearMessages: () => void;
  loadMore: () => Promise<void>;
}

// Renderer registry
type PartRenderer<T extends MessagePart = MessagePart> = React.ComponentType<{
  part: T;
  messageId: string;
  isLast: boolean;
}>;

interface RendererRegistry {
  text: PartRenderer<TextPart>;
  thinking: PartRenderer<ThinkingPart>;
  tool_call: PartRenderer<ToolCallPart>;
  tool_result: PartRenderer<ToolResultPart>;
  json: PartRenderer<JsonPart>;
  error: PartRenderer<ErrorPart>;
}

// Streaming delta for patch updates
interface StreamingDelta {
  messageId: string;
  partId: string;
  delta: Partial<MessagePart>;
  isFinal?: boolean;
}
```

---

## Component Props Interfaces

### Chat Component Props

```typescript
interface ChatProps {
  // Messages
  messages: ChatMessage[];
  
  // Configuration
  config?: ChatConfig;
  
  // Actions
  actions: ChatActions;
  
  // Custom renderers (optional override)
  renderers?: Partial<RendererRegistry>;
  
  // UI customization
  userAvatar?: React.ReactNode;
  assistantAvatar?: React.ReactNode;
  systemAvatar?: React.ReactNode;
  
  // Callbacks
  onInputSubmit?: (text: string) => void;
  onToolCallExecute?: (toolCall: ToolCallPart) => Promise<ToolResultPart>;
  
  // Styling
  className?: string;
  userMessageClassName?: string;
  assistantMessageClassName?: string;
  
  // Placeholders
  placeholder?: string;
  emptyState?: React.ReactNode;
  
  // Loading states
  isLoading?: boolean;
  isStreaming?: boolean;
}
```

### ChatList Props

```typescript
interface ChatListProps {
  messages: ChatMessage[];
  renderers: RendererRegistry;
  inverted?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ComponentType;
  ListFooterComponent?: React.ComponentType;
  ListEmptyComponent?: React.ComponentType;
  keyExtractor?: (item: ChatMessage, index: number) => string;
  getItemCount?: (data: ChatMessage[]) => number;
  getItem?: (data: ChatMessage[], index: number) => ChatMessage;
}
```

### Message Props

```typescript
interface MessageProps {
  message: ChatMessage;
  renderers: RendererRegistry;
  isOwnMessage: boolean;
  avatar?: React.ReactNode;
  showTimestamp?: boolean;
  onPartPress?: (part: MessagePart) => void;
}
```

### Input Props

```typescript
interface InputProps {
  value: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}
```

---

## Implementation Tasks

### Phase 1: Core Infrastructure (Foundation)

- [ ] **1.1** Create `packages/chat/package.json` with dependencies
  - Dependencies: `react-native`, `react`, `nativewind`, `react-native-reanimated`, `react-native-gesture-handler`
  - DevDependencies: `typescript`, `@types/react`
  - Add to workspace: ensure `workspace:*` references work

- [ ] **1.2** Create `packages/chat/tsconfig.json`
  - Follow same pattern as `packages/ui/tsconfig.json`
  - Set `strict: true`
  - Configure paths for `@/*` imports

- [ ] **1.3** Create `packages/chat/src/types.ts`
  - Define all types from the TypeScript Types section
  - Export all type definitions
  - Add JSDoc comments for complex types

- [ ] **1.4** Create `packages/chat/src/utils/generateId.ts`
  - Simple UUID v4 generator using crypto.randomUUID() or fallback

- [ ] **1.5** Create `packages/chat/src/utils/time.ts`
  - Format timestamp to relative time ("2m ago", "1h ago")
  - Format to absolute time when needed

- [ ] **1.6** Create `packages/chat/src/index.ts`
  - Export all public types and components
  - Add barrel exports for each module

### Phase 2: Message Rendering (Core UI)

- [ ] **2.1** Create `packages/chat/src/renderers/TextPart.tsx`
  - Render text content with proper line breaking
  - Handle selectable text
  - Support markdown-like formatting (bold, italic, code)

- [ ] **2.2** Create `packages/chat/src/renderers/ThinkingPart.tsx`
  - Collapsible reasoning section
  - Muted styling to differentiate from main content
  - Chevron indicator for expand/collapse

- [ ] **2.3** Create `packages/chat/src/renderers/JsonPart.tsx`
  - Syntax highlighted JSON display
  - Copy button
  - Collapsible for large objects

- [ ] **2.4** Create `packages/chat/src/renderers/ErrorPart.tsx`
  - Error styling (red accent)
  - Error code display if available
  - Retry action if applicable

- [ ] **2.5** Create `packages/chat/src/renderers/ToolCallPart.tsx`
  - Tool name and arguments display
  - Status indicator (pending/running/complete/error)
  - Expandable/collapsible for long arguments

- [ ] **2.6** Create `packages/chat/src/renderers/ToolResultPart.tsx`
  - Tool result display with monospace font
  - Error styling if `isError: true`
  - Associated tool call linking via `toolCallId`

- [ ] **2.7** Create `packages/chat/src/renderers/index.ts`
  - Export default renderer components
  - Renderer registry pattern implementation

- [ ] **2.8** Create `packages/chat/src/Message.tsx`
  - Combines all part renderers
  - Handles role-based styling (user/assistant/system/tool)
  - Avatar support
  - Timestamp display

### Phase 3: Chat List & Virtualization

- [ ] **3.1** Create `packages/chat/src/ChatList.tsx`
  - FlatList with `inverted={true}` for newest-first
  - Proper virtualization with `windowSize`, `maxToRenderPerBatch`
  - `removeClippedSubviews` for performance
  - `getItemLayout` for consistent item heights (optional optimization)

- [ ] **3.2** Implement infinite scroll in ChatList
  - `onEndReached` callback for loading more
  - `onEndReachedThreshold` configuration
  - Loading indicator at top when fetching older messages

- [ ] **3.3** Create `packages/chat/src/hooks/useInfiniteScroll.ts`
  - Manage pagination state
  - Debounced load more trigger
  - Cache management for loaded pages

### Phase 4: Streaming Support

- [ ] **4.1** Create `packages/chat/src/hooks/useStreaming.ts`
  - Handle SSE (Server-Sent Events) or polling for streaming
  - Buffer incoming chunks
  - Patch-based updates to message state

- [ ] **4.2** Create `packages/chat/src/hooks/useChatState.ts`
  - Message state management
  - Append/update/remove parts
  - Streaming integration
  - Optimistic updates

- [ ] **4.3** Add streaming delta handling
  - Handle `StreamingDelta` updates
  - Merge delta into existing message
  - Mark message complete when final delta received

### Phase 5: Input & User Interaction

- [ ] **5.1** Create `packages/chat/src/Input.tsx`
  - TextInput with send button
  - Submit on Enter (single line) or explicit send
  - Disabled state during streaming
  - Auto-growing height for multiline

- [ ] **5.2** Create `packages/chat/src/Chat.tsx`
  - Compose ChatList + Input components
  - Wire up all props and callbacks
  - Handle keyboard avoiding

### Phase 6: API Adapters

- [ ] **6.1** Create `packages/chat/src/adapters/openai.ts`
  - Convert OpenAI API response format to ChatMessage[]
  - Handle streaming chunks
  - Extract usage metadata

- [ ] **6.2** Create `packages/chat/src/adapters/anthropic.ts`
  - Convert Anthropic API response format to ChatMessage[]
  - Handle Claude's thinking blocks
  - Extract usage metadata

- [ ] **6.3** Create `packages/chat/src/adapters/index.ts`
  - Export adapter functions
  - Unified adapter interface

### Phase 7: Integration & Testing

- [ ] **7.1** Create example usage in `packages/chat/examples/BasicChat.tsx`
  - Minimal setup with sample messages
  - Demonstrates core functionality

- [ ] **7.2** Create streaming example in `packages/chat/examples/StreamingChat.tsx`
  - Simulated streaming response
  - Demonstrates patch updates

- [ ] **7.3** Create tool call example in `packages/chat/examples/ToolCallsChat.tsx`
  - Tool call + result rendering
  - Expandable/collapsible behavior

- [ ] **7.4** Run TypeScript check
  - `cd packages/chat && npx tsc --noEmit`
  - Fix any type errors

- [ ] **7.5** Verify in Expo/React Native app
  - Add to slopcade app as test
  - Verify renders correctly

---

## Example Usage

### Basic Usage

```typescript
import { 
  Chat, 
  ChatMessage, 
  MessagePart,
  useChatState 
} from '@slopcade/chat';

function MyChat() {
  const { messages, actions } = useChatState({
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        createdAt: Date.now() - 60000,
        status: 'complete',
        parts: [
          { id: 'p1', type: 'text', content: 'Hello! How can I help you today?' }
        ]
      }
    ]
  });

  return (
    <Chat
      messages={messages}
      actions={actions}
      onInputSubmit={(text) => {
        actions.sendMessage(text);
      }}
    />
  );
}
```

### With Custom Renderers

```typescript
import { Chat, ChatMessage, RendererRegistry } from '@slopcade/chat';

const customRenderers: Partial<RendererRegistry> = {
  text: ({ part, messageId }) => (
    <CustomTextRenderer content={part.content} isUserMessage={messageId.startsWith('user')} />
  ),
  tool_call: ({ part }) => (
    <CustomToolCallCard 
      toolName={part.toolName} 
      args={part.arguments}
      isExpanded={true}
    />
  )
};

<Chat
  messages={messages}
  actions={actions}
  renderers={customRenderers}
/>
```

### With OpenAI Streaming

```typescript
import { Chat, useChatState, openaiAdapter } from '@slopcade/chat';

async function fetchStreamingResponse(text: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: text }] })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const updates = openaiAdapter.parseStreamingChunk(chunk);
    actions.applyStreamingDeltas(updates);
  }
}
```

### With Tool Calls

```typescript
const handleToolExecute = async (toolCall: ToolCallPart) => {
  // Execute the tool (e.g., API call, database query)
  const result = await executeTool(toolCall.toolName, toolCall.arguments);
  
  return {
    id: `result-${Date.now()}`,
    type: 'tool_result',
    toolCallId: toolCall.toolCallId,
    content: JSON.stringify(result),
    isError: false
  };
};

<Chat
  messages={messages}
  actions={actions}
  onToolCallExecute={handleToolExecute}
/>
```

---

## Dependencies

### Required Dependencies

```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.81.4",
    "nativewind": "^4.2.1",
    "react-native-reanimated": "^4.1.6",
    "react-native-gesture-handler": "^2.30.0"
  }
}
```

### Dev Dependencies

```json
{
  "devDependencies": {
    "typescript": "~5.9.3",
    "@types/react": "~19.1.17"
  }
}
```

---

## File Manifest

| File | Purpose | Priority |
|------|---------|----------|
| `packages/chat/package.json` | Package manifest | P0 |
| `packages/chat/tsconfig.json` | TypeScript config | P0 |
| `packages/chat/src/types.ts` | All type definitions | P0 |
| `packages/chat/src/index.ts` | Main exports | P0 |
| `packages/chat/src/utils/generateId.ts` | ID generation | P1 |
| `packages/chat/src/utils/time.ts` | Time formatting | P1 |
| `packages/chat/src/renderers/*.tsx` | Part renderers (6 files) | P1 |
| `packages/chat/src/Message.tsx` | Message component | P1 |
| `packages/chat/src/ChatList.tsx` | FlatList wrapper | P1 |
| `packages/chat/src/Input.tsx` | Input component | P2 |
| `packages/chat/src/Chat.tsx` | Main chat component | P2 |
| `packages/chat/src/hooks/useChatState.ts` | State management | P2 |
| `packages/chat/src/hooks/useStreaming.ts` | Streaming support | P2 |
| `packages/chat/src/hooks/useInfiniteScroll.ts` | Infinite scroll | P2 |
| `packages/chat/src/adapters/*.ts` | API adapters (3 files) | P3 |
| `packages/chat/examples/*.tsx` | Usage examples (3 files) | P3 |

---

## Notes

1. **Virtualization**: FlatList with `inverted` is key — messages render newest-first but scroll naturally
2. **Performance**: Use `windowSize`, `maxToRenderPerBatch`, and `removeClippedSubviews` for smooth scrolling
3. **Streaming**: Patch-based updates minimize re-renders — only update changed parts, not entire messages
4. **Extensibility**: Renderer registry allows custom components without modifying core chat logic
5. **NativeWind**: All styling uses NativeWind classes for consistency with slopcade design system
