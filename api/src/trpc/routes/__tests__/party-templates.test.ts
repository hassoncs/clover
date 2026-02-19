import { describe, expect, it } from "vitest";
import { createPublicContext } from "@/__fixtures__/test-utils";
import { appRouter } from "../../router";

describe("partyTemplates router", () => {
	const caller = appRouter.createCaller(createPublicContext());

	describe("list", () => {
		it("returns all registered templates when no brand filter", async () => {
			const templates = await caller.partyTemplates.list();
			expect(templates.length).toBeGreaterThan(0);
			for (const t of templates) {
				expect(t.id).toBeTruthy();
				expect(t.title).toBeTruthy();
				expect(t.description).toBeTruthy();
				expect(t.minPlayers).toBeGreaterThan(0);
				expect(t.maxPlayers).toBeGreaterThanOrEqual(t.minPlayers);
			}
		});

		it("filters by brand", async () => {
			const slopcadeTemplates = await caller.partyTemplates.list({
				brand: "slopcade",
			});
			const amenTemplates = await caller.partyTemplates.list({ brand: "amen" });
			expect(slopcadeTemplates.length).toBeGreaterThan(0);
			expect(amenTemplates.length).toBeGreaterThan(0);
			for (const t of slopcadeTemplates) {
				expect(t.brands).toContain("slopcade");
			}
		});

		it("applies brand title overrides when brand is specified", async () => {
			const all = await caller.partyTemplates.list();
			const amen = await caller.partyTemplates.list({ brand: "amen" });
			const quiplashAll = all.find((t) => t.id === "quiplash");
			const quiplashAmen = amen.find((t) => t.id === "quiplash");
			expect(quiplashAll).toBeDefined();
			expect(quiplashAmen).toBeDefined();
			expect(quiplashAmen!.title).toBe("The Fellowship Table");
			expect(quiplashAll!.title).toBe("Quiplash");
		});

		it("includes known template ids", async () => {
			const templates = await caller.partyTemplates.list();
			const ids = templates.map((t) => t.id);
			expect(ids).toContain("quiplash");
			expect(ids).toContain("chroma-clues");
			expect(ids).toContain("headsUp");
		});
	});

	describe("getById", () => {
		it("returns template by id", async () => {
			const template = await caller.partyTemplates.getById({ id: "quiplash" });
			expect(template).not.toBeNull();
			expect(template!.id).toBe("quiplash");
			expect(template!.title).toBe("Quiplash");
		});

		it("applies brand override when brand is specified", async () => {
			const template = await caller.partyTemplates.getById({
				id: "quiplash",
				brand: "amen",
			});
			expect(template!.title).toBe("The Fellowship Table");
		});

		it("returns null for unknown template id", async () => {
			const template = await caller.partyTemplates.getById({
				id: "nonexistent-game",
			});
			expect(template).toBeNull();
		});
	});
});
