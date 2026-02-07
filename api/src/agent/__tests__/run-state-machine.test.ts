import { describe, it, expect } from 'vitest';
import {
  transitionStatus,
  getStage,
  createInitialState,
  toSnapshot,
  eventKey,
  parseClientMessage,
  EVENT_KEY_PREFIX,
  type RunState,
} from '@/agent/run-state-machine';

function makeState(overrides: Partial<RunState> = {}): RunState {
  return {
    runId: 'run-1',
    status: 'queued',
    stateVersion: 1,
    currentStepIndex: 0,
    totalSteps: 5,
    lastSeq: 0,
    totalCostMicros: 0,
    heartbeatAt: null,
    leaseExpiresAt: null,
    recoveryAttempts: 0,
    clarificationQuestions: [],
    pendingQuestionId: null,
    pendingQuestionBatchId: null,
    pendingQuestionsJson: null,
    suspendedStepIndex: null,
    rawPrompt: null,
    gateValues: {},
    gateLoopIteration: 0,
    gateAnswers: [],
    updatedAt: 1000,
    ...overrides,
  };
}

describe('run-state-machine', () => {
  describe('transitionStatus', () => {
    it('transitions to a new status and bumps stateVersion', () => {
      const state = makeState({ status: 'queued', stateVersion: 1 });
      transitionStatus(state, 'running');
      expect(state.status).toBe('running');
      expect(state.stateVersion).toBe(2);
    });

    it('no-ops when next status equals current status', () => {
      const state = makeState({ status: 'running', stateVersion: 3 });
      transitionStatus(state, 'running');
      expect(state.status).toBe('running');
      expect(state.stateVersion).toBe(3);
    });

    it('transitions through multiple statuses incrementally', () => {
      const state = makeState({ status: 'queued', stateVersion: 1 });
      transitionStatus(state, 'running');
      transitionStatus(state, 'succeeded');
      expect(state.status).toBe('succeeded');
      expect(state.stateVersion).toBe(3);
    });

    it('transitions to waiting_for_input', () => {
      const state = makeState({ status: 'running', stateVersion: 1 });
      transitionStatus(state, 'waiting_for_input');
      expect(state.status).toBe('waiting_for_input');
      expect(state.stateVersion).toBe(2);
    });

    it('transitions to failed', () => {
      const state = makeState({ status: 'running', stateVersion: 5 });
      transitionStatus(state, 'failed');
      expect(state.status).toBe('failed');
      expect(state.stateVersion).toBe(6);
    });

    it('transitions to canceled', () => {
      const state = makeState({ status: 'paused', stateVersion: 2 });
      transitionStatus(state, 'canceled');
      expect(state.status).toBe('canceled');
      expect(state.stateVersion).toBe(3);
    });
  });

  describe('getStage', () => {
    it('maps index 0 to planning', () => {
      expect(getStage(0)).toBe('planning');
    });

    it('maps index 1 to build', () => {
      expect(getStage(1)).toBe('build');
    });

    it('maps index 2 to refine', () => {
      expect(getStage(2)).toBe('refine');
    });

    it('maps index 3 to theme', () => {
      expect(getStage(3)).toBe('theme');
    });

    it('maps index 4 to asset', () => {
      expect(getStage(4)).toBe('asset');
    });

    it('wraps around after 5 stages', () => {
      expect(getStage(5)).toBe('planning');
      expect(getStage(6)).toBe('build');
      expect(getStage(7)).toBe('refine');
    });

    it('handles large step indices', () => {
      expect(getStage(10)).toBe('planning');
      expect(getStage(13)).toBe('theme');
    });
  });

  describe('createInitialState', () => {
    it('creates state with correct runId and totalSteps', () => {
      const state = createInitialState('run-abc', 5);
      expect(state.runId).toBe('run-abc');
      expect(state.totalSteps).toBe(5);
    });

    it('starts with queued status', () => {
      const state = createInitialState('run-1', 3);
      expect(state.status).toBe('queued');
    });

    it('starts with stateVersion 1', () => {
      const state = createInitialState('run-1', 3);
      expect(state.stateVersion).toBe(1);
    });

    it('starts at step index 0 with zero cost', () => {
      const state = createInitialState('run-1', 3);
      expect(state.currentStepIndex).toBe(0);
      expect(state.totalCostMicros).toBe(0);
      expect(state.lastSeq).toBe(0);
    });

    it('initializes nullable fields to null', () => {
      const state = createInitialState('run-1', 3);
      expect(state.heartbeatAt).toBeNull();
      expect(state.leaseExpiresAt).toBeNull();
      expect(state.pendingQuestionId).toBeNull();
      expect(state.pendingQuestionBatchId).toBeNull();
      expect(state.pendingQuestionsJson).toBeNull();
      expect(state.suspendedStepIndex).toBeNull();
      expect(state.rawPrompt).toBeNull();
    });

    it('initializes empty collections', () => {
      const state = createInitialState('run-1', 3);
      expect(state.clarificationQuestions).toEqual([]);
      expect(state.gateValues).toEqual({});
      expect(state.gateAnswers).toEqual([]);
      expect(state.gateLoopIteration).toBe(0);
      expect(state.recoveryAttempts).toBe(0);
    });

    it('sets updatedAt to a recent timestamp', () => {
      const before = Date.now();
      const state = createInitialState('run-1', 3);
      const after = Date.now();
      expect(state.updatedAt).toBeGreaterThanOrEqual(before);
      expect(state.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('toSnapshot', () => {
    it('extracts the correct snapshot fields from state', () => {
      const state = makeState({
        runId: 'run-snap',
        status: 'running',
        stateVersion: 4,
        currentStepIndex: 2,
        totalSteps: 5,
        lastSeq: 10,
        totalCostMicros: 5000,
        heartbeatAt: 999,
        leaseExpiresAt: 2000,
        updatedAt: 1500,
      });

      const snapshot = toSnapshot(state);

      expect(snapshot).toEqual({
        runId: 'run-snap',
        status: 'running',
        stateVersion: 4,
        currentStepIndex: 2,
        totalSteps: 5,
        lastSeq: 10,
        totalCostMicros: 5000,
        heartbeatAt: 999,
        leaseExpiresAt: 2000,
        updatedAt: 1500,
      });
    });

    it('does not include internal-only fields', () => {
      const state = makeState({
        recoveryAttempts: 3,
        pendingQuestionId: 'q-1',
        rawPrompt: 'make a game',
      });

      const snapshot = toSnapshot(state);
      const keys = Object.keys(snapshot);

      expect(keys).not.toContain('recoveryAttempts');
      expect(keys).not.toContain('pendingQuestionId');
      expect(keys).not.toContain('rawPrompt');
      expect(keys).not.toContain('clarificationQuestions');
      expect(keys).not.toContain('gateValues');
      expect(keys).not.toContain('gateAnswers');
    });

    it('preserves null heartbeat and lease values', () => {
      const state = makeState({ heartbeatAt: null, leaseExpiresAt: null });
      const snapshot = toSnapshot(state);
      expect(snapshot.heartbeatAt).toBeNull();
      expect(snapshot.leaseExpiresAt).toBeNull();
    });
  });

  describe('eventKey', () => {
    it('pads seq to 12 digits', () => {
      expect(eventKey(1)).toBe(`${EVENT_KEY_PREFIX}000000000001`);
    });

    it('handles seq 0', () => {
      expect(eventKey(0)).toBe(`${EVENT_KEY_PREFIX}000000000000`);
    });

    it('handles large seq numbers', () => {
      expect(eventKey(999999999999)).toBe(`${EVENT_KEY_PREFIX}999999999999`);
    });

    it('preserves ordering when compared lexicographically', () => {
      const key1 = eventKey(1);
      const key10 = eventKey(10);
      const key100 = eventKey(100);
      expect(key1 < key10).toBe(true);
      expect(key10 < key100).toBe(true);
    });
  });

  describe('parseClientMessage', () => {
    it('parses a valid connect message', () => {
      const msg = JSON.stringify({ type: 'connect', runId: 'run-1', lastSeq: 5 });
      const result = parseClientMessage(msg);
      expect(result).toEqual({ type: 'connect', runId: 'run-1', lastSeq: 5 });
    });

    it('parses a valid pause message', () => {
      const msg = JSON.stringify({ type: 'pause', commandId: 'cmd-1' });
      const result = parseClientMessage(msg);
      expect(result).toEqual({ type: 'pause', commandId: 'cmd-1' });
    });

    it('parses a valid request_snapshot message', () => {
      const msg = JSON.stringify({ type: 'request_snapshot' });
      const result = parseClientMessage(msg);
      expect(result).toEqual({ type: 'request_snapshot' });
    });

    it('parses a valid pong message', () => {
      const msg = JSON.stringify({ type: 'pong' });
      const result = parseClientMessage(msg);
      expect(result).toEqual({ type: 'pong' });
    });

    it('returns null for ArrayBuffer input', () => {
      const buf = new ArrayBuffer(8);
      expect(parseClientMessage(buf)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parseClientMessage('not json')).toBeNull();
    });

    it('returns null for JSON that is not an object', () => {
      expect(parseClientMessage('"just a string"')).toBeNull();
      expect(parseClientMessage('42')).toBeNull();
      expect(parseClientMessage('null')).toBeNull();
    });

    it('returns null for JSON object without type field', () => {
      expect(parseClientMessage(JSON.stringify({ runId: 'run-1' }))).toBeNull();
    });

    it('returns null for JSON array', () => {
      expect(parseClientMessage(JSON.stringify([1, 2, 3]))).toBeNull();
    });
  });
});
