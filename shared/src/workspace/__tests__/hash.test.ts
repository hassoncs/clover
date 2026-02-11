import { describe, expect, it } from "vitest";
import { hashJsonStable, hashStringFNV1a64 } from "../hash";

describe("hashStringFNV1a64", () => {
	it("returns stable hash across calls", () => {
		const input = "hello world";
		expect(hashStringFNV1a64(input)).toBe(hashStringFNV1a64(input));
	});

	it("returns different hashes for different inputs", () => {
		expect(hashStringFNV1a64("abc")).not.toBe(hashStringFNV1a64("abd"));
	});

	it("returns valid 16-char hex for empty input", () => {
		const hash = hashStringFNV1a64("");
		expect(hash).toMatch(/^[0-9a-f]{16}$/);
	});

	it("returns valid 16-char hex for non-empty input", () => {
		const hash = hashStringFNV1a64("test content");
		expect(hash).toMatch(/^[0-9a-f]{16}$/);
	});

	it("detects single-character mutations", () => {
		const a = hashStringFNV1a64("file content v1");
		const b = hashStringFNV1a64("file content v2");
		expect(a).not.toBe(b);
	});
});

describe("hashJsonStable", () => {
	it("produces identical hash regardless of key order", () => {
		const a = hashJsonStable({ z: 1, a: 2 });
		const b = hashJsonStable({ a: 2, z: 1 });
		expect(a).toBe(b);
	});

	it("handles nested objects with deterministic ordering", () => {
		const a = hashJsonStable({ outer: { z: 1, a: 2 }, x: 3 });
		const b = hashJsonStable({ x: 3, outer: { a: 2, z: 1 } });
		expect(a).toBe(b);
	});

	it("handles arrays (order-sensitive)", () => {
		const a = hashJsonStable([1, 2, 3]);
		const b = hashJsonStable([1, 3, 2]);
		expect(a).not.toBe(b);
	});

	it("handles null, undefined, and primitives", () => {
		expect(hashJsonStable(null)).toMatch(/^[0-9a-f]{16}$/);
		expect(hashJsonStable(undefined)).toMatch(/^[0-9a-f]{16}$/);
		expect(hashJsonStable(42)).toMatch(/^[0-9a-f]{16}$/);
		expect(hashJsonStable("string")).toMatch(/^[0-9a-f]{16}$/);
		expect(hashJsonStable(true)).toMatch(/^[0-9a-f]{16}$/);
	});

	it("differs when content changes", () => {
		const a = hashJsonStable({ version: "1.0" });
		const b = hashJsonStable({ version: "1.1" });
		expect(a).not.toBe(b);
	});
});
