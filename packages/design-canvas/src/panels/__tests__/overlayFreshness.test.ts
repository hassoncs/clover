import { describe, expect, it } from "vitest";
import {
	getOverlayFreshnessState,
	hasFreshOverlayNodes,
} from "../overlayFreshness";

describe("getOverlayFreshnessState", () => {
	it("returns inert values when createdAt is missing", () => {
		expect(getOverlayFreshnessState(undefined, 10_000)).toEqual({
			isFresh: false,
			opacity: 1,
			scale: 1,
			ringOpacity: 0,
		});
	});

	it("returns animated values for fresh nodes", () => {
		const state = getOverlayFreshnessState(9_000, 10_000);
		expect(state.isFresh).toBe(true);
		expect(state.opacity).toBeGreaterThan(0.78);
		expect(state.opacity).toBeLessThan(1);
		expect(state.scale).toBeGreaterThan(0.985);
		expect(state.scale).toBeLessThan(1);
		expect(state.ringOpacity).toBeGreaterThan(0);
	});

	it("expires nodes after the freshness window", () => {
		expect(getOverlayFreshnessState(7_000, 10_000).isFresh).toBe(false);
	});
});

describe("hasFreshOverlayNodes", () => {
	it("detects when any fresh node is present", () => {
		expect(hasFreshOverlayNodes([undefined, 9_500], 10_000)).toBe(true);
	});

	it("returns false when all nodes are stale", () => {
		expect(hasFreshOverlayNodes([undefined, 5_000], 10_000)).toBe(false);
	});
});
