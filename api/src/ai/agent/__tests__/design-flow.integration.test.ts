import {
	createEmptyDesignDocument,
	type DesignDocument,
	DesignDocumentSchema,
	parseDesignDocument,
} from "@slopcade/shared/types/design";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChatTools } from "../../../chat/chat-tools";
import type { GitService } from "../../../services/git/GitService";
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

type ExecutableTool<TInput, TOutput> = {
	execute: (input: TInput) => Promise<TOutput>;
};

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

function makeRichV11DesignDocument(): DesignDocument {
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
					type: "circle",
					id: "orb",
					x: 140,
					y: 160,
					width: 180,
					height: 180,
					zIndex: 1,
					fill: "#5bc0ff",
				},
				{
					type: "line",
					id: "divider",
					x1: 100,
					y1: 420,
					x2: 980,
					y2: 420,
					zIndex: 2,
					stroke: "#ffffff",
					strokeWidth: 3,
				},
				{
					type: "path",
					id: "trail",
					x: 240,
					y: 680,
					data: "M0 0 C 80 40, 140 180, 260 220",
					zIndex: 3,
					stroke: "#8bff95",
					strokeWidth: 5,
				},
				{
					type: "group",
					id: "cta-group",
					x: 260,
					y: 1300,
					width: 560,
					height: 220,
					zIndex: 4,
					childIds: ["orb", "trail"],
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

function createGitServiceMock() {
	return {
		listFiles: vi.fn<GitService["listFiles"]>(),
		readFile: vi.fn<GitService["readFile"]>(),
		commitFiles: vi.fn<GitService["commitFiles"]>(),
		log: vi.fn<GitService["log"]>(),
	} as unknown as GitService;
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

	describe("v1.1 rich element types flow through design→build", () => {
		it("validates v1.1 circle/line/path/group docs and passes summarized intent to build", async () => {
			const { env, storage } = createMockEnv();
			const richDesignDoc = makeRichV11DesignDocument();
			expect(DesignDocumentSchema.safeParse(richDesignDoc).success).toBe(true);

			const designArtifactKey =
				"agent-runs/run-design-flow/steps/1/design/output.json";
			storage.set(designArtifactKey, JSON.stringify(richDesignDoc));

			const mockGenerateObject = vi.mocked(generateObject);
			mockGenerateObject.mockResolvedValue({
				object: makeValidGameDefinition(),
				usage: { inputTokens: 44, outputTokens: 88 },
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
			const prompt =
				typeof buildCall?.prompt === "string"
					? buildCall.prompt
					: JSON.stringify(buildCall?.prompt ?? []);
			expect(prompt).toContain("Design reference (approved screens/frames):");

			const summary = prompt
				.split("Design reference (approved screens/frames):\n")[1]
				?.split(
					"\nUse this for layout and presentation inspiration only. Do not include design document fields in the runtime output.",
				)[0]
				?.trim();
			expect(summary).toBeTruthy();
			expect(summary?.length ?? 0).toBeGreaterThan(0);
			expect(summary?.toLowerCase()).toMatch(/circle|line|path/);
		});
	});

	describe("design validation failure path", () => {
		it("design validation failure does not contaminate build prompt with design reference", async () => {
			const { env } = createMockEnv();
			const mockGenerateObject = vi.mocked(generateObject);
			mockGenerateObject
				.mockResolvedValueOnce({
					object: createEmptyDesignDocument(
						"game-design-flow",
						"Design Flow Runner",
					),
					usage: { inputTokens: 10, outputTokens: 20 },
				} as never)
				.mockResolvedValueOnce({
					object: createEmptyDesignDocument(
						"game-design-flow",
						"Design Flow Runner",
					),
					usage: { inputTokens: 11, outputTokens: 22 },
				} as never)
				.mockResolvedValueOnce({
					object: makeValidGameDefinition(),
					usage: { inputTokens: 30, outputTokens: 40 },
				} as never);

			const designResult = await designStage(
				createContext({ env, stage: "design", stepIndex: 1 }),
			);
			expect(designResult.status).toBe("failed");

			const buildResult = await buildStage(
				createContext({
					env,
					stage: "build",
					stepIndex: 2,
					previousArtifacts: {
						planning: "agent-runs/run-design-flow/steps/0/planning/output.json",
						design: "agent-runs/run-design-flow/steps/1/design/output.json",
					},
				}),
			);

			expect(buildResult.status).toBe("succeeded");
			const buildCall = mockGenerateObject.mock.calls[2]?.[0];
			expect(buildCall?.prompt).not.toContain(
				"Design reference (approved screens/frames):",
			);
		});

		it("parseDesignDocument fails with a descriptive schema error for invalid element type", () => {
			const richDesignDoc = makeRichV11DesignDocument();
			const invalidDoc = {
				...richDesignDoc,
				frames: richDesignDoc.frames.map((frame, index) => {
					if (index !== 0) {
						return frame;
					}
					return {
						...frame,
						elements: [
							{
								...frame.elements[0],
								type: "triangle",
							},
							...frame.elements.slice(1),
						],
					};
				}),
			};

			expect(() => parseDesignDocument(invalidDoc)).toThrowError(
				/Invalid design document schema/,
			);
		});

		it("addDesignElement returns structured error instead of throwing on invalid payload", async () => {
			const gitService = createGitServiceMock();
			const doc = createEmptyDesignDocument("game-design-flow", "Design");
			doc.frames.push({
				id: "frame-1",
				title: "Frame 1",
				width: 375,
				height: 812,
				position: { x: 0, y: 0 },
				elements: [],
			});
			vi.mocked(gitService.readFile).mockResolvedValue(
				new TextEncoder().encode(JSON.stringify(doc)),
			);

			const tools = createChatTools({ gameId: "game-design-flow", gitService });
			const addTool = tools.addDesignElement as unknown as ExecutableTool<
				{
					frameId: string;
					element: Record<string, unknown>;
					expectedVersion?: number;
				},
				{ ok: boolean; error?: string; field?: string }
			>;

			let thrown: unknown = null;
			let result: { ok: boolean; error?: string; field?: string } | undefined;
			try {
				result = await addTool.execute({
					frameId: "frame-1",
					element: {
						type: "triangle",
						x: 10,
						y: 10,
						width: 40,
						height: 40,
					},
				});
			} catch (error) {
				thrown = error;
			}

			expect(thrown).toBeNull();
			expect(result).toBeDefined();
			expect(result?.ok).toBe(false);
			expect(typeof result?.error).toBe("string");
			expect(gitService.commitFiles).not.toHaveBeenCalled();
		});
	});

	describe("conflict-safe write semantics", () => {
		it("updateDesignElement rejects stale expectedVersion and succeeds with currentVersion", async () => {
			const gitService = createGitServiceMock();
			const doc = createEmptyDesignDocument("game-design-flow", "Design");
			doc.metadata.updatedAt = 300;
			doc.frames.push({
				id: "frame-1",
				title: "Frame 1",
				width: 375,
				height: 812,
				position: { x: 0, y: 0 },
				elements: [
					{
						id: "rect-1",
						type: "rect",
						x: 10,
						y: 10,
						width: 100,
						height: 50,
						zIndex: 0,
						fill: "#111111",
					},
				],
			});
			vi.mocked(gitService.readFile).mockResolvedValue(
				new TextEncoder().encode(JSON.stringify(doc)),
			);
			vi.mocked(gitService.commitFiles).mockResolvedValue("sha-retry");

			const tools = createChatTools({ gameId: "game-design-flow", gitService });
			const updateTool = tools.updateDesignElement as unknown as ExecutableTool<
				{
					frameId: string;
					elementId: string;
					expectedVersion?: number;
					updates: {
						fill?: string;
					};
				},
				{
					ok: boolean;
					error?: string;
					currentVersion?: number;
					expectedVersion?: number;
					version?: number;
				}
			>;

			const staleResult = await updateTool.execute({
				frameId: "frame-1",
				elementId: "rect-1",
				expectedVersion: 299,
				updates: { fill: "#22aa22" },
			});

			expect(staleResult).toEqual({
				ok: false,
				error: "Stale document version",
				currentVersion: 300,
				expectedVersion: 299,
			});
			expect(gitService.commitFiles).not.toHaveBeenCalled();

			const retryResult = await updateTool.execute({
				frameId: "frame-1",
				elementId: "rect-1",
				expectedVersion: staleResult.currentVersion,
				updates: { fill: "#22aa22" },
			});

			expect(retryResult.ok).toBe(true);
			expect(gitService.commitFiles).toHaveBeenCalledTimes(1);
		});
	});
});
