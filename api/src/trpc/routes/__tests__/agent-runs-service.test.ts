import { describe, it, expect } from 'vitest';
import {
  STAGES,
  toRun,
  toStep,
  toEvent,
  toSnapshot,
  type AgentRunRow,
  type AgentStepRow,
  type AgentEventRow,
} from '../agent-runs-service';

function makeRunRow(overrides: Partial<AgentRunRow> = {}): AgentRunRow {
  return {
    id: 'run-1',
    user_id: 'user-1',
    game_id: 'game-1',
    source: 'scratch',
    source_game_id: null,
    tier: 'free',
    status: 'running',
    planning_doc_json: null,
    estimated_cost_micros: null,
    actual_cost_micros: 500,
    reserved_micros: 1000,
    current_step_index: 2,
    total_steps: 5,
    error_message: null,
    created_at: 1000,
    started_at: 2000,
    finished_at: null,
    updated_at: 3000,
    ...overrides,
  };
}

function makeStepRow(overrides: Partial<AgentStepRow> = {}): AgentStepRow {
  return {
    id: 'step-1',
    run_id: 'run-1',
    step_index: 0,
    stage: 'planning',
    status: 'succeeded',
    input_hash: 'abc123',
    output_artifact_key: 'artifacts/step-1',
    cost_micros: 250,
    error_message: null,
    created_at: 1000,
    started_at: 1500,
    finished_at: 2000,
    ...overrides,
  };
}

function makeEventRow(overrides: Partial<AgentEventRow> = {}): AgentEventRow {
  return {
    id: 'evt-1',
    seq: 1,
    event_type: 'step_started',
    payload_json: JSON.stringify({
      type: 'step_started',
      stepId: 'step-1',
      stepIndex: 0,
      stage: 'planning',
    }),
    created_at: 1000,
    ...overrides,
  };
}

describe('agent-runs-service', () => {
  describe('STAGES', () => {
    it('contains the five expected stages in order', () => {
      expect(STAGES).toEqual(['planning', 'build', 'refine', 'theme', 'asset']);
    });

    it('has exactly 5 entries', () => {
      expect(STAGES).toHaveLength(5);
    });
  });

  describe('toRun', () => {
    it('maps snake_case AgentRunRow to camelCase', () => {
      const row = makeRunRow();
      const result = toRun(row);

      expect(result).toEqual({
        id: 'run-1',
        userId: 'user-1',
        gameId: 'game-1',
        source: 'scratch',
        sourceGameId: null,
        tier: 'free',
        status: 'running',
        planningDocJson: null,
        estimatedCostMicros: null,
        actualCostMicros: 500,
        reservedMicros: 1000,
        currentStepIndex: 2,
        totalSteps: 5,
        errorMessage: null,
        createdAt: 1000,
        startedAt: 2000,
        finishedAt: null,
        updatedAt: 3000,
      });
    });

    it('preserves non-null optional fields', () => {
      const row = makeRunRow({
        source: 'fork',
        source_game_id: 'orig-game-1',
        planning_doc_json: '{"core_game_loop":"test"}',
        estimated_cost_micros: 5000,
        error_message: 'Something broke',
        finished_at: 9000,
      });
      const result = toRun(row);

      expect(result.source).toBe('fork');
      expect(result.sourceGameId).toBe('orig-game-1');
      expect(result.planningDocJson).toBe('{"core_game_loop":"test"}');
      expect(result.estimatedCostMicros).toBe(5000);
      expect(result.errorMessage).toBe('Something broke');
      expect(result.finishedAt).toBe(9000);
    });
  });

  describe('toStep', () => {
    it('maps snake_case AgentStepRow to camelCase', () => {
      const row = makeStepRow();
      const result = toStep(row);

      expect(result).toEqual({
        id: 'step-1',
        runId: 'run-1',
        stepIndex: 0,
        stage: 'planning',
        status: 'succeeded',
        inputHash: 'abc123',
        outputArtifactKey: 'artifacts/step-1',
        costMicros: 250,
        errorMessage: null,
        createdAt: 1000,
        startedAt: 1500,
        finishedAt: 2000,
      });
    });

    it('handles null optional fields', () => {
      const row = makeStepRow({
        input_hash: null,
        output_artifact_key: null,
        started_at: null,
        finished_at: null,
      });
      const result = toStep(row);

      expect(result.inputHash).toBeNull();
      expect(result.outputArtifactKey).toBeNull();
      expect(result.startedAt).toBeNull();
      expect(result.finishedAt).toBeNull();
    });

    it('maps failed step with error message', () => {
      const row = makeStepRow({
        status: 'failed',
        error_message: 'Model timeout',
      });
      const result = toStep(row);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Model timeout');
    });
  });

  describe('toEvent', () => {
    it('parses a valid payload', () => {
      const row = makeEventRow();
      const result = toEvent(row);

      expect(result).toEqual({
        seq: 1,
        eventType: 'step_started',
        payload: {
          type: 'step_started',
          stepId: 'step-1',
          stepIndex: 0,
          stage: 'planning',
        },
        timestamp: 1000,
      });
    });

    it('returns error payload when payload_json is null', () => {
      const row = makeEventRow({ id: 'evt-null', payload_json: null });
      const result = toEvent(row);

      expect(result.payload).toEqual({
        type: 'error',
        errorMessage: 'Invalid event payload',
        errorContext: 'event:evt-null',
      });
      expect(result.seq).toBe(1);
      expect(result.timestamp).toBe(1000);
    });

    it('returns error payload when payload_json is invalid JSON', () => {
      const row = makeEventRow({ id: 'evt-bad', payload_json: '{not valid json' });
      const result = toEvent(row);

      expect(result.payload).toEqual({
        type: 'error',
        errorMessage: 'Invalid event payload',
        errorContext: 'event:evt-bad',
      });
    });

    it('returns error payload when payload_json fails schema validation', () => {
      const row = makeEventRow({
        id: 'evt-schema',
        payload_json: JSON.stringify({ type: 'unknown_type', foo: 'bar' }),
      });
      const result = toEvent(row);

      expect(result.payload).toEqual({
        type: 'error',
        errorMessage: 'Invalid event payload',
        errorContext: 'event:evt-schema',
      });
    });

    it('parses run_completed payload', () => {
      const row = makeEventRow({
        event_type: 'run_completed',
        payload_json: JSON.stringify({
          type: 'run_completed',
          totalSteps: 5,
          totalCostMicros: 12000,
        }),
      });
      const result = toEvent(row);

      expect(result.eventType).toBe('run_completed');
      expect(result.payload).toEqual({
        type: 'run_completed',
        totalSteps: 5,
        totalCostMicros: 12000,
      });
    });

    it('parses cost_recorded payload', () => {
      const row = makeEventRow({
        event_type: 'cost_recorded',
        payload_json: JSON.stringify({
          type: 'cost_recorded',
          costMicros: 300,
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        }),
      });
      const result = toEvent(row);

      expect(result.payload).toEqual({
        type: 'cost_recorded',
        costMicros: 300,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      });
    });
  });

  describe('toSnapshot', () => {
    it('creates a snapshot from a run row and lastSeq', () => {
      const row = makeRunRow();
      const result = toSnapshot(row, 42);

      expect(result).toEqual({
        runId: 'run-1',
        status: 'running',
        currentStepIndex: 2,
        totalSteps: 5,
        lastSeq: 42,
        totalCostMicros: 500,
        heartbeatAt: null,
        leaseExpiresAt: null,
        updatedAt: 3000,
      });
    });

    it('reflects succeeded status and zero lastSeq', () => {
      const row = makeRunRow({
        status: 'succeeded',
        actual_cost_micros: 15000,
        current_step_index: 5,
        updated_at: 9999,
      });
      const result = toSnapshot(row, 0);

      expect(result.status).toBe('succeeded');
      expect(result.lastSeq).toBe(0);
      expect(result.totalCostMicros).toBe(15000);
      expect(result.currentStepIndex).toBe(5);
      expect(result.updatedAt).toBe(9999);
    });

    it('always sets heartbeatAt and leaseExpiresAt to null', () => {
      const row = makeRunRow();
      const result = toSnapshot(row, 10);

      expect(result.heartbeatAt).toBeNull();
      expect(result.leaseExpiresAt).toBeNull();
    });
  });
});
