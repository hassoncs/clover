import { describe, expect, it } from "vitest";
import {
	generateAttribution,
	generateBulkAttribution,
	generateBulkAttributionHtml,
} from "../attribution.js";
import { APPROVED_SOURCES } from "../registry.js";

describe("attribution", () => {
	describe("generateAttribution", () => {
		it("generates text attribution for CC0", () => {
			const source = APPROVED_SOURCES.wikidata;
			const result = generateAttribution(source);
			expect(result).toContain("Wikidata");
			expect(result).toContain("CC0");
		});

		it("generates text attribution for CC-BY-4.0", () => {
			const source = APPROVED_SOURCES.world_bank;
			const result = generateAttribution(source);
			expect(result).toContain("World Bank");
			expect(result).toContain("CC BY 4.0");
		});

		it("generates text attribution for CC-BY-SA-4.0", () => {
			const source = APPROVED_SOURCES.opentdb;
			const result = generateAttribution(source);
			expect(result).toContain("Open Trivia Database");
			expect(result).toContain("CC BY-SA 4.0");
		});

		it("generates text attribution for Public Domain", () => {
			const source = APPROVED_SOURCES.cia_factbook;
			const result = generateAttribution(source);
			expect(result).toContain("CIA World Factbook");
			expect(result).toContain("Public Domain");
		});

		it("generates text attribution for AI generated", () => {
			const source = APPROVED_SOURCES.ai_generated;
			const result = generateAttribution(source);
			expect(result).toContain("Slopcade AI");
		});

		it("generates HTML attribution with links", () => {
			const source = APPROVED_SOURCES.wikidata;
			const result = generateAttribution(source, { format: "html" });
			expect(result).toContain("<a href=");
			expect(result).toContain("https://www.wikidata.org");
			expect(result).toContain("CC0");
		});

		it("generates HTML attribution for CC-BY-4.0", () => {
			const source = APPROVED_SOURCES.world_bank;
			const result = generateAttribution(source, { format: "html" });
			expect(result).toContain("<a href=");
			expect(result).toContain("https://data.worldbank.org");
			expect(result).toContain("CC BY 4.0");
		});

		it("generates HTML attribution for CC-BY-SA-4.0", () => {
			const source = APPROVED_SOURCES.opentdb;
			const result = generateAttribution(source, { format: "html" });
			expect(result).toContain("<a href=");
			expect(result).toContain("https://opentdb.com");
			expect(result).toContain("CC BY-SA 4.0");
		});

		it("generates HTML attribution without URL when includeUrl is false", () => {
			const source = APPROVED_SOURCES.wikidata;
			const result = generateAttribution(source, {
				format: "html",
				includeUrl: false,
			});
			expect(result).not.toContain("<a href=");
			expect(result).toContain("Wikidata");
			expect(result).toContain("CC0");
		});
	});

	describe("generateBulkAttribution", () => {
		it("generates multiple attributions separated by newlines", () => {
			const sources = [APPROVED_SOURCES.wikidata, APPROVED_SOURCES.opentdb];
			const result = generateBulkAttribution(sources);
			expect(result).toContain("Wikidata");
			expect(result).toContain("Open Trivia Database");
			expect(result.split("\n")).toHaveLength(2);
		});
	});

	describe("generateBulkAttributionHtml", () => {
		it("generates HTML list of attributions", () => {
			const sources = [APPROVED_SOURCES.wikidata, APPROVED_SOURCES.opentdb];
			const result = generateBulkAttributionHtml(sources);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>");
			expect(result).toContain("Wikidata");
			expect(result).toContain("Open Trivia Database");
			expect(result).toContain("</ul>");
		});
	});
});
