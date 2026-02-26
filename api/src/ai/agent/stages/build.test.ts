import type { DesignDocument } from "@slopcade/shared/types/design";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentExecutionStageContext } from "../execution-engine";

vi.mock("ai", () => ({
	generateObject: vi.fn(),
}));

vi.mock("@/ai/agent/tier-config", () => ({
	resolveTierConfig: vi.fn(() => ({
		primary: { provider: "openrouter", model: "openai/gpt-4o-mini" },
		estimatedCostPerStepMicros: 4321,
	})),
	createModelForTier: vi.fn(() => ({ mockedModel: true })),
}));

import { generateObject } from "ai";
import { buildStage } from "./build";

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

function makeGeneratedGame(): GameDefinition {
	return {
		metadata: {
			id: "game-1",
			title: "Neon Hopper",
			version: "1.0.0",
		},
		world: {
			gravity: { x: 0, y: 10 },
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

function makeDesignDocument(): DesignDocument {
	const now = Date.now();
	return {
		version: "1.1",
		metadata: {
			title: "Neon Hopper",
			gameId: "game-1",
			createdAt: now,
			updatedAt: now,
		},
		frames: [
			{
				id: "main-menu",
				title: "Main Menu",
				width: 1080,
				height: 1920,
				position: { x: 0, y: 0 },
				elements: [
					{
						type: "rect",
						id: "panel",
						x: 120,
						y: 240,
						width: 840,
						height: 1320,
						zIndex: 0,
					},
					{
						type: "rect",
						id: "cta",
						x: 260,
						y: 1240,
						width: 560,
						height: 180,
						zIndex: 1,
					},
					{
						type: "text",
						id: "title",
						x: 240,
						y: 420,
						width: 600,
						height: 140,
						zIndex: 2,
						content: "Neon Hopper",
						fontSize: 96,
					},
				],
			},
			{
				id: "game-over",
				title: "Game Over",
				width: 1080,
				height: 1920,
				position: { x: 1120, y: 0 },
				elements: [
					{
						type: "rect",
						id: "dialog",
						x: 160,
						y: 520,
						width: 760,
						height: 880,
						zIndex: 0,
					},
					{
						type: "image",
						id: "medal",
						x: 420,
						y: 700,
						width: 240,
						height: 240,
						zIndex: 1,
					},
				],
			},
		],
	};
}

function createContext(
	overrides: Partial<AgentExecutionStageContext> = {},
): AgentExecutionStageContext {
	return {
		runId: "run-1",
		stepId: "step-2",
		stepIndex: 2,
		stage: "build",
		tier: "free",
		env: {
			DB: {} as D1Database,
			ASSETS: {
				get: vi.fn(async () => null),
				put: vi.fn(async () => null),
			} as unknown as R2Bucket,
			OPENROUTER_API_KEY: "test-key",
		},
		previousArtifacts: {
			planning: "agent-runs/run-1/steps/0/planning/output.md",
		},
		context: {
			gameId: "game-1",
			gameTitle: "Neon Hopper",
			gameDescription: "Dash through glowing platforms",
			planningDocJson: "# Goal\nCreate a fast arcade runner",
		},
		planningDoc: "# Goal\nCreate a fast arcade runner",
		...overrides,
	};
}

describe("buildStage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("injects approved design reference summary when design artifact exists", async () => {
		const context = createContext({
			previousArtifacts: {
				planning: "agent-runs/run-1/steps/0/planning/output.md",
				design: "agent-runs/run-1/steps/1/design/output.json",
			},
		});
		const designDoc = makeDesignDocument();
		const get = context.env.ASSETS.get as unknown as ReturnType<typeof vi.fn>;
		get.mockResolvedValue({
			text: vi.fn(async () => JSON.stringify(designDoc)),
		});

		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: makeGeneratedGame(),
			usage: {
				inputTokens: 55,
				outputTokens: 120,
			},
		} as never);

		const result = await buildStage(context);

		expect(result.status).toBe("succeeded");

		const call = mockGenerateObject.mock.calls[0]?.[0];
		expect(call?.prompt).toContain(
			"Design reference (approved screens/frames):",
		);
		expect(call?.prompt).toContain(
			'Frame "Main Menu": 3 elements (2 rect, 1 text).',
		);
		expect(call?.prompt).toContain(
			'Frame "Game Over": 2 elements (1 rect, 1 image).',
		);

		const put = context.env.ASSETS.put as unknown as ReturnType<typeof vi.fn>;
		expect(put).toHaveBeenCalledTimes(1);
		const persisted = JSON.parse(String(put.mock.calls[0]?.[1]));
		expect(persisted).not.toHaveProperty("frames");
		expect(persisted).not.toHaveProperty("metadata.createdAt");
	});

	it("builds normally without design artifact", async () => {
		const context = createContext();
		const mockGenerateObject = vi.mocked(generateObject);
		mockGenerateObject.mockResolvedValue({
			object: makeGeneratedGame(),
			usage: {
				inputTokens: 31,
				outputTokens: 78,
			},
		} as never);

		const result = await buildStage(context);

		expect(result.status).toBe("succeeded");
		const call = mockGenerateObject.mock.calls[0]?.[0];
		expect(call?.prompt).not.toContain(
			"Design reference (approved screens/frames):",
		);

		const get = context.env.ASSETS.get as unknown as ReturnType<typeof vi.fn>;
		expect(get).not.toHaveBeenCalled();
	});
});
