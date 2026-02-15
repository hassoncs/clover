/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import validProjectileGame from "../../__fixtures__/games/valid-projectile-game.json";
import {
	createAuthenticatedContext,
	createPublicContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
	TEST_USER_2,
} from "../../__fixtures__/test-utils";
import type { Context } from "../context";
import { appRouter } from "../router";

describe("Health Endpoint", () => {
	it("should return health status", async () => {
		const ctx = {
			env: env,
			authToken: null,
		} as any;
		const caller = appRouter.createCaller(ctx);

		const result = await caller.health();

		expect(result.status).toBe("ok");
		expect(result.timestamp).toBeDefined();
		expect(typeof result.timestamp).toBe("number");
	});
});

describe("Games Router", () => {
	let ctx: Context;

	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser();
	});

	beforeEach(() => {
		ctx = {
			env: env,
			authToken: "mock-token",
			user: {
				id: "test-user-id",
				email: "test@example.com",
			},
		} as any;
	});

	it("should list games for user", async () => {
		const caller = appRouter.createCaller(ctx);

		const newGame = await caller.games.create({
			title: "Test Game",
			definition: JSON.stringify({ entities: [] }),
			isPublic: false,
		});

		const games = await caller.games.list();
		expect(games).toHaveLength(1);
		expect(games[0].id).toBe(newGame.id);
		expect(games[0].title).toBe("Test Game");
	});

	it("should get a single game", async () => {
		const caller = appRouter.createCaller(ctx);

		const newGame = await caller.games.create({
			title: "Single Game",
			definition: "{}",
		});

		const game = await caller.games.get({ id: newGame.id });
		expect(game).toBeDefined();
		expect(game.id).toBe(newGame.id);
	});

	it("should update a game", async () => {
		const caller = appRouter.createCaller(ctx);

		const newGame = await caller.games.create({
			title: "Original Title",
			definition: "{}",
		});

		await caller.games.update({
			id: newGame.id,
			title: "Updated Title",
		});

		const updatedGame = await caller.games.get({ id: newGame.id });
		expect(updatedGame.title).toBe("Updated Title");
	});

	it("should soft delete a game", async () => {
		const caller = appRouter.createCaller(ctx);

		const newGame = await caller.games.create({
			title: "To Delete",
			definition: "{}",
		});

		await caller.games.delete({ id: newGame.id });

		const games = await caller.games.list();
		expect(games.find((g) => g.id === newGame.id)).toBeUndefined();

		await expect(caller.games.get({ id: newGame.id })).rejects.toThrow(
			"Game not found",
		);
	});

	describe("analyze route", () => {
		it("should analyze a projectile game prompt", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.analyze({
				prompt: "A game where I launch balls at stacked blocks",
			});

			expect(result.intent).toBeDefined();
			expect(result.intent.gameType).toBe("projectile");
			expect(result.confidence).toBeGreaterThan(0);
		});

		it("should analyze a platformer prompt", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.analyze({
				prompt: "A game where a cat jumps between platforms",
			});

			expect(result.intent.gameType).toBe("platformer");
		});

		it("should detect theme from prompt", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.analyze({
				prompt: "A space game with rockets and aliens",
			});

			expect(result.intent.theme).toBe("space");
		});
	});

	describe("validateDefinition route", () => {
		it("should validate a correct game definition", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify(validProjectileGame),
			});

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should return errors for invalid JSON", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.validateDefinition({
				gameDefinition: "not valid json {{{",
			});

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "INVALID_JSON")).toBe(true);
		});

		it("should return errors for game with no entities", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify({
					metadata: { id: "test" },
					world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
					entities: [],
				}),
			});

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "NO_ENTITIES")).toBe(true);
		});

		it("should warn for game missing win mechanism", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify({
					metadata: { id: "test", title: "Test" },
					world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
					entities: [
						{
							id: "player",
							name: "Player",
							transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
							physics: {
								bodyType: "dynamic",
								density: 1,
								friction: 0.5,
								restitution: 0.5,
							},
							collider: { shape: "box", width: 1, height: 1 },
							visual: { type: "rect", width: 1, height: 1, color: "#FF0000" },
						},
					],
					rules: [{ id: "r1", trigger: { type: "tap" }, actions: [] }],
					loseCondition: { type: "time_up", time: 60 },
				}),
			});

			expect(result.warnings.some((w) => w.code === "NO_WIN_MECHANISM")).toBe(
				true,
			);
		});

		it("should include summary in response", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify(validProjectileGame),
			});

			expect(result.summary).toBeDefined();
			expect(typeof result.summary).toBe("string");
		});
	});

	describe("incrementPlayCount route", () => {
		it("should increment play count for a game", async () => {
			const caller = appRouter.createCaller(ctx);

			const game = await caller.games.create({
				title: "Play Count Game",
				definition: "{}",
				isPublic: true,
			});

			const initialGame = await caller.games.get({ id: game.id });
			expect(initialGame.playCount).toBe(0);

			await caller.games.incrementPlayCount({ id: game.id });
			await caller.games.incrementPlayCount({ id: game.id });
			await caller.games.incrementPlayCount({ id: game.id });

			const updatedGame = await caller.games.get({ id: game.id });
			expect(updatedGame.playCount).toBe(3);
		});
	});

	describe("listPublic route", () => {
		it("should list only public games", async () => {
			const caller = appRouter.createCaller(ctx);

			const publicGame = await caller.games.create({
				title: "Public Game " + Date.now(),
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			await caller.games.create({
				title: "Private Game " + Date.now(),
				definition: JSON.stringify(validProjectileGame),
				isPublic: false,
			});

			const publicGames = await caller.games.listPublic();
			expect(publicGames.some((g) => g.id === publicGame.id)).toBe(true);
			expect(publicGames.every((g) => g.isPublic === true)).toBe(true);
		});

		it("should support pagination", async () => {
			const caller = appRouter.createCaller(ctx);

			const games = await caller.games.listPublic({ limit: 5, offset: 0 });
			expect(games.length).toBeLessThanOrEqual(5);
		});

		it("should order by play count descending", async () => {
			const caller = appRouter.createCaller(ctx);

			const game1 = await caller.games.create({
				title: "Low Play Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			const game2 = await caller.games.create({
				title: "High Play Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			await caller.games.incrementPlayCount({ id: game2.id });
			await caller.games.incrementPlayCount({ id: game2.id });
			await caller.games.incrementPlayCount({ id: game2.id });

			const publicGames = await caller.games.listPublic();
			const game1Index = publicGames.findIndex((g) => g.id === game1.id);
			const game2Index = publicGames.findIndex((g) => g.id === game2.id);

			if (game1Index !== -1 && game2Index !== -1) {
				expect(game2Index).toBeLessThan(game1Index);
			}
		});
	});

	describe("fork route", () => {
		it("should fork a public game into a new game owned by the forking user", async () => {
			const ownerCtx = createAuthenticatedContext(TEST_USER);
			const ownerCaller = appRouter.createCaller(ownerCtx);

			const original = await ownerCaller.games.create({
				title: "Original Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			await createTestUser(TEST_USER_2);
			const forkerCtx = createAuthenticatedContext(TEST_USER_2);
			const forkerCaller = appRouter.createCaller(forkerCtx);

			const forked = await forkerCaller.games.fork({ id: original.id });

			expect(forked.id).not.toBe(original.id);
			expect(forked.title).toBe("Original Game (Fork)");
			expect(forked.userId).toBe(TEST_USER_2.id);
			expect(forked.forkedFromId).toBe(original.id);
			expect(forked.isPublic).toBe(false);
		});

		it("should produce a fork whose definition is independently loadable", async () => {
			const ownerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const original = await ownerCaller.games.create({
				title: "Forkable Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			await createTestUser(TEST_USER_2);
			const forkerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER_2),
			);

			const forked = await forkerCaller.games.fork({ id: original.id });

			const loadedFork = await forkerCaller.games.get({ id: forked.id });
			expect(loadedFork.id).toBe(forked.id);
			expect(loadedFork.title).toBe("Forkable Game (Fork)");
			expect(loadedFork.definition).toBeDefined();
			const def = JSON.parse(loadedFork.definition);
			expect(def.metadata.title).toBe("Forkable Game (Fork)");
		});

		it("should reject forking a private game by a non-owner", async () => {
			const ownerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const privateGame = await ownerCaller.games.create({
				title: "Private Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: false,
			});

			await createTestUser(TEST_USER_2);
			const forkerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER_2),
			);

			await expect(
				forkerCaller.games.fork({ id: privateGame.id }),
			).rejects.toThrow("Cannot fork private game");
		});
	});

	describe("getPublic route (edit flow)", () => {
		it("should return full definition for a public game without requiring auth", async () => {
			const ownerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const game = await ownerCaller.games.create({
				title: "Public Edit Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: true,
			});

			const publicCaller = appRouter.createCaller(createPublicContext());

			const loaded = await publicCaller.games.getPublic({ id: game.id });
			expect(loaded.id).toBe(game.id);
			expect(loaded.title).toBe("Public Edit Game");
			expect(loaded.definition).toBeDefined();
			const def = JSON.parse(loaded.definition);
			expect(def.metadata.title).toBe("Ball Launcher");
		});

		it("should reject getPublic for a private game", async () => {
			const ownerCaller = appRouter.createCaller(
				createAuthenticatedContext(TEST_USER),
			);

			const game = await ownerCaller.games.create({
				title: "Private Edit Game",
				definition: JSON.stringify(validProjectileGame),
				isPublic: false,
			});

			const publicCaller = appRouter.createCaller(createPublicContext());

			await expect(
				publicCaller.games.getPublic({ id: game.id }),
			).rejects.toThrow();
		});
	});
});
