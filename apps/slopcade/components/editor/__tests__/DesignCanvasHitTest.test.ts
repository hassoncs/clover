import type { DesignDocument } from "@slopcade/shared";
import { describe, expect, it } from "vitest";
import {
	hitTestDesignCanvas,
	screenToWorld,
} from "../panels/designCanvasHitTest";

type Frames = DesignDocument["frames"];

function makeFrame(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	elements: Frames[number]["elements"] = [],
): Frames[number] {
	return {
		id,
		title: id,
		width: w,
		height: h,
		position: { x, y },
		elements,
	};
}

function makeRect(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	zIndex = 0,
): Frames[number]["elements"][number] {
	return { type: "rect", id, x, y, width: w, height: h, zIndex };
}

describe("hitTestDesignCanvas", () => {
	it("returns null/null when there are no frames", () => {
		expect(hitTestDesignCanvas([], 10, 10)).toEqual({
			frameId: null,
			elementId: null,
		});
	});

	it("returns null/null when tap is outside all frames", () => {
		const frames = [makeFrame("f1", 100, 100, 200, 300)];
		expect(hitTestDesignCanvas(frames, 50, 50)).toEqual({
			frameId: null,
			elementId: null,
		});
	});

	it("returns frameId/null when tap is inside a frame but not on any element", () => {
		const frames = [makeFrame("f1", 0, 0, 200, 200)];
		expect(hitTestDesignCanvas(frames, 100, 100)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("returns frameId/elementId when tap hits an element", () => {
		const frames = [
			makeFrame("f1", 0, 0, 200, 200, [makeRect("el1", 50, 50, 60, 60)]),
		];
		expect(hitTestDesignCanvas(frames, 80, 80)).toEqual({
			frameId: "f1",
			elementId: "el1",
		});
	});

	it("picks topmost element (highest zIndex) when elements overlap", () => {
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [
				makeRect("back", 40, 40, 100, 100, 0),
				makeRect("front", 50, 50, 80, 80, 1),
			]),
		];
		expect(hitTestDesignCanvas(frames, 90, 90)).toEqual({
			frameId: "f1",
			elementId: "front",
		});
	});

	it("picks lower-zIndex element when tap misses higher-zIndex element", () => {
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [
				makeRect("back", 10, 10, 100, 100, 0),
				makeRect("front", 80, 80, 40, 40, 1),
			]),
		];
		expect(hitTestDesignCanvas(frames, 20, 20)).toEqual({
			frameId: "f1",
			elementId: "back",
		});
	});

	it("picks topmost frame (last in array) when frames overlap", () => {
		const frames = [
			makeFrame("f1", 0, 0, 200, 200),
			makeFrame("f2", 50, 50, 200, 200),
		];
		expect(hitTestDesignCanvas(frames, 100, 100)).toEqual({
			frameId: "f2",
			elementId: null,
		});
	});

	it("respects frame position offset when computing element bounds", () => {
		const frames = [
			makeFrame("f1", 100, 100, 200, 200, [makeRect("el1", 10, 10, 30, 30)]),
		];
		expect(hitTestDesignCanvas(frames, 120, 120)).toEqual({
			frameId: "f1",
			elementId: "el1",
		});
		expect(hitTestDesignCanvas(frames, 105, 105)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("hits element at frame+element boundary (inclusive)", () => {
		const frames = [
			makeFrame("f1", 0, 0, 200, 200, [makeRect("el1", 10, 10, 50, 50)]),
		];
		expect(hitTestDesignCanvas(frames, 10, 10)).toEqual({
			frameId: "f1",
			elementId: "el1",
		});
		expect(hitTestDesignCanvas(frames, 60, 60)).toEqual({
			frameId: "f1",
			elementId: "el1",
		});
	});
});

describe("screenToWorld", () => {
	it("converts screen coords with identity camera", () => {
		const camera = { translateX: 0, translateY: 0, scale: 1 };
		expect(screenToWorld(100, 200, camera)).toEqual({
			worldX: 100,
			worldY: 200,
		});
	});

	it("applies translation offset", () => {
		const camera = { translateX: 50, translateY: 30, scale: 1 };
		expect(screenToWorld(100, 80, camera)).toEqual({ worldX: 50, worldY: 50 });
	});

	it("applies scale", () => {
		const camera = { translateX: 0, translateY: 0, scale: 2 };
		expect(screenToWorld(200, 100, camera)).toEqual({
			worldX: 100,
			worldY: 50,
		});
	});

	it("applies both translation and scale", () => {
		const camera = { translateX: 100, translateY: 50, scale: 2 };
		expect(screenToWorld(300, 150, camera)).toEqual({
			worldX: 100,
			worldY: 50,
		});
	});
});
