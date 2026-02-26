import {
	createEmptyDesignDocument,
	type DesignDocument,
	DesignDocumentSchema,
} from "@slopcade/shared/types/design";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
	AgentExecutionEnv,
	AgentExecutionStageContext,
} from "../execution-engine";
import { buildStage } from "../stages/build";
import { designStage } from "../stages/design";

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

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

function createMockEnv() {
	const storage = new Map<string, string>();
	const get = vi.fn(async (key: string) => {
		const value = storage.get(key);
		if (!value) {
			return null;
		}

		return {
			text: vi.fn(async () => value),
		};
	});

	const put = vi.fn(async (key: string, value: unknown) => {
		storage.set(key, String(value));
		return null;
	});

	const env: AgentExecutionEnv = {
		DB: {} as D1Database,
		ASSETS: {
			get,
			put,
		} as unknown as R2Bucket,
		OPENROUTER_API_KEY: "test-key",
	};

	return { env, storage, get, put };
}

function createContext(
	overrides: Partial<AgentExecutionStageContext> = {},
): AgentExecutionStageContext {
	const { env } = createMockEnv();
	return {
		runId: "run-design-flow",
		stepId: "step-1",
		stepIndex: 1,
		stage: "design",
		tier: "free",
		env,
		previousArtifacts: {
			planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
		},
		context: {
			gameId: "game-design-flow",
			gameTitle: "Design Flow Runner",
			gameDescription: "A game generated from a staged flow",
			planningDocJson:
				"# Plan\n- Build a runner with menu and game-over states",
		},
		planningDoc: "# Plan\n- Build a runner with menu and game-over states",
		...overrides,
	};
}

function makeValidDesignDocument(): DesignDocument {
	const doc = createEmptyDesignDocument(
		"game-design-flow",
		"Design Flow Runner",
	);
	doc.frames = [
		{
			id: "frame-main",
			title: "Main Menu",
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
					fill: "#111111",
				},
				{
					type: "text",
					id: "title",
					x: 180,
					y: 160,
					width: 720,
					height: 120,
					zIndex: 1,
					content: "Design Flow Runner",
					fontSize: 72,
				},
			],
		},
	];
	doc.metadata.updatedAt = doc.metadata.createdAt + 1;
	return doc;
}

function makeValidGameDefinition(): GameDefinition {
	return {
		metadata: {
			id: "game-design-flow",
			title: "Design Flow Runner",
			version: "1.0.0",
		},
		world: {
			gravity: { x: 0, y: 9.8 },
			pixelsPerMeter: 50,
		},
		prefabs: {
			player: {
				id: "player",
				tags: ["player"],
				visual: {
					type: "rect",
					width: 1,
					height: 1,
					color: "#ffffff",
				},
				physics: {
					bodyType: "dynamic",
					density: 1,
				},
				collider: {
					shape: "box",
					width: 1,
					height: 1,
				},
			},
		},
		entities: [
			{
				id: "player-1",
				name: "Player",
				prefab: "player",
				transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
			},
		],
	};
}

describe("design-first flow integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("persists a valid design artifact then uses it in build prompt", async () => {
		const { env, storage } = createMockEnv();
		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject
			.mockResolvedValueOnce({
				object: makeValidDesignDocument(),
				usage: { inputTokens: 101, outputTokens: 202 },
			} as never)
			.mockResolvedValueOnce({
				object: makeValidGameDefinition(),
				usage: { inputTokens: 303, outputTokens: 404 },
			} as never);

		const designResult = await designStage(
			createContext({ env, stage: "design", stepIndex: 1 }),
		);

		expect(designResult.status).toBe("succeeded");
		if (designResult.status !== "succeeded") {
			return;
		}

		expect(designResult.outputArtifactKey).toBe(
			"agent-runs/run-design-flow/steps/1/design/output.json",
		);
		const persistedDesignRaw = storage.get(designResult.outputArtifactKey);
		expect(persistedDesignRaw).toBeTruthy();
		expect(
			DesignDocumentSchema.safeParse(JSON.parse(String(persistedDesignRaw)))
				.success,
		).toBe(true);

		const buildResult = await buildStage(
			createContext({
				env,
				stage: "build",
				stepIndex: 2,
				stepId: "step-2",
				previousArtifacts: {
					planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
					design: designResult.outputArtifactKey,
				},
			}),
		);

		expect(buildResult.status).toBe("succeeded");
		const buildCall = mockGenerateObject.mock.calls[1]?.[0];
		expect(buildCall?.prompt).toContain(
			"Design reference (approved screens/frames):",
		);
		expect(buildCall?.prompt).toContain(
			'Frame "Main Menu": 2 elements (1 rect, 1 text).',
		);
	});

	it("returns VALIDATION_FAILED after invalid design retries and writes no artifact", async () => {
		const { env, storage } = createMockEnv();
		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: createEmptyDesignDocument(
				"game-design-flow",
				"Design Flow Runner",
			),
			usage: { inputTokens: 10, outputTokens: 20 },
		} as never);

		const result = await designStage(createContext({ env, stage: "design" }));

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.failureReason).toBe("VALIDATION_FAILED");
			expect(result.errorMessage).toContain(
				"design must include at least one frame",
			);
			expect(result.checkpoint).toMatchObject({
				stage: "design",
				retries: 2,
			});
		}

		expect(mockGenerateObject).toHaveBeenCalledTimes(2);
		expect(
			storage.has("agent-runs/run-design-flow/steps/1/design/output.json"),
		).toBe(false);
	});

	it("includes design reference in build prompt when pre-existing design artifact is present", async () => {
		const { env, storage } = createMockEnv();
		const designArtifactKey =
			"agent-runs/run-design-flow/steps/1/design/output.json";
		storage.set(designArtifactKey, JSON.stringify(makeValidDesignDocument()));

		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: makeValidGameDefinition(),
			usage: { inputTokens: 11, outputTokens: 22 },
		} as never);

		const result = await buildStage(
			createContext({
				env,
				stage: "build",
				stepIndex: 2,
				previousArtifacts: {
					planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
					design: designArtifactKey,
				},
			}),
		);

		expect(result.status).toBe("succeeded");
		const buildCall = mockGenerateObject.mock.calls[0]?.[0];
		expect(buildCall?.prompt).toContain(
			"Design reference (approved screens/frames):",
		);
	});

	it("build succeeds when design artifact key exists but content is unavailable", async () => {
		const { env } = createMockEnv();
		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: makeValidGameDefinition(),
			usage: { inputTokens: 12, outputTokens: 24 },
		} as never);

		const result = await buildStage(
			createContext({
				env,
				stage: "build",
				stepIndex: 2,
				previousArtifacts: {
					planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
					design:
						"agent-runs/run-design-flow/steps/1/design/missing-output.json",
				},
			}),
		);

		expect(result.status).toBe("succeeded");
		const buildCall = mockGenerateObject.mock.calls[0]?.[0];
		expect(buildCall?.prompt).not.toContain(
			"Design reference (approved screens/frames):",
		);
	});

	it("legacy flow without design stage still builds from planning context only", async () => {
		const { env, get } = createMockEnv();
		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: makeValidGameDefinition(),
			usage: { inputTokens: 13, outputTokens: 26 },
		} as never);

		const result = await buildStage(
			createContext({
				env,
				stage: "build",
				stepIndex: 1,
				previousArtifacts: {
					planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
				},
			}),
		);

		expect(result.status).toBe("succeeded");
		expect(get).not.toHaveBeenCalled();
		const buildCall = mockGenerateObject.mock.calls[0]?.[0];
		expect(buildCall?.prompt).toContain("Planning doc:");
		expect(buildCall?.prompt).not.toContain(
			"Design reference (approved screens/frames):",
		);
	});
});
