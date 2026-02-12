import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../../../context";
import { appRouter } from "../../../router";

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL DEFAULT 'Untitled',
  base_game_id TEXT,
  forked_from_id TEXT,
  r2_prefix TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_modifier TEXT NOT NULL,
  thumbnail_url TEXT,
  creator_user_id TEXT REFERENCES users(id),
  is_public INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS remixes (
  id TEXT PRIMARY KEY,
  base_game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,
  description TEXT,
  creator_user_id TEXT REFERENCES users(id),
  variable_overrides_json TEXT,
  asset_overrides_json TEXT,
  shader_param_overrides_json TEXT,
  sound_overrides_json TEXT,
  theme_id TEXT REFERENCES themes(id),
  theme_prompt TEXT,
  style TEXT,
  is_complete INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  UNIQUE(base_game_id, name)
);

CREATE INDEX IF NOT EXISTS idx_remixes_base_game ON remixes(base_game_id) WHERE deleted_at IS NULL;
`;

const TEST_USER_ID = "test-user-id";
const OTHER_USER_ID = "other-user-id";
const BASE_GAME_ID = "base-game-id";
const FORKED_GAME_ID = "forked-game-id";

describe("Remixes Router", () => {
	let ctx: Context;
	let otherUserCtx: Context;

	beforeAll(async () => {
		const statements = schema
			.split(";")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		for (const statement of statements) {
			await env.DB.prepare(statement).run();
		}

		const now = Date.now();

		await env.DB.prepare(
			`INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)`,
		)
			.bind(TEST_USER_ID, "test@example.com", "Test User", now)
			.run();

		await env.DB.prepare(
			`INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)`,
		)
			.bind(OTHER_USER_ID, "other@example.com", "Other User", now)
			.run();

		await env.DB.prepare(
			`INSERT INTO games (id, user_id, title, r2_prefix, definition, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				BASE_GAME_ID,
				TEST_USER_ID,
				"Base Game",
				"games/base-game-id",
				"{}",
				now,
			)
			.run();

		await env.DB.prepare(
			`INSERT INTO games (id, user_id, title, base_game_id, forked_from_id, r2_prefix, definition, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				FORKED_GAME_ID,
				OTHER_USER_ID,
				"Forked Game",
				BASE_GAME_ID,
				BASE_GAME_ID,
				"games/forked-game-id",
				"{}",
				now,
			)
			.run();
	});

	beforeEach(() => {
		ctx = {
			env: env,
			authToken: "mock-token",
			user: {
				id: TEST_USER_ID,
				email: "test@example.com",
			},
		} as any;

		otherUserCtx = {
			env: env,
			authToken: "mock-token-other",
			user: {
				id: OTHER_USER_ID,
				email: "other@example.com",
			},
		} as any;
	});

	describe("createRemix", () => {
		it("should create a remix with variable overrides", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Speed Run Remix",
				description: "Faster gameplay",
				overrides: {
					variables: { speed: 10, gravity: 20 },
				},
			});

			expect(result.id).toBeDefined();
			expect(result.baseGameId).toBe(BASE_GAME_ID);
			expect(result.createdAt).toBeDefined();
		});

		it("should create a remix with asset overrides", async () => {
			const caller = appRouter.createCaller(ctx);

			const result = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Themed Remix",
				overrides: {
					assets: {
						player: {
							assetId: "asset-001",
							assetUrl: "games/base-game-id/player.png",
						},
					},
				},
			});

			expect(result.id).toBeDefined();
		});

		it("should resolve base_game_id from forked game", async () => {
			const caller = appRouter.createCaller(otherUserCtx);

			const result = await caller.assetSystem.remixes.createRemix({
				gameId: FORKED_GAME_ID,
				name: "Fork Remix",
				overrides: {},
			});

			expect(result.baseGameId).toBe(BASE_GAME_ID);
		});

		it("should reject duplicate remix name for same base game", async () => {
			const caller = appRouter.createCaller(ctx);

			await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Unique Name Test",
				overrides: {},
			});

			await expect(
				caller.assetSystem.remixes.createRemix({
					gameId: BASE_GAME_ID,
					name: "Unique Name Test",
					overrides: {},
				}),
			).rejects.toThrow(/already exists/);
		});

		it("should reject if game not found", async () => {
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.assetSystem.remixes.createRemix({
					gameId: "nonexistent",
					name: "Ghost Remix",
					overrides: {},
				}),
			).rejects.toThrow(/not found/i);
		});
	});

	describe("getRemix", () => {
		it("should get a remix by id", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Get Test Remix",
				description: "For get test",
				overrides: {
					variables: { speed: 5 },
				},
			});

			const remix = await caller.assetSystem.remixes.getRemix({
				id: created.id,
			});

			expect(remix.id).toBe(created.id);
			expect(remix.name).toBe("Get Test Remix");
			expect(remix.description).toBe("For get test");
			expect(remix.baseGameId).toBe(BASE_GAME_ID);
			expect(remix.overrides.variables).toEqual({ speed: 5 });
			expect(remix.isComplete).toBe(false);
		});

		it("should return NOT_FOUND for nonexistent remix", async () => {
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.assetSystem.remixes.getRemix({ id: "nonexistent" }),
			).rejects.toThrow(/not found/i);
		});
	});

	describe("listRemixes", () => {
		it("should list remixes scoped to base game lineage", async () => {
			const caller = appRouter.createCaller(ctx);

			await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "List Test Remix A",
				overrides: {},
			});

			await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "List Test Remix B",
				overrides: {},
			});

			const fromBase = await caller.assetSystem.remixes.listRemixes({
				gameId: BASE_GAME_ID,
			});
			const fromFork = await caller.assetSystem.remixes.listRemixes({
				gameId: FORKED_GAME_ID,
			});

			const baseNames = fromBase.map((r) => r.name);
			expect(baseNames).toContain("List Test Remix A");
			expect(baseNames).toContain("List Test Remix B");

			const forkNames = fromFork.map((r) => r.name);
			expect(forkNames).toContain("List Test Remix A");
			expect(forkNames).toContain("List Test Remix B");
		});

		it("should not list deleted remixes", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Delete List Test",
				overrides: {},
			});

			await caller.assetSystem.remixes.deleteRemix({ id: created.id });

			const list = await caller.assetSystem.remixes.listRemixes({
				gameId: BASE_GAME_ID,
			});
			const names = list.map((r) => r.name);
			expect(names).not.toContain("Delete List Test");
		});
	});

	describe("updateRemix", () => {
		it("should update remix name and description", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Update Test Remix",
				overrides: {},
			});

			await caller.assetSystem.remixes.updateRemix({
				id: created.id,
				name: "Updated Name",
				description: "New desc",
			});

			const updated = await caller.assetSystem.remixes.getRemix({
				id: created.id,
			});
			expect(updated.name).toBe("Updated Name");
			expect(updated.description).toBe("New desc");
			expect(updated.updatedAt).toBeDefined();
		});

		it("should update remix overrides", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Override Update Test",
				overrides: { variables: { speed: 1 } },
			});

			await caller.assetSystem.remixes.updateRemix({
				id: created.id,
				overrides: { variables: { speed: 99, gravity: 5 } },
			});

			const updated = await caller.assetSystem.remixes.getRemix({
				id: created.id,
			});
			expect(updated.overrides.variables).toEqual({ speed: 99, gravity: 5 });
		});

		it("should deny update to non-owner", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Owner Only Update",
				overrides: {},
			});

			const otherCaller = appRouter.createCaller(otherUserCtx);

			await expect(
				otherCaller.assetSystem.remixes.updateRemix({
					id: created.id,
					name: "Hacked",
				}),
			).rejects.toThrow(/access denied/i);
		});

		it("should reject update with no fields", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "No Fields Update",
				overrides: {},
			});

			await expect(
				caller.assetSystem.remixes.updateRemix({ id: created.id }),
			).rejects.toThrow(/no fields/i);
		});
	});

	describe("deleteRemix", () => {
		it("should soft delete a remix", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Delete Me Remix",
				overrides: {},
			});

			const result = await caller.assetSystem.remixes.deleteRemix({
				id: created.id,
			});
			expect(result.success).toBe(true);

			await expect(
				caller.assetSystem.remixes.getRemix({ id: created.id }),
			).rejects.toThrow(/not found/i);
		});

		it("should deny delete to non-owner", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Owner Only Delete",
				overrides: {},
			});

			const otherCaller = appRouter.createCaller(otherUserCtx);

			await expect(
				otherCaller.assetSystem.remixes.deleteRemix({ id: created.id }),
			).rejects.toThrow(/access denied/i);
		});
	});

	describe("getResolvedRemix", () => {
		it("should return resolved remix with asset URLs", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "Resolved Remix",
				overrides: {
					variables: { speed: 42 },
					assets: {
						player: {
							assetId: "asset-resolved-1",
							assetUrl: "games/base-game-id/player.png",
							placement: { scale: 2, offsetX: 10 },
						},
					},
				},
			});

			const resolved = await caller.assetSystem.remixes.getResolvedRemix({
				gameId: BASE_GAME_ID,
				remixId: created.id,
			});

			expect(resolved.remix.id).toBe(created.id);
			expect(resolved.remix.name).toBe("Resolved Remix");
			expect(resolved.remix.baseGameId).toBe(BASE_GAME_ID);
			expect(resolved.overrides.variables).toEqual({ speed: 42 });
			expect(resolved.entriesByPrefabId.player).toBeDefined();
			expect(resolved.entriesByPrefabId.player.imageUrl).toContain(
				"player.png",
			);
			expect(resolved.entriesByPrefabId.player.placement).toEqual({
				scale: 2,
				offsetX: 10,
			});
		});

		it("should return empty entriesByPrefabId for remix without asset overrides", async () => {
			const caller = appRouter.createCaller(ctx);

			const created = await caller.assetSystem.remixes.createRemix({
				gameId: BASE_GAME_ID,
				name: "No Assets Remix",
				overrides: {
					variables: { gravity: 5 },
				},
			});

			const resolved = await caller.assetSystem.remixes.getResolvedRemix({
				gameId: BASE_GAME_ID,
				remixId: created.id,
			});

			expect(resolved.entriesByPrefabId).toEqual({});
			expect(resolved.overrides.variables).toEqual({ gravity: 5 });
		});

		it("should return NOT_FOUND for nonexistent remix", async () => {
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.assetSystem.remixes.getResolvedRemix({
					gameId: BASE_GAME_ID,
					remixId: "nonexistent",
				}),
			).rejects.toThrow(/not found/i);
		});
	});
});
