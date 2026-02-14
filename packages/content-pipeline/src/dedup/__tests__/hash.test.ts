import { describe, expect, it } from "vitest";
import { computeContentHash, normalizeContent } from "../hash.js";

describe("normalizeContent", () => {
	it("converts to lowercase", () => {
		expect(normalizeContent("HELLO WORLD")).toBe("hello world");
	});

	it("strips leading and trailing whitespace", () => {
		expect(normalizeContent("  hello world  ")).toBe("hello world");
	});

	it("collapses multiple whitespace to single space", () => {
		expect(normalizeContent("hello    world")).toBe("hello world");
		expect(normalizeContent("hello\n\nworld")).toBe("hello world");
		expect(normalizeContent("hello\t\tworld")).toBe("hello world");
	});

	it("handles all transformations together", () => {
		expect(normalizeContent("  HELLO   WORLD  ")).toBe("hello world");
	});
});

describe("computeContentHash", () => {
	it("produces consistent hashes for same content", () => {
		const hash1 = computeContentHash("hello world");
		const hash2 = computeContentHash("hello world");
		expect(hash1).toBe(hash2);
	});

	it("produces same hash for normalized equivalent content", () => {
		const hash1 = computeContentHash("HELLO WORLD");
		const hash2 = computeContentHash("hello world");
		const hash3 = computeContentHash("  hello   world  ");
		expect(hash1).toBe(hash2);
		expect(hash2).toBe(hash3);
	});

	it("produces different hashes for different content", () => {
		const hash1 = computeContentHash("hello world");
		const hash2 = computeContentHash("goodbye world");
		expect(hash1).not.toBe(hash2);
	});

	it("returns 64-character hex string", () => {
		const hash = computeContentHash("test");
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});
});
