import type { TextStreamPart, ToolSet } from 'ai';
import type { AgUiEvent } from '@slopcade/shared/chat';

type StreamPart = TextStreamPart<ToolSet>;

export interface MapperContext {
  threadId: string;
  runId: string;
  generateMessageId: () => string;
}

type MapperState = {
  currentMessageId: string | null;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function stringifyToolResult(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapPartWithState(
  part: StreamPart,
  ctx: MapperContext,
  state: MapperState,
): { event: AgUiEvent | null; state: MapperState } {
  switch (part.type) {
    case 'text-start': {
      return {
        event: {
          type: 'TEXT_MESSAGE_START',
          messageId: part.id,
          role: 'assistant',
        },
        state: {
          currentMessageId: part.id,
        },
      };
    }

    case 'text-delta': {
      const messageId = part.id || state.currentMessageId || ctx.generateMessageId();
      return {
        event: {
          type: 'TEXT_MESSAGE_CONTENT',
          messageId,
          delta: part.text,
        },
        state: {
          currentMessageId: messageId,
        },
      };
    }

    case 'text-end': {
      const messageId = part.id || state.currentMessageId || ctx.generateMessageId();
      return {
        event: {
          type: 'TEXT_MESSAGE_END',
          messageId,
        },
        state: {
          currentMessageId: null,
        },
      };
    }

    case 'tool-input-start': {
      const parentMessageId = state.currentMessageId || ctx.generateMessageId();
      return {
        event: {
          type: 'TOOL_CALL_START',
          toolCallId: part.id,
          toolName: part.toolName,
          parentMessageId,
        },
        state,
      };
    }

    case 'tool-input-delta': {
      return {
        event: {
          type: 'TOOL_CALL_ARGS',
          toolCallId: part.id,
          delta: part.delta,
        },
        state,
      };
    }

    case 'tool-input-end': {
      return {
        event: {
          type: 'TOOL_CALL_END',
          toolCallId: part.id,
        },
        state,
      };
    }

    case 'tool-result': {
      return {
        event: {
          type: 'TOOL_CALL_RESULT',
          toolCallId: part.toolCallId,
          result: stringifyToolResult(part.output),
          isError: false,
        },
        state,
      };
    }

    case 'finish': {
      return {
        event: {
          type: 'RUN_FINISHED',
          threadId: ctx.threadId,
          runId: ctx.runId,
        },
        state,
      };
    }

    case 'error': {
      return {
        event: {
          type: 'RUN_ERROR',
          message: toErrorMessage(part.error),
        },
        state,
      };
    }

    default: {
      return { event: null, state };
    }
  }
}

export function mapStreamPartToAgUi(
  part: { type: string; [key: string]: unknown },
  ctx: MapperContext,
): AgUiEvent | null {
  const { event } = mapPartWithState(part as StreamPart, ctx, {
    currentMessageId: null,
  });
  return event;
}

export class AgUiMapper {
  private currentMessageId: string | null = null;

  constructor(private readonly ctx: MapperContext) {}

  map(part: StreamPart): AgUiEvent | null {
    const mapped = mapPartWithState(part, this.ctx, {
      currentMessageId: this.currentMessageId,
    });
    this.currentMessageId = mapped.state.currentMessageId;
    return mapped.event;
  }
}
