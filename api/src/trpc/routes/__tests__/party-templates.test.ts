import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createPublicCaller,
	initTestDatabase,
} from "@/__fixtures__/test-utils";

describe("partyTemplates router", () => {
	beforeAll(async () => {
		await initTestDatabase();
	});

	beforeEach(async () => {
		const env = (await import("cloudflare:test")).env as any;
		await env.DB.prepare("DELETE FROM party_game_templates").run();

		await env.DB.prepare(
			`INSERT INTO party_game_templates
				(id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, is_active, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				"quiplash",
				"slopcade",
				"Quiplash",
				"🍞",
				"Answer funny prompts",
				"Vote-based",
				"quip",
				3,
				8,
				1,
				1,
			)
			.run();

		await env.DB.prepare(
			`INSERT INTO party_game_templates
				(id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, is_active, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				"truth-trap",
				"slopcade",
				"Truth Trap",
				"📖",
				"Spot the real answer",
				"Bluffing",
				"fibbage",
				3,
				8,
				1,
				2,
			)
			.run();

		await env.DB.prepare(
			`INSERT INTO party_game_templates
				(id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, is_active, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				"heads-up",
				"amen",
				"Who Am I?",
				"👤",
				"Guess what's on your head",
				"Charades",
				"headsup",
				2,
				12,
				1,
				3,
			)
			.run();
	});

	describe("listByBrand", () => {
		it("returns only templates for the given brand", async () => {
			const caller = createPublicCaller();
			const templates = await caller.partyTemplates.listByBrand({
				brandId: "slopcade",
			});
			expect(templates.length).toBe(2);
			for (const t of templates) {
				expect(t.brandId).toBe("slopcade");
				expect(t.id).toBeTruthy();
				expect(t.title).toBeTruthy();
				expect(t.minPlayers).toBeGreaterThan(0);
				expect(t.maxPlayers).toBeGreaterThanOrEqual(t.minPlayers);
			}
		});

		it("returns templates ordered by sort_order", async () => {
			const caller = createPublicCaller();
			const templates = await caller.partyTemplates.listByBrand({
				brandId: "slopcade",
			});
			expect(templates[0]!.id).toBe("quiplash");
			expect(templates[1]!.id).toBe("truth-trap");
		});

		it("excludes inactive templates", async () => {
			const env = (await import("cloudflare:test")).env as any;
			await env.DB.prepare(
				"UPDATE party_game_templates SET is_active = 0 WHERE id = 'quiplash'",
			).run();

			const caller = createPublicCaller();
			const templates = await caller.partyTemplates.listByBrand({
				brandId: "slopcade",
			});
			expect(templates.length).toBe(1);
			expect(templates[0]!.id).toBe("truth-trap");
		});

		it("returns empty array for unknown brand", async () => {
			const caller = createPublicCaller();
			const templates = await caller.partyTemplates.listByBrand({
				brandId: "nonexistent",
			});
			expect(templates).toEqual([]);
		});
	});

	describe("getById", () => {
		it("returns template by id", async () => {
			const caller = createPublicCaller();
			const template = await caller.partyTemplates.getById({ id: "quiplash" });
			expect(template.id).toBe("quiplash");
			expect(template.title).toBe("Quiplash");
			expect(template.emoji).toBe("🍞");
			expect(template.minPlayers).toBe(3);
			expect(template.maxPlayers).toBe(8);
		});

		it("maps snake_case columns to camelCase fields", async () => {
			const caller = createPublicCaller();
			const template = await caller.partyTemplates.getById({ id: "quiplash" });
			expect(template.brandId).toBe("slopcade");
			expect(template.contentPack).toBe("quip");
			expect(template.sortOrder).toBe(1);
		});

		it("throws NOT_FOUND for unknown id", async () => {
			const caller = createPublicCaller();
			await expect(
				caller.partyTemplates.getById({ id: "nonexistent-game" }),
			).rejects.toThrow(/not found/i);
		});

		it("throws NOT_FOUND for inactive template", async () => {
			const env = (await import("cloudflare:test")).env as any;
			await env.DB.prepare(
				"UPDATE party_game_templates SET is_active = 0 WHERE id = 'quiplash'",
			).run();

			const caller = createPublicCaller();
			await expect(
				caller.partyTemplates.getById({ id: "quiplash" }),
			).rejects.toThrow(/not found/i);
		});
	});
});
