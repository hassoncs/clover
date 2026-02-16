import { describe, expect, it } from "vitest";
import {
	BIBLE_BOOKS,
	isValidScriptureRef,
	parseScriptureRef,
} from "../scripture-validator.js";

describe("scripture-validator", () => {
	it("exports 66 canonical Bible books", () => {
		expect(BIBLE_BOOKS).toHaveLength(66);
		expect(BIBLE_BOOKS).toContain("Genesis");
		expect(BIBLE_BOOKS).toContain("Revelation");
	});

	it("parses valid scripture reference", () => {
		expect(parseScriptureRef("Genesis 2:8")).toEqual({
			book: "Genesis",
			chapter: 2,
			verseStart: 8,
		});
	});

	it("parses verse ranges", () => {
		expect(parseScriptureRef("John 3:16-17")).toEqual({
			book: "John",
			chapter: 3,
			verseStart: 16,
			verseEnd: 17,
		});
	});

	it("supports common abbreviations", () => {
		expect(parseScriptureRef("Gen 1:1")).toEqual({
			book: "Genesis",
			chapter: 1,
			verseStart: 1,
		});
		expect(isValidScriptureRef("1 Cor 13:4-7")).toBe(true);
	});

	it("rejects invalid formats and impossible ranges", () => {
		expect(isValidScriptureRef("Genesis 2")).toBe(false);
		expect(isValidScriptureRef("Unknown 2:8")).toBe(false);
		expect(isValidScriptureRef("Genesis 0:1")).toBe(false);
		expect(isValidScriptureRef("Genesis 2:0")).toBe(false);
		expect(isValidScriptureRef("Genesis 2:20-8")).toBe(false);
		expect(parseScriptureRef("Genesis 2:20-8")).toBeNull();
	});
});
