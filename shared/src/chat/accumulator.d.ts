import type { AgUiEvent } from './events';
import type { ChatThread } from './types';
export interface StreamState {
    thread: ChatThread;
    currentMessageId: string | null;
    currentRunId: string | null;
    accumulatingToolArgs: Map<string, string>;
}
export declare function initialStreamState(threadId: string): StreamState;
export declare function chatReducer(state: StreamState, event: AgUiEvent): StreamState;
//# sourceMappingURL=accumulator.d.ts.map