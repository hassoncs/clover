import { describe, expect, it } from "vitest";
import { resolveImageUrl, sourceKeyFor } from "../useDesignImageResolver";

describe("resolveImageUrl — resolution priority", () => {
	it("returns assetRef when both assetRef and imageUrl are present (assetRef wins)", () => {
		expect(
			resolveImageUrl("sprites/hero.png", "https://cdn.example.com/hero.png"),
		).toBe("sprites/hero.png");
	});

	it("returns assetRef when only assetRef is set", () => {
		expect(resolveImageUrl("sprites/bg.png", undefined)).toBe("sprites/bg.png");
	});

	it("returns imageUrl when only imageUrl is set", () => {
		expect(resolveImageUrl(undefined, "https://cdn.example.com/bg.png")).toBe(
			"https://cdn.example.com/bg.png",
		);
	});

	it("returns null when neither assetRef nor imageUrl is provided (placeholder)", () => {
		expect(resolveImageUrl(undefined, undefined)).toBeNull();
	});

	it("treats empty string assetRef as falsy and falls through to imageUrl", () => {
		expect(resolveImageUrl("", "https://cdn.example.com/img.png")).toBe(
			"https://cdn.example.com/img.png",
		);
	});

	it("treats empty string imageUrl as falsy and returns null", () => {
		expect(resolveImageUrl(undefined, "")).toBeNull();
	});
});

describe("sourceKeyFor — cache key generation", () => {
	it("prefixes assetRef keys with 'asset:'", () => {
		expect(sourceKeyFor("sprites/hero.png", undefined)).toBe(
			"asset:sprites/hero.png",
		);
	});

	it("prefixes imageUrl keys with 'url:'", () => {
		expect(sourceKeyFor(undefined, "https://cdn.example.com/img.png")).toBe(
			"url:https://cdn.example.com/img.png",
		);
	});

	it("returns 'none' when neither source is present", () => {
		expect(sourceKeyFor(undefined, undefined)).toBe("none");
	});

	it("prefers assetRef key when both are present (mirrors resolveImageUrl priority)", () => {
		expect(
			sourceKeyFor("sprites/hero.png", "https://cdn.example.com/hero.png"),
		).toBe("asset:sprites/hero.png");
	});

	it("produces distinct keys for assetRef and imageUrl with the same path value", () => {
		const key1 = sourceKeyFor("same/path.png", undefined);
		const key2 = sourceKeyFor(undefined, "same/path.png");
		expect(key1).not.toBe(key2);
	});
});
