import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { WalletService } from '@/economy/wallet-service';
import { AgentBillingService } from '@/economy/agent-billing-service';
import { initTestDatabase, TEST_USER, TEST_USER_2, createTestUser, createAuthenticatedCaller } from '@/__fixtures__/test-utils';

vi.mock('@/agent/planning-gates', async () => {
  const actual = await vi.importActual<typeof import('@/agent/planning-gates')>('@/agent/planning-gates');

  const gates = [
    { id: 'core_game_loop', label: 'Core Game Loop', description: '', required: true },
    { id: 'win_lose_conditions', label: 'Win/Lose Conditions', description: '', required: true },
    { id: 'theme_style', label: 'Theme & Style', description: '', required: true },
    { id: 'game_type_category', label: 'Game Type/Category', description: '', required: true },
  ];

  return {
    ...actual,
    loadGatesConfig: vi.fn(() => ({ gates })),
    validatePlanningDoc: vi.fn((planningDocJson: string | null | undefined) => {
      if (!planningDocJson) {
        return {
          valid: false,
          missingFields: gates.map((gate) => ({ id: gate.id, label: gate.label })),
        };
      }

      let planningDoc: Record<string, unknown>;
      try {
        planningDoc = JSON.parse(planningDocJson) as Record<string, unknown>;
      } catch {
        return {
          valid: false,
          missingFields: gates.map((gate) => ({ id: gate.id, label: gate.label })),
        };
      }

      const missingFields = gates
        .filter((gate) => {
          if (!gate.required) {
            return false;
          }

          const value = planningDoc[gate.id];
          return typeof value !== 'string' || value.trim().length === 0;
        })
        .map((gate) => ({ id: gate.id, label: gate.label }));

      return {
        valid: missingFields.length === 0,
        missingFields,
      };
    }),
  };
});

describe('Agent Runs Router', () => {
  let walletService: WalletService;
  let billingService: AgentBillingService;

  beforeAll(async () => {
    await initTestDatabase();
  });

  beforeEach(async () => {
    walletService = new WalletService(env.DB);
    billingService = new AgentBillingService(env.DB, walletService);

    env.AI_EDITING_ENABLED = 'true';
    env.AI_EDITING_ALLOWED_USERS = undefined;

    await env.DB.prepare('DELETE FROM agent_costs').run();
    await env.DB.prepare('DELETE FROM agent_checkpoints').run();
    await env.DB.prepare('DELETE FROM agent_events').run();
    await env.DB.prepare('DELETE FROM agent_steps').run();
    await env.DB.prepare('DELETE FROM agent_runs').run();
    await env.DB.prepare('DELETE FROM credit_transactions').run();
    await env.DB.prepare('DELETE FROM user_wallets').run();
    await env.DB.prepare('DELETE FROM games').run();
    await env.DB.prepare('DELETE FROM users').run();

    await createTestUser(TEST_USER);
    await createTestUser(TEST_USER_2);
  });

  describe('createRun', () => {
    it('creates agent run with correct initial state', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const gameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(gameId, TEST_USER.id, 'Test Game', `games/${gameId}`, now, now).run();

      const result = await caller.agentRuns.createRun({
        gameId,
        source: 'scratch',
        tier: 'free',
      });

      expect(result.runId).toBeDefined();
      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedCost.totalMicros).toBeGreaterThan(0);

      const run = await env.DB.prepare('SELECT * FROM agent_runs WHERE id = ?')
        .bind(result.runId)
        .first();

      expect(run).toBeDefined();
      expect(run.user_id).toBe(TEST_USER.id);
      expect(run.game_id).toBe(gameId);
      expect(run.source).toBe('scratch');
      expect(run.tier).toBe('free');
      expect(run.status).toBe('planning');
      expect(run.total_steps).toBe(5);

      const steps = await env.DB.prepare('SELECT * FROM agent_steps WHERE run_id = ? ORDER BY step_index')
        .bind(result.runId)
        .all();

      expect(steps.results).toHaveLength(5);
      expect(steps.results[0].stage).toBe('planning');
      expect(steps.results[1].stage).toBe('build');
      expect(steps.results[2].stage).toBe('refine');
      expect(steps.results[3].stage).toBe('theme');
      expect(steps.results[4].stage).toBe('asset');
    });

    it('rejects run creation when AI editing is disabled', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const originalEnabled = env.AI_EDITING_ENABLED;
      env.AI_EDITING_ENABLED = 'false';

      await expect(
        caller.agentRuns.createRun({
          gameId: testGameId,
          source: 'scratch',
          tier: 'free',
        })
      ).rejects.toThrow('AI editing is not enabled for your account');

      env.AI_EDITING_ENABLED = originalEnabled;
    });

    it('allows beta users when AI_EDITING_ALLOWED_USERS is set', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const originalEnabled = env.AI_EDITING_ENABLED;
      const originalAllowed = env.AI_EDITING_ALLOWED_USERS;

      env.AI_EDITING_ENABLED = 'true';
      env.AI_EDITING_ALLOWED_USERS = TEST_USER.id;

      const result = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      expect(result.runId).toBeDefined();

      env.AI_EDITING_ENABLED = originalEnabled;
      env.AI_EDITING_ALLOWED_USERS = originalAllowed;
    });

    it('rejects non-beta users when AI_EDITING_ALLOWED_USERS is set', async () => {
      const caller = createAuthenticatedCaller(TEST_USER_2);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER_2.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const originalEnabled = env.AI_EDITING_ENABLED;
      const originalAllowed = env.AI_EDITING_ALLOWED_USERS;

      env.AI_EDITING_ENABLED = 'true';
      env.AI_EDITING_ALLOWED_USERS = TEST_USER.id;

      await expect(
        caller.agentRuns.createRun({
          gameId: testGameId,
          source: 'scratch',
          tier: 'free',
        })
      ).rejects.toThrow('AI editing is not enabled for your account');

      env.AI_EDITING_ENABLED = originalEnabled;
      env.AI_EDITING_ALLOWED_USERS = originalAllowed;
    });

    it('rejects run for game user does not own', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER_2.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await expect(
        caller.agentRuns.createRun({
          gameId: testGameId,
          source: 'scratch',
          tier: 'free',
        })
      ).rejects.toThrow('Cannot create run for game you do not own');
    });

    it('requires sourceGameId when source is fork', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await expect(
        caller.agentRuns.createRun({
          gameId: testGameId,
          source: 'fork',
          tier: 'free',
        })
      ).rejects.toThrow();
    });
  });

  describe('billing integration', () => {
    it('reserves budget when starting run', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 10_000_000,
        description: 'Test credit',
      });

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const estimatedCost = createResult.estimatedCost.totalMicros;
      const reservation = await billingService.reserveBudget({
        userId: TEST_USER.id,
        runId: createResult.runId,
        estimatedCostMicros: estimatedCost,
      });

      expect(reservation.reservedMicros).toBe(estimatedCost);

      const balance = await walletService.getBalance(TEST_USER.id);
      expect(balance).toBe(10_000_000 - estimatedCost);

      const run = await env.DB.prepare('SELECT * FROM agent_runs WHERE id = ?')
        .bind(createResult.runId)
        .first();

      expect(run.reserved_micros).toBe(estimatedCost);
    });
  });

  describe('pollRunStatus', () => {
    it('returns run status and events', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      await env.DB.prepare(
        'INSERT INTO agent_events (id, run_id, seq, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        createResult.runId,
        1,
        'step_started',
        JSON.stringify({ type: 'step_started', stepIndex: 0, stage: 'planning' }),
        now
      ).run();

      const pollResult = await caller.agentRuns.pollRunStatus({
        runId: createResult.runId,
        lastSeq: 0,
      });

      expect(pollResult.status).toBe('planning');
      expect(pollResult.currentStepIndex).toBe(0);
      expect(pollResult.totalSteps).toBe(5);
      expect(pollResult.lastSeq).toBe(1);
      expect(pollResult.events).toHaveLength(1);
      expect(pollResult.events[0].eventType).toBe('step_started');
    });

    it('returns only new events after lastSeq', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      await env.DB.prepare(
        'INSERT INTO agent_events (id, run_id, seq, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        createResult.runId,
        1,
        'step_started',
        JSON.stringify({ type: 'step_started', stepIndex: 0, stage: 'planning' }),
        now
      ).run();

      await env.DB.prepare(
        'INSERT INTO agent_events (id, run_id, seq, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        createResult.runId,
        2,
        'step_completed',
        JSON.stringify({ type: 'step_completed', stepIndex: 0, stage: 'planning' }),
        now + 1000
      ).run();

      const pollResult = await caller.agentRuns.pollRunStatus({
        runId: createResult.runId,
        lastSeq: 1,
      });

      expect(pollResult.events).toHaveLength(1);
      expect(pollResult.events[0].seq).toBe(2);
      expect(pollResult.events[0].eventType).toBe('step_completed');
    });
  });

  describe('getRun', () => {
    it('returns run with steps and cost summary', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const getResult = await caller.agentRuns.getRun({
        runId: createResult.runId,
      });

      expect(getResult.run.id).toBe(createResult.runId);
      expect(getResult.run.userId).toBe(TEST_USER.id);
      expect(getResult.run.gameId).toBe(testGameId);
      expect(getResult.steps).toHaveLength(5);
      expect(getResult.costSummary).toBeDefined();
      expect(getResult.costSummary.actualCostMicros).toBe(0);
      expect(getResult.costSummary.reservedMicros).toBe(0);
    });

    it('rejects access to run from different user', async () => {
      const caller1 = createAuthenticatedCaller(TEST_USER);
      const caller2 = createAuthenticatedCaller(TEST_USER_2);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const createResult = await caller1.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      await expect(
        caller2.agentRuns.getRun({
          runId: createResult.runId,
        })
      ).rejects.toThrow('Agent run not found');
    });
  });

  describe('listRuns', () => {
    it('lists runs for user', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const run1 = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const run2 = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'standard',
      });

      const listResult = await caller.agentRuns.listRuns({});

      expect(listResult.runs).toHaveLength(2);
      expect(listResult.runs.map((r: { id: string }) => r.id)).toContain(run1.runId);
      expect(listResult.runs.map((r: { id: string }) => r.id)).toContain(run2.runId);
    });

    it('filters runs by gameId', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId1 = crypto.randomUUID();
      const testGameId2 = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId1, TEST_USER.id, 'Test Game 1', `games/${testGameId1}`, now, now).run();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId2, TEST_USER.id, 'Test Game 2', `games/${testGameId2}`, now, now).run();

      const run1 = await caller.agentRuns.createRun({
        gameId: testGameId1,
        source: 'scratch',
        tier: 'free',
      });

      await caller.agentRuns.createRun({
        gameId: testGameId2,
        source: 'scratch',
        tier: 'free',
      });

      const listResult = await caller.agentRuns.listRuns({
        gameId: testGameId1,
      });

      expect(listResult.runs).toHaveLength(1);
      expect(listResult.runs[0].id).toBe(run1.runId);
    });
  });

  describe('gate enforcement', () => {
    it('rejects startRun when planning doc is missing required fields', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 10_000_000,
        description: 'Test credit',
      });

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const incompletePlanningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies',
        theme_style: 'Candy-themed',
      });

      await caller.agentRuns.updatePlanningDoc({
        runId: createResult.runId,
        planningDocJson: incompletePlanningDoc,
      });

      await expect(
        caller.agentRuns.startRun({ runId: createResult.runId })
      ).rejects.toThrow('Planning document is incomplete');
    });

    it('validates planning doc before reserving budget', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 10_000_000,
        description: 'Test credit',
      });

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const completePlanningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies to clear them',
        win_lose_conditions: 'Win by reaching 1000 points',
        theme_style: 'Candy-themed with bright colors',
        game_type_category: 'Match-3 puzzle',
      });

      await caller.agentRuns.updatePlanningDoc({
        runId: createResult.runId,
        planningDocJson: completePlanningDoc,
      });

      const balanceBefore = await walletService.getBalance(TEST_USER.id);

      try {
        await caller.agentRuns.startRun({ runId: createResult.runId });
      } catch (error) {
        // Coordinator may fail due to test environment, but we're testing gate validation
      }

      // Wait for any background DO operations to settle before checking balance
      await new Promise(resolve => setTimeout(resolve, 200));

      const balanceAfter = await walletService.getBalance(TEST_USER.id);

      // Budget should have been reserved (balance decreased)
      expect(balanceAfter).toBeLessThan(balanceBefore);
    });

    it('rejects startRun when planning doc is null', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 10_000_000,
        description: 'Test credit',
      });

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      await expect(
        caller.agentRuns.startRun({ runId: createResult.runId })
      ).rejects.toThrow('Planning document is incomplete');
    });

    it('rejects startRun when planning doc has empty required fields', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await walletService.credit({
        userId: TEST_USER.id,
        type: 'signup_code_grant',
        amountMicros: 10_000_000,
        description: 'Test credit',
      });

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      const emptyFieldsPlanningDoc = JSON.stringify({
        core_game_loop: 'Match 3 candies',
        win_lose_conditions: '',
        theme_style: '   ',
        game_type_category: 'Match-3 puzzle',
      });

      await caller.agentRuns.updatePlanningDoc({
        runId: createResult.runId,
        planningDocJson: emptyFieldsPlanningDoc,
      });

      await expect(
        caller.agentRuns.startRun({ runId: createResult.runId })
      ).rejects.toThrow('Planning document is incomplete');
    });
  });

  describe('Q/A loop', () => {
    it('rejects submitAnswer when run is not waiting_for_input', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      const createResult = await caller.agentRuns.createRun({
        gameId: testGameId,
        source: 'scratch',
        tier: 'free',
      });

      await expect(
        caller.agentRuns.submitAnswer({
          runId: createResult.runId,
          questionId: 'test-question',
          answer: 'test answer',
        })
      ).rejects.toThrow('Run must be waiting_for_input to submit an answer');
    });

    it('allows submitAnswer when run is waiting_for_input', async () => {
      const caller = createAuthenticatedCaller(TEST_USER);
      const now = Date.now();
      const testGameId = crypto.randomUUID();
      const runId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO games (id, user_id, title, r2_prefix, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(testGameId, TEST_USER.id, 'Test Game', `games/${testGameId}`, now, now).run();

      await env.DB.prepare(
        `INSERT INTO agent_runs (
          id, user_id, game_id, source, source_game_id, tier, status,
          planning_doc_json, estimated_cost_micros, actual_cost_micros, reserved_micros,
          current_step_index, total_steps, error_message, created_at, started_at, finished_at, updated_at
        ) VALUES (?, ?, ?, 'scratch', NULL, 'free', 'waiting_for_input', NULL, 500000, 0, 0, 1, 5, NULL, ?, ?, NULL, ?)`
      ).bind(runId, TEST_USER.id, testGameId, now, now, now).run();

      const coordinatorId = env.RUN_COORDINATOR.idFromName(runId);
      const coordinator = env.RUN_COORDINATOR.get(coordinatorId);
      const getSpy = vi.spyOn(env.RUN_COORDINATOR, 'get').mockReturnValue(coordinator);
      const fetchSpy = vi.spyOn(coordinator, 'fetch').mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      let result: { success: boolean };
      try {
        result = await caller.agentRuns.submitAnswer({
          runId,
          questionId: 'test-question',
          answer: 'test answer',
        });
      } finally {
        fetchSpy.mockRestore();
        getSpy.mockRestore();
      }

      expect(result.success).toBe(true);
    });
  });

});
