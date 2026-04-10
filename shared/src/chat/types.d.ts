export type ThreadStatus = 'idle' | 'streaming' | 'waiting' | 'error';
export interface ChatThread {
    id: string;
    messages: ChatMessage[];
    status: ThreadStatus;
    error?: {
        message: string;
        code?: string;
    };
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: ContentBlock[];
    createdAt: number;
}
export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;
export interface TextContent {
    type: 'text';
    text: string;
}
export interface ToolUseContent {
    type: 'tool-use';
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    status: 'streaming' | 'calling' | 'complete';
}
export interface ToolResultContent {
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
}
//# sourceMappingURL=types.d.ts.map