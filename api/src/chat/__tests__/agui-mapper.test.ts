import { describe, expect, it } from 'vitest';

import { AgUiMapper } from '../agui-mapper';

function createMapper() {
  return new AgUiMapper({
    threadId: 'thread-1',
    runId: 'run-1',
    generateMessageId: () => 'generated-message-id',
  });
}

describe('AgUiMapper', () => {
  it('maps text-start to TEXT_MESSAGE_START', () => {
    const mapper = createMapper();

    const event = mapper.map({ type: 'text-start', id: 'msg-1' });

    expect(event).toEqual({
      type: 'TEXT_MESSAGE_START',
      messageId: 'msg-1',
      role: 'assistant',
    });
  });

  it('maps text-delta to TEXT_MESSAGE_CONTENT using current message id', () => {
    const mapper = createMapper();
    mapper.map({ type: 'text-start', id: 'msg-1' });

    const event = mapper.map({ type: 'text-delta', id: 'msg-1', text: 'Hello' });

    expect(event).toEqual({
      type: 'TEXT_MESSAGE_CONTENT',
      messageId: 'msg-1',
      delta: 'Hello',
    });
  });

  it('maps tool-input-start to TOOL_CALL_START with parent message id', () => {
    const mapper = createMapper();
    mapper.map({ type: 'text-start', id: 'msg-1' });

    const event = mapper.map({
      type: 'tool-input-start',
      id: 'tool-1',
      toolName: 'askUser',
    });

    expect(event).toEqual({
      type: 'TOOL_CALL_START',
      toolCallId: 'tool-1',
      toolName: 'askUser',
      parentMessageId: 'msg-1',
    });
  });

  it('maps tool-input-delta to TOOL_CALL_ARGS', () => {
    const mapper = createMapper();

    const event = mapper.map({ type: 'tool-input-delta', id: 'tool-1', delta: '{"q"' });

    expect(event).toEqual({
      type: 'TOOL_CALL_ARGS',
      toolCallId: 'tool-1',
      delta: '{"q"',
    });
  });

  it('maps tool-input-end to TOOL_CALL_END', () => {
    const mapper = createMapper();

    const event = mapper.map({ type: 'tool-input-end', id: 'tool-1' });

    expect(event).toEqual({
      type: 'TOOL_CALL_END',
      toolCallId: 'tool-1',
    });
  });

  it('maps tool-result to TOOL_CALL_RESULT', () => {
    const mapper = createMapper();

    const event = mapper.map({
      type: 'tool-result',
      toolCallId: 'tool-1',
      output: { ok: true },
    });

    expect(event).toEqual({
      type: 'TOOL_CALL_RESULT',
      toolCallId: 'tool-1',
      result: '{"ok":true}',
      isError: false,
    });
  });

  it('maps finish to RUN_FINISHED', () => {
    const mapper = createMapper();

    const event = mapper.map({
      type: 'finish',
      finishReason: 'stop',
      rawFinishReason: 'stop',
      totalUsage: {},
    });

    expect(event).toEqual({
      type: 'RUN_FINISHED',
      threadId: 'thread-1',
      runId: 'run-1',
    });
  });

  it('maps error to RUN_ERROR', () => {
    const mapper = createMapper();

    const event = mapper.map({ type: 'error', error: new Error('boom') });

    expect(event).toEqual({
      type: 'RUN_ERROR',
      message: 'boom',
    });
  });

  it('returns null for unhandled chunks', () => {
    const mapper = createMapper();

    expect(mapper.map({ type: 'reasoning-delta', id: 'r-1', text: 'thinking' })).toBeNull();
    expect(mapper.map({ type: 'start-step', request: {}, warnings: [] })).toBeNull();
  });
});
