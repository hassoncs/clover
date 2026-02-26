import { describe, expect, it, vi } from "vitest";

import {
	type AgentExecutionEnv,
	type AgentExecutionStageContext,
	type AgentExecutionStageResult,
	type AgentStage,
	type AgentStageRunner,
	executeAgentStage,
	STAGE_ORDER,
} from "../agent/execution-engine";

function createEnv(): AgentExecutionEnv {
	return {
		DB: {} as D1Database,
		ASSETS: {
			put: vi.fn(async () => null),
			get: vi.fn(async () => null),
		} as unknown as R2Bucket,
		OPENROUTER_API_KEY: "test-openrouter",
		OPENAI_API_KEY: "test-openai",
		ANTHROPIC_API_KEY: "test-anthropic",
	};
}

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

describe("executeAgentStage", () => {
	it("orders planning before design before build", () => {
		expect(STAGE_ORDER.indexOf("planning")).toBeLessThan(
			STAGE_ORDER.indexOf("design"),
		);
		expect(STAGE_ORDER.indexOf("design")).toBeLessThan(
			STAGE_ORDER.indexOf("build"),
		);
	});

	it("returns deterministic failure when prerequisites are missing", async () => {
		const result = await executeAgentStage({
			runId: "run-1",
			stepId: "step-1",
			stepIndex: 1,
			stage: "build",
			tier: "free",
			env: createEnv(),
			context: {
				gameId: "game-1",
				gameTitle: "Space Hopper",
				gameDescription: "jump between asteroids",
			},
			previousArtifacts: {},
		});

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("MISSING_PREREQUISITE");
			expect(result.errorMessage).toContain("planning");
		}
	});

	it("requires planning artifact before design stage can run", async () => {
		const result = await executeAgentStage({
			runId: "run-design-prereq",
			stepId: "step-1",
			stepIndex: 1,
			stage: "design",
			tier: "free",
			env: createEnv(),
			context: {
				gameId: "game-design-prereq",
				gameTitle: "Design Gate",
				gameDescription: "ensure prereq behavior",
			},
			previousArtifacts: {},
		});

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("MISSING_PREREQUISITE");
			expect(result.errorMessage).toContain("planning artifact missing");
		}
	});

	it("allows build stage to run when planning exists and design is absent", async () => {
		const env = createEnv();
		const buildRunner: AgentStageRunner = vi.fn(
			async (
				ctx: AgentExecutionStageContext,
			): Promise<AgentExecutionStageResult> => ({
				status: "succeeded",
				outputArtifactKey: `agent-runs/${ctx.runId}/steps/${ctx.stepIndex}/build/output.json`,
				costMicros: 1,
				inputTokens: 0,
				outputTokens: 0,
				provider: "stub",
				model: "stub",
				checkpoint: { stage: "build", compatibilityMode: true },
			}),
		);

		const result = await executeAgentStage(
			{
				runId: "run-build-compat",
				stepId: "step-2",
				stepIndex: 2,
				stage: "build",
				tier: "free",
				env,
				context: {
					gameId: "game-build-compat",
					gameTitle: "Compat Build",
					gameDescription: null,
				},
				previousArtifacts: {
					planning: "agent-runs/run-build-compat/steps/0/planning/output.md",
				},
			},
			{
				stageRunners: {
					build: buildRunner,
				},
			},
		);

		expect(result.status).toBe("succeeded");
		expect(buildRunner).toHaveBeenCalledTimes(1);
	});

	it("runs stage, persists checkpoint payload, and returns success shape", async () => {
		const env = createEnv();
		const runner: AgentStageRunner = vi.fn(
			async (
				ctx: AgentExecutionStageContext,
			): Promise<AgentExecutionStageResult> => ({
				status: "succeeded",
				outputArtifactKey: `agent-runs/${ctx.runId}/steps/${ctx.stepIndex}/planning/output.json`,
				costMicros: 1200,
				inputTokens: 100,
				outputTokens: 80,
				provider: "openrouter",
				model: "openai/gpt-4o-mini",
				checkpoint: { stage: "planning", summary: "ok" },
			}),
		);

		const result = await executeAgentStage(
			{
				runId: "run-2",
				stepId: "step-0",
				stepIndex: 0,
				stage: "planning",
				tier: "free",
				env,
				context: {
					gameId: "game-2",
					gameTitle: "Bubble Pop",
					gameDescription: "tap bubbles",
				},
				previousArtifacts: {},
			},
			{
				stageRunners: {
					planning: runner,
				},
			},
		);

		expect(result.status).toBe("succeeded");
		if (result.status === "succeeded") {
			expect(result.outputArtifactKey).toContain("/planning/output.json");
			expect(result.provider).toBe("openrouter");
			expect(result.model).toBe("openai/gpt-4o-mini");
		}

		const putCalls = (env.ASSETS.put as unknown as ReturnType<typeof vi.fn>)
			.mock.calls;
		expect(putCalls.length).toBeGreaterThan(0);
		expect(
			putCalls.some((call) => String(call[0]).includes("checkpoint.json")),
		).toBe(true);
	});
});

describe("stage override contract", () => {
	it("accepts partial stage runner overrides", async () => {
		const env = createEnv();
		const calls: AgentStage[] = [];

		const planningOverride: AgentStageRunner = async () => {
			calls.push("planning");
			return {
				status: "succeeded",
				outputArtifactKey: "agent-runs/run-3/steps/0/planning/output.json",
				costMicros: 1,
				inputTokens: 1,
				outputTokens: 1,
				provider: "openrouter",
				model: "openai/gpt-4o-mini",
				checkpoint: { ok: true },
			};
		};

		await executeAgentStage(
			{
				runId: "run-3",
				stepId: "step-0",
				stepIndex: 0,
				stage: "planning",
				tier: "free",
				env,
				context: {
					gameId: "game-3",
					gameTitle: "Frog Leap",
					gameDescription: null,
				},
				previousArtifacts: {},
			},
			{
				stageRunners: {
					planning: planningOverride,
				},
			},
		);

		expect(calls).toEqual(["planning"]);
	});
});
