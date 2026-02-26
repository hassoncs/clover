import { describe, expect, it } from "vitest";
import { DEFINITION_BY_TEMPLATE_ID } from "../registry";

describe("Party Template Registry Baseline", () => {
	const templateIds = Object.keys(DEFINITION_BY_TEMPLATE_ID);

	it("should have exactly 20 templates registered", () => {
		expect(templateIds).toHaveLength(20);
	});

	const canonicalTemplateIds = [
		"about-you-bluff",
		"chain-reaction",
		"chroma-clues",
		"consensus-mine",
		"drawful-animate",
		"half-and-half",
		"heads-up",
		"lexicon-ladder",
		"quiplash",
		"percent-panic",
		"punchline-ferry",
		"quickfire-qa",
		"rival-roster",
		"role-replay",
		"ruin-and-redeem",
		"shirt-clash",
		"sketch-bluff",
		"spectrum-guess",
		"truth-trap",
		"year-jinx",
	];

	it("should contain only canonical template IDs", () => {
		for (const id of templateIds) {
			expect(canonicalTemplateIds).toContain(id);
		}
	});

	it("should not have any template with 'wager' or 'history' in contentPacks (except known baseline drift)", () => {
		for (const [id, definition] of Object.entries(DEFINITION_BY_TEMPLATE_ID)) {
			const contentPacks = definition.party?.contentPacks ?? [];

			// year-jinx is known to have 'wager' in its baseline, which we want to detect
			if (id === "year-jinx") {
				expect(contentPacks).toContain("wager");
			} else {
				expect(contentPacks).not.toContain("wager");
			}

			expect(contentPacks).not.toContain("history");
		}
	});

	it("should have valid structure for all definitions", () => {
		for (const [id, definition] of Object.entries(DEFINITION_BY_TEMPLATE_ID)) {
			expect(
				definition,
				`Template ${id} should have a party property`,
			).toHaveProperty("party");
			expect(
				definition.party,
				`Template ${id} should have contentPacks`,
			).toHaveProperty("contentPacks");
			expect(
				Array.isArray(definition.party?.contentPacks),
				`Template ${id} contentPacks should be an array`,
			).toBe(true);
		}
	});
});
