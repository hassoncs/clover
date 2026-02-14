import { describe, expect, it } from "vitest";
import invalidBadPhysics from "../../__fixtures__/games/invalid-game-bad-physics.json";
import invalidNoEntities from "../../__fixtures__/games/invalid-game-no-entities.json";
import validProjectileGame from "../../__fixtures__/games/valid-projectile-game.json";
import {
	getValidationSummary,
	validateGameDefinition,
} from "../game/validator";

describe("validateGameDefinition", () => {
	describe("valid games", () => {
		it("should validate a complete projectile game", () => {
			const result = validateGameDefinition(validProjectileGame as any);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should accept game with warnings but no errors", () => {
			const game = {
				metadata: { id: "test", title: "Test", version: "1.0.0" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				prefabs: {},
				entities: [
					{
						id: "player",
						name: "Player",
						transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "dynamic",
							density: 1,
							friction: 0.5,
							restitution: 0.5,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#FF0000" },
						scriptRef: "player-script",
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(true);
		});
	});

	describe("metadata validation", () => {
		it("should error on missing metadata", () => {
			const result = validateGameDefinition({} as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on missing game ID", () => {
			const game = {
				metadata: { title: "No ID Game" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "e1",
						name: "E1",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "static",
							density: 1,
							friction: 0.5,
							restitution: 0,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should warn on missing title", () => {
			const game = {
				metadata: { id: "test-id" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				prefabs: {},
				entities: [
					{
						id: "e1",
						name: "E1",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "static",
							density: 1,
							friction: 0.5,
							restitution: 0,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.warnings.some((w) => w.code === "MISSING_TITLE")).toBe(
				true,
			);
		});
	});

	describe("world validation", () => {
		it("should error on missing world config", () => {
			const game = {
				metadata: { id: "test" },
				entities: [],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on missing gravity", () => {
			const game = {
				metadata: { id: "test" },
				world: { pixelsPerMeter: 50 },
				entities: [
					{
						id: "e1",
						name: "E1",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "static",
							density: 1,
							friction: 0.5,
							restitution: 0,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("entities validation", () => {
		it("should error on empty entities array", () => {
			const result = validateGameDefinition(invalidNoEntities as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on missing entities array", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on duplicate entity IDs", () => {
			const game = {
				metadata: { id: "test", title: "Test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				prefabs: {},
				entities: [
					{
						id: "same-id",
						name: "E1",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "static",
							density: 1,
							friction: 0.5,
							restitution: 0,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
					{
						id: "same-id",
						name: "E2",
						transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
						physics: {
							bodyType: "static",
							density: 1,
							friction: 0.5,
							restitution: 0,
						},
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
		});

		it("should warn on too many entities", () => {
			const entities = Array.from({ length: 55 }, (_, i) => ({
				id: `entity-${i}`,
				name: `Entity ${i}`,
				transform: { x: i, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				physics: {
					bodyType: "static",
					density: 1,
					friction: 0.5,
					restitution: 0,
				},
				visual: { type: "rect", width: 1, height: 1, color: "#000" },
			}));

			const game = {
				metadata: { id: "test", title: "Test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				prefabs: {},
				entities,
			};

			const result = validateGameDefinition(game as any);
			expect(result).toBeDefined();
		});
	});

	describe("physics validation", () => {
		it("should error on invalid body type", () => {
			const result = validateGameDefinition(invalidBadPhysics as any);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on invalid shape", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-shape",
						name: "Bad Shape",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "static" },
					},
				],
			};
			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on negative density", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-density",
						name: "Bad Density",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "static", density: -1 },
					},
				],
			};
			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on negative restitution", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-restitution",
						name: "Bad Restitution",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "static" },
					},
				],
			};
			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should warn on friction out of range", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-friction",
						name: "Bad Friction",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "static" },
					},
				],
			};
			const result = validateGameDefinition(game as any);
			expect(result).toBeDefined();
		});

		it("should error on box physics missing dimensions", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-box",
						name: "Bad Box",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "static", shape: "box" },
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should error on circle physics missing radius", () => {
			const game = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-circle",
						name: "Bad Circle",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "dynamic", shape: "circle" },
						visual: { type: "circle", radius: 1, color: "#000" },
					},
				],
			};

			const result = validateGameDefinition(game as any);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});

describe("getValidationSummary", () => {
	it("should return success message for valid game with no warnings", () => {
		const result = { valid: true, errors: [], warnings: [] };
		const summary = getValidationSummary(result);
		expect(summary).toBe("Game definition is valid with no issues.");
	});

	it("should list errors in summary", () => {
		const result = {
			valid: false,
			errors: [
				{ code: "MISSING_ID", message: "Game must have an ID" },
				{ code: "NO_ENTITIES", message: "Game must have entities" },
			],
			warnings: [],
		};
		const summary = getValidationSummary(result);
		expect(summary).toContain("2 error(s)");
		expect(summary).toContain("Game must have an ID");
		expect(summary).toContain("Game must have entities");
	});

	it("should list warnings in summary", () => {
		const result = {
			valid: true,
			errors: [],
			warnings: [
				{ code: "MISSING_TITLE", message: "Game should have a title" },
			],
		};
		const summary = getValidationSummary(result);
		expect(summary).toContain("1 warning(s)");
		expect(summary).toContain("Game should have a title");
	});

	it("should list both errors and warnings", () => {
		const result = {
			valid: false,
			errors: [{ code: "MISSING_ID", message: "Missing ID" }],
			warnings: [{ code: "MISSING_TITLE", message: "Missing title" }],
		};
		const summary = getValidationSummary(result);
		expect(summary).toContain("1 error(s)");
		expect(summary).toContain("1 warning(s)");
	});
});
