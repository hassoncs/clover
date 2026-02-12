import {
	EventSchemas,
	EventType,
	type AGUIEvent,
	type RunErrorEvent,
	type RunFinishedEvent,
	type RunStartedEvent,
	type TextMessageContentEvent,
	type TextMessageEndEvent,
	type TextMessageStartEvent,
	type ToolCallArgsEvent,
	type ToolCallEndEvent,
	type ToolCallResultEvent,
	type ToolCallStartEvent,
} from '@ag-ui/core';
import type { AgUiEvent } from '../events.ts';
import { describe, expect, it } from 'vitest';

type LocalEventOf<TType extends AgUiEvent['type']> = Extract<AgUiEvent, { type: TType }>;

function mapRunStarted(event: LocalEventOf<'RUN_STARTED'>): RunStartedEvent {
	return {
		type: EventType.RUN_STARTED,
		threadId: event.threadId,
		runId: event.runId,
	};
}

function mapTextMessageStart(event: LocalEventOf<'TEXT_MESSAGE_START'>): TextMessageStartEvent {
	return {
		type: EventType.TEXT_MESSAGE_START,
		messageId: event.messageId,
		role: event.role,
	};
}

function mapTextMessageContent(event: LocalEventOf<'TEXT_MESSAGE_CONTENT'>): TextMessageContentEvent {
	return {
		type: EventType.TEXT_MESSAGE_CONTENT,
		messageId: event.messageId,
		delta: event.delta,
	};
}

function mapTextMessageEnd(event: LocalEventOf<'TEXT_MESSAGE_END'>): TextMessageEndEvent {
	return {
		type: EventType.TEXT_MESSAGE_END,
		messageId: event.messageId,
	};
}

function mapToolCallStart(event: LocalEventOf<'TOOL_CALL_START'>): ToolCallStartEvent {
	return {
		type: EventType.TOOL_CALL_START,
		toolCallId: event.toolCallId,
		toolCallName: event.toolName,
		parentMessageId: event.parentMessageId,
	};
}

function mapToolCallArgs(event: LocalEventOf<'TOOL_CALL_ARGS'>): ToolCallArgsEvent {
	return {
		type: EventType.TOOL_CALL_ARGS,
		toolCallId: event.toolCallId,
		delta: event.delta,
	};
}

function mapToolCallEnd(event: LocalEventOf<'TOOL_CALL_END'>): ToolCallEndEvent {
	return {
		type: EventType.TOOL_CALL_END,
		toolCallId: event.toolCallId,
	};
}

function mapToolCallResult(
	event: LocalEventOf<'TOOL_CALL_RESULT'>,
	messageId: string,
): ToolCallResultEvent {
	return {
		type: EventType.TOOL_CALL_RESULT,
		messageId,
		toolCallId: event.toolCallId,
		content: event.result,
		role: 'tool',
	};
}

function mapRunFinished(event: LocalEventOf<'RUN_FINISHED'>): RunFinishedEvent {
	return {
		type: EventType.RUN_FINISHED,
		threadId: event.threadId,
		runId: event.runId,
	};
}

function mapRunError(event: LocalEventOf<'RUN_ERROR'>): RunErrorEvent {
	return {
		type: EventType.RUN_ERROR,
		message: event.message,
		code: event.code,
	};
}

interface MappingState {
	activeMessageId: string | null;
	toolParentMessageIds: Map<string, string>;
}

function toAgUiEvent(event: AgUiEvent, state: MappingState): AGUIEvent {
	switch (event.type) {
		case 'RUN_STARTED':
			return mapRunStarted(event);
		case 'TEXT_MESSAGE_START':
			state.activeMessageId = event.messageId;
			return mapTextMessageStart(event);
		case 'TEXT_MESSAGE_CONTENT':
			return mapTextMessageContent(event);
		case 'TEXT_MESSAGE_END':
			return mapTextMessageEnd(event);
		case 'TOOL_CALL_START':
			state.toolParentMessageIds.set(event.toolCallId, event.parentMessageId);
			return mapToolCallStart(event);
		case 'TOOL_CALL_ARGS':
			return mapToolCallArgs(event);
		case 'TOOL_CALL_END':
			return mapToolCallEnd(event);
		case 'TOOL_CALL_RESULT': {
			const parentMessageId =
				state.toolParentMessageIds.get(event.toolCallId) ??
				state.activeMessageId ??
				`tool-result-${event.toolCallId}`;
			return mapToolCallResult(event, parentMessageId);
		}
		case 'RUN_FINISHED':
			state.activeMessageId = null;
			return mapRunFinished(event);
		case 'RUN_ERROR':
			return mapRunError(event);
		default: {
			const _exhaustive: never = event;
			return _exhaustive;
		}
	}
}

function toAgUiSequence(events: readonly AgUiEvent[]): AGUIEvent[] {
	const state: MappingState = {
		activeMessageId: null,
		toolParentMessageIds: new Map(),
	};

	return events.map((event) => toAgUiEvent(event, state));
}

const scenarios: ReadonlyArray<readonly AgUiEvent[]> = [
	[
		{ type: 'RUN_STARTED', threadId: 'thread-1', runId: 'run-1' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-1', role: 'assistant' },
		{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-1', delta: 'Hello ' },
		{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-1', delta: 'world!' },
		{ type: 'TEXT_MESSAGE_END', messageId: 'message-1' },
		{ type: 'RUN_FINISHED', threadId: 'thread-1', runId: 'run-1' },
	],
	[
		{ type: 'RUN_STARTED', threadId: 'thread-2', runId: 'run-2' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-2', role: 'assistant' },
		{
			type: 'TOOL_CALL_START',
			toolCallId: 'tool-1',
			toolName: 'readFile',
			parentMessageId: 'message-2',
		},
		{ type: 'TOOL_CALL_ARGS', toolCallId: 'tool-1', delta: '{"filename":"test.md"}' },
		{ type: 'TOOL_CALL_END', toolCallId: 'tool-1' },
		{ type: 'TOOL_CALL_RESULT', toolCallId: 'tool-1', result: '{"content":"A"}' },
		{ type: 'TEXT_MESSAGE_END', messageId: 'message-2' },
		{ type: 'RUN_FINISHED', threadId: 'thread-2', runId: 'run-2' },
	],
	[
		{ type: 'RUN_STARTED', threadId: 'thread-3', runId: 'run-3' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-3', role: 'assistant' },
		{
			type: 'TOOL_CALL_START',
			toolCallId: 'ask-1',
			toolName: 'askUser',
			parentMessageId: 'message-3',
		},
		{ type: 'TOOL_CALL_ARGS', toolCallId: 'ask-1', delta: '{"questions":[{"id":"q1"}]}' },
		{ type: 'TOOL_CALL_END', toolCallId: 'ask-1' },
		{ type: 'RUN_FINISHED', threadId: 'thread-3', runId: 'run-3' },
	],
	[
		{ type: 'RUN_STARTED', threadId: 'thread-4', runId: 'run-4' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-4', role: 'assistant' },
		{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-4', delta: 'Starting...' },
		{ type: 'RUN_ERROR', message: 'Model overloaded', code: 'overloaded' },
	],
	[
		{ type: 'RUN_STARTED', threadId: 'thread-5', runId: 'run-5' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-5', role: 'assistant' },
		{
			type: 'TOOL_CALL_START',
			toolCallId: 'ask-2',
			toolName: 'askUser',
			parentMessageId: 'message-5',
		},
		{ type: 'TOOL_CALL_END', toolCallId: 'ask-2' },
		{ type: 'RUN_FINISHED', threadId: 'thread-5', runId: 'run-5a' },
		{ type: 'RUN_STARTED', threadId: 'thread-5', runId: 'run-5b' },
		{ type: 'TEXT_MESSAGE_START', messageId: 'message-5b', role: 'assistant' },
		{ type: 'TOOL_CALL_RESULT', toolCallId: 'ask-2', result: '{"answers":{"q1":"blue"}}' },
		{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-5b', delta: 'Thanks!' },
		{ type: 'TEXT_MESSAGE_END', messageId: 'message-5b' },
		{ type: 'RUN_FINISHED', threadId: 'thread-5', runId: 'run-5b' },
	],
];

describe('AG-UI compatibility canary', () => {
	it('keeps local event type strings aligned with AG-UI EventType members', () => {
		expect(EventType.RUN_STARTED).toBe('RUN_STARTED');
		expect(EventType.TEXT_MESSAGE_START).toBe('TEXT_MESSAGE_START');
		expect(EventType.TEXT_MESSAGE_CONTENT).toBe('TEXT_MESSAGE_CONTENT');
		expect(EventType.TEXT_MESSAGE_END).toBe('TEXT_MESSAGE_END');
		expect(EventType.TOOL_CALL_START).toBe('TOOL_CALL_START');
		expect(EventType.TOOL_CALL_ARGS).toBe('TOOL_CALL_ARGS');
		expect(EventType.TOOL_CALL_END).toBe('TOOL_CALL_END');
		expect(EventType.TOOL_CALL_RESULT).toBe('TOOL_CALL_RESULT');
		expect(EventType.RUN_FINISHED).toBe('RUN_FINISHED');
		expect(EventType.RUN_ERROR).toBe('RUN_ERROR');
	});

	it('maps every local event variant into a typed AG-UI event', () => {
		const examples: AgUiEvent[] = [
			{ type: 'RUN_STARTED', threadId: 'thread-x', runId: 'run-x' },
			{ type: 'TEXT_MESSAGE_START', messageId: 'message-x', role: 'assistant' },
			{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'message-x', delta: 'hi' },
			{ type: 'TEXT_MESSAGE_END', messageId: 'message-x' },
			{
				type: 'TOOL_CALL_START',
				toolCallId: 'tool-x',
				toolName: 'readFile',
				parentMessageId: 'message-x',
			},
			{ type: 'TOOL_CALL_ARGS', toolCallId: 'tool-x', delta: '{}' },
			{ type: 'TOOL_CALL_END', toolCallId: 'tool-x' },
			{ type: 'TOOL_CALL_RESULT', toolCallId: 'tool-x', result: '{"ok":true}' },
			{ type: 'RUN_FINISHED', threadId: 'thread-x', runId: 'run-x' },
			{ type: 'RUN_ERROR', message: 'boom', code: 'E_TEST' },
		];

		const typedEvents: AGUIEvent[] = toAgUiSequence(examples);
		expect(typedEvents).toHaveLength(examples.length);

		for (const event of typedEvents) {
			expect(() => EventSchemas.parse(event)).not.toThrow();
		}
	});

	it('validates AG-UI schema compatibility for full stream scenarios', () => {
		for (const scenario of scenarios) {
			const typedEvents: AGUIEvent[] = toAgUiSequence(scenario);
			for (const event of typedEvents) {
				expect(() => EventSchemas.parse(event)).not.toThrow();
			}
		}
	});
});
