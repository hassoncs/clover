import type { DesignDocument } from "@slopcade/shared/types/design";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentExecutionStageContext } from "../execution-engine";

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

vi.mock("@/ai/agent/tier-config", () => ({
	resolveTierConfig: vi.fn(() => ({
		primary: { provider: "openrouter", model: "openai/gpt-4o-mini" },
		estimatedCostPerStepMicros: 1234,
	})),
	createModelForTier: vi.fn(() => ({ mockedModel: true })),
}));

import { generateObject } from "ai";
import { designStage } from "./design";

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

function createContext(): AgentExecutionStageContext {
	return {
		runId: "run-1",
		stepId: "step-1",
		stepIndex: 1,
		stage: "design",
		tier: "free",
		env: {
			DB: {} as D1Database,
			ASSETS: {
				put: vi.fn(async () => null),
			} as unknown as R2Bucket,
			OPENROUTER_API_KEY: "test-key",
		},
		previousArtifacts: {
			planning: "agent-runs/run-1/steps/0/planning/output.md",
		},
		context: {
			gameId: "game-1",
			gameTitle: "Sky Sprint",
			gameDescription: "Jump between floating islands",
			planningDocJson: "# Goal\nCreate a one-tap platformer",
		},
		planningDoc: "# Goal\nCreate a one-tap platformer",
	};
}

function makeValidDesignDocument(): DesignDocument {
	const now = Date.now();
	return {
		version: "1.1",
		metadata: {
			title: "Sky Sprint",
			gameId: "game-1",
			createdAt: now,
			updatedAt: now,
		},
		frames: [
			{
				id: "frame-main",
				title: "Main Gameplay",
				width: 1080,
				height: 1920,
				position: { x: 0, y: 0 },
				elements: [
					{
						type: "rect",
						id: "bg",
						x: 0,
						y: 0,
						width: 1080,
						height: 1920,
						zIndex: 0,
						fill: "#101010",
					},
					{
						type: "text",
						id: "score",
						x: 40,
						y: 40,
						width: 240,
						height: 80,
						zIndex: 2,
						content: "Score: 0",
						fontSize: 42,
					},
				],
			},
		],
	};
}

describe("designStage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("persists generated design artifact on valid model output", async () => {
		const context = createContext();
		const mockGenerateObject = vi.mocked(generateObject);
		const designDocument = makeValidDesignDocument();

		mockGenerateObject.mockResolvedValue({
			object: designDocument,
			usage: {
				inputTokens: 44,
				outputTokens: 91,
			},
		} as never);

		const result = await designStage(context);

		expect(result.status).toBe("succeeded");
		if (result.status === "succeeded") {
			expect(result.outputArtifactKey).toBe(
				"agent-runs/run-1/steps/1/design/output.json",
			);
			expect(result.inputTokens).toBe(44);
			expect(result.outputTokens).toBe(91);
			expect(result.checkpoint).toMatchObject({
				stage: "design",
				designVersion: "1.1",
				designFrameCount: 1,
			});
		}

		const put = context.env.ASSETS.put as unknown as ReturnType<typeof vi.fn>;
		expect(put).toHaveBeenCalledTimes(1);
		expect(put.mock.calls[0]?.[0]).toBe(
			"agent-runs/run-1/steps/1/design/output.json",
		);
		expect(JSON.parse(String(put.mock.calls[0]?.[1]))).toEqual(designDocument);
	});

	it("rejects malformed model output and does not persist invalid artifact", async () => {
		const context = createContext();
		const mockGenerateObject = vi.mocked(generateObject);

		mockGenerateObject.mockResolvedValue({
			object: {
				version: "1.1",
				metadata: {
					title: "Sky Sprint",
					gameId: "game-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
				frames: [],
			},
			usage: {
				inputTokens: 10,
				outputTokens: 22,
			},
		} as never);

		const result = await designStage(context);

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("VALIDATION_FAILED");
			expect(result.errorMessage).toContain(
				"design must include at least one frame",
			);
			expect(result.checkpoint).toMatchObject({
				stage: "design",
				failureReason: "VALIDATION_FAILED",
				retries: 2,
			});
		}

		expect(mockGenerateObject).toHaveBeenCalledTimes(2);
		const put = context.env.ASSETS.put as unknown as ReturnType<typeof vi.fn>;
		expect(put).not.toHaveBeenCalled();
	});

	it("classifies model errors with MODEL_ERROR and includes failureReason in checkpoint", async () => {
		const context = createContext();
		const mockGenerateObject = vi.mocked(generateObject);

		mockGenerateObject.mockRejectedValue(
			new Error("model rate limit exceeded"),
		);

		const result = await designStage(context);

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("MODEL_ERROR");
			expect(result.errorMessage).toContain("MODEL_ERROR");
			expect(result.checkpoint).toMatchObject({
				stage: "design",
				failureReason: "MODEL_ERROR",
				error: "model rate limit exceeded",
			});
		}

		expect(mockGenerateObject).toHaveBeenCalledTimes(1);
		const put = context.env.ASSETS.put as unknown as ReturnType<typeof vi.fn>;
		expect(put).not.toHaveBeenCalled();
	});

	it("includes validationIssues in checkpoint when quality checks fail", async () => {
		const context = createContext();
		const mockGenerateObject = vi.mocked(generateObject);
		const now = Date.now();

		mockGenerateObject.mockResolvedValue({
			object: {
				version: "1.1",
				metadata: {
					title: "Sky Sprint",
					gameId: "game-1",
					createdAt: now,
					updatedAt: now,
				},
				frames: [
					{
						id: "frame-empty",
						title: "Empty Frame",
						width: 1080,
						height: 1920,
						position: { x: 0, y: 0 },
						elements: [],
					},
				],
			},
			usage: {
				inputTokens: 15,
				outputTokens: 30,
			},
		} as never);

		const result = await designStage(context);

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("VALIDATION_FAILED");
			expect(result.checkpoint).toMatchObject({
				stage: "design",
				failureReason: "VALIDATION_FAILED",
				validationIssues: expect.arrayContaining([
					expect.stringContaining("element"),
				]),
			});
		}
	});
});
