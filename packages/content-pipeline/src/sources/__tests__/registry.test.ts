import { describe, expect, it } from "vitest";
import { SPDX_LICENSE } from "../../types/sources.js";
import { APPROVED_SOURCES, getSource, listSources } from "../registry.js";

describe("registry", () => {
	describe("APPROVED_SOURCES", () => {
		it("includes OpenTDB with CC-BY-SA-4.0", () => {
			const source = APPROVED_SOURCES.opentdb;
			expect(source.name).toBe("Open Trivia Database");
			expect(source.license).toBe(SPDX_LICENSE.CC_BY_SA_4_0);
			expect(source.url).toBe("https://opentdb.com");
		});

		it("includes BibleQuizzle with MIT license", () => {
			const source = APPROVED_SOURCES.biblequizzle;
			expect(source.name).toBe("BibleQuizzle");
			expect(source.license).toBe(SPDX_LICENSE.MIT);
			expect(source.url).toBe("https://github.com/BibleQuizzle/BibleQuizzle");
		});

		it("includes Wikidata with CC0-1.0", () => {
			const source = APPROVED_SOURCES.wikidata;
			expect(source.name).toBe("Wikidata");
			expect(source.license).toBe(SPDX_LICENSE.CC0_1_0);
			expect(source.url).toBe("https://www.wikidata.org");
		});

		it("includes Wikipedia unusual articles with CC-BY-SA-4.0", () => {
			const source = APPROVED_SOURCES.wikipedia_unusual;
			expect(source.name).toBe("Wikipedia Unusual Articles");
			expect(source.license).toBe(SPDX_LICENSE.CC_BY_SA_4_0);
		});

		it("includes World Bank with CC-BY-4.0", () => {
			const source = APPROVED_SOURCES.world_bank;
			expect(source.name).toBe("World Bank Open Data");
			expect(source.license).toBe(SPDX_LICENSE.CC_BY_4_0);
		});

		it("includes Gapminder with CC-BY-4.0", () => {
			const source = APPROVED_SOURCES.gapminder;
			expect(source.name).toBe("Gapminder");
			expect(source.license).toBe(SPDX_LICENSE.CC_BY_4_0);
		});

		it("includes CIA World Factbook with Public Domain", () => {
			const source = APPROVED_SOURCES.cia_factbook;
			expect(source.name).toBe("CIA World Factbook");
			expect(source.license).toBe(SPDX_LICENSE.PUBLIC_DOMAIN);
		});

		it("includes US Gov Data with Public Domain", () => {
			const source = APPROVED_SOURCES.us_gov_data;
			expect(source.name).toBe("US Government Open Data");
			expect(source.license).toBe(SPDX_LICENSE.PUBLIC_DOMAIN);
		});

		it("includes AI Generated with Proprietary-AI", () => {
			const source = APPROVED_SOURCES.ai_generated;
			expect(source.name).toBe("AI Generated Content");
			expect(source.license).toBe(SPDX_LICENSE.PROPRIETARY_AI);
		});

		it("all sources have required fields", () => {
			Object.values(APPROVED_SOURCES).forEach((source) => {
				expect(source.id).toBeTruthy();
				expect(source.name).toBeTruthy();
				expect(source.url).toBeTruthy();
				expect(source.license).toBeTruthy();
				expect(source.description).toBeTruthy();
				expect(source.attributionTemplate).toBeTruthy();
			});
		});
	});

	describe("getSource", () => {
		it("returns source by id", () => {
			const source = getSource("opentdb");
			expect(source?.name).toBe("Open Trivia Database");
		});

		it("returns undefined for unknown id", () => {
			const source = getSource("unknown");
			expect(source).toBeUndefined();
		});
	});

	describe("listSources", () => {
		it("returns all sources", () => {
			const sources = listSources();
			expect(sources.length).toBe(9);
			expect(sources.map((s) => s.id)).toContain("opentdb");
			expect(sources.map((s) => s.id)).toContain("biblequizzle");
			expect(sources.map((s) => s.id)).toContain("wikidata");
			expect(sources.map((s) => s.id)).toContain("ai_generated");
		});
	});
});
