import { hitTestDesignCanvas, screenToWorld } from "@slopcade/editor";
import type { DesignDocument } from "@slopcade/shared";

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

function makeCircle(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	zIndex = 0,
): Frames[number]["elements"][number] {
	return { type: "circle", id, x, y, width: w, height: h, zIndex };
}

function makeLine(
	id: string,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	strokeWidth = 1,
	zIndex = 0,
): Frames[number]["elements"][number] {
	return { type: "line", id, x1, y1, x2, y2, strokeWidth, zIndex };
}

function makePath(
	id: string,
	x: number,
	y: number,
	zIndex = 0,
): Frames[number]["elements"][number] {
	return { type: "path", id, x, y, data: "M 0 0 L 40 40", zIndex };
}

function makeGroup(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	zIndex = 0,
): Frames[number]["elements"][number] {
	return { type: "group", id, x, y, width: w, height: h, childIds: [], zIndex };
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

describe("circle hit-testing", () => {
	it("hits circle center", () => {
		// Circle bounding box: x=50, y=50, w=100, h=100 → center (100,100), rx=50, ry=50
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeCircle("c1", 50, 50, 100, 100)]),
		];
		expect(hitTestDesignCanvas(frames, 100, 100)).toEqual({
			frameId: "f1",
			elementId: "c1",
		});
	});

	it("hits circle near edge (inside ellipse)", () => {
		// Center (100,100) rx=50 ry=50; point at (148, 100): distance ratio = 48/50 = 0.96 < 1 → inside
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeCircle("c1", 50, 50, 100, 100)]),
		];
		expect(hitTestDesignCanvas(frames, 148, 100)).toEqual({
			frameId: "f1",
			elementId: "c1",
		});
	});

	it("misses circle outside ellipse", () => {
		// Center (100,100) rx=50 ry=50; point at (155, 100): ratio = 55/50 = 1.1 > 1 → outside
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeCircle("c1", 50, 50, 100, 100)]),
		];
		expect(hitTestDesignCanvas(frames, 155, 100)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("uses frame offset when testing circle", () => {
		// Frame at (100,100), circle at el (0,0) w=80 h=80 → center world (140,140)
		const frames = [
			makeFrame("f1", 100, 100, 200, 200, [makeCircle("c1", 0, 0, 80, 80)]),
		];
		expect(hitTestDesignCanvas(frames, 140, 140)).toEqual({
			frameId: "f1",
			elementId: "c1",
		});
		expect(hitTestDesignCanvas(frames, 101, 101)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});
});

describe("line hit-testing", () => {
	it("hits horizontal line segment within tolerance", () => {
		// Line from (10,50) to (190,50) in world; tap at (100, 52) — 2px away, within 4px default tolerance
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeLine("l1", 10, 50, 190, 50)]),
		];
		expect(hitTestDesignCanvas(frames, 100, 52)).toEqual({
			frameId: "f1",
			elementId: "l1",
		});
	});

	it("misses line segment beyond tolerance", () => {
		// Same line; tap at (100, 60) — 10px away, beyond 4px default tolerance
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeLine("l1", 10, 50, 190, 50)]),
		];
		expect(hitTestDesignCanvas(frames, 100, 60)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("uses strokeWidth to widen line tolerance", () => {
		// strokeWidth=20 → tolerance = max(10, 4) = 10px
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeLine("l1", 10, 50, 190, 50, 20)]),
		];
		// 9px away → within 10px tolerance
		expect(hitTestDesignCanvas(frames, 100, 59)).toEqual({
			frameId: "f1",
			elementId: "l1",
		});
		// 11px away → outside tolerance
		expect(hitTestDesignCanvas(frames, 100, 61)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("hits near line endpoint", () => {
		// Line from (10,50) to (190,50); tap at (10, 52) — near start endpoint
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeLine("l1", 10, 50, 190, 50)]),
		];
		expect(hitTestDesignCanvas(frames, 10, 52)).toEqual({
			frameId: "f1",
			elementId: "l1",
		});
	});

	it("respects frame offset for line coordinates", () => {
		// Frame at (50,50), line x1=10,y1=50 x2=190,y2=50 → world ax=(60,100) bx=(240,100)
		const frames = [
			makeFrame("f1", 50, 50, 300, 300, [makeLine("l1", 10, 50, 190, 50)]),
		];
		expect(hitTestDesignCanvas(frames, 150, 102)).toEqual({
			frameId: "f1",
			elementId: "l1",
		});
	});
});

describe("path hit-testing (AABB approximation)", () => {
	it("hits path within 40×40 AABB", () => {
		// Path at x=20, y=20; AABB covers (20,20)→(60,60) in world
		const frames = [makeFrame("f1", 0, 0, 200, 200, [makePath("p1", 20, 20)])];
		expect(hitTestDesignCanvas(frames, 40, 40)).toEqual({
			frameId: "f1",
			elementId: "p1",
		});
	});

	it("misses path outside 40×40 AABB", () => {
		// Path at x=20, y=20; tap at (65,40) → x > 20+40=60 → outside
		const frames = [makeFrame("f1", 0, 0, 200, 200, [makePath("p1", 20, 20)])];
		expect(hitTestDesignCanvas(frames, 65, 40)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("hits path at AABB boundary (inclusive)", () => {
		const frames = [makeFrame("f1", 0, 0, 200, 200, [makePath("p1", 20, 20)])];
		expect(hitTestDesignCanvas(frames, 20, 20)).toEqual({
			frameId: "f1",
			elementId: "p1",
		});
		expect(hitTestDesignCanvas(frames, 60, 60)).toEqual({
			frameId: "f1",
			elementId: "p1",
		});
	});
});

describe("group hit-testing (AABB)", () => {
	it("hits group within bounding box", () => {
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeGroup("g1", 20, 20, 100, 80)]),
		];
		expect(hitTestDesignCanvas(frames, 70, 60)).toEqual({
			frameId: "f1",
			elementId: "g1",
		});
	});

	it("misses group outside bounding box", () => {
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [makeGroup("g1", 20, 20, 100, 80)]),
		];
		expect(hitTestDesignCanvas(frames, 125, 60)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});

	it("group respects frame offset", () => {
		// Frame at (50,50), group at (10,10) w=60 h=60 → world bounds (60,60)→(120,120)
		const frames = [
			makeFrame("f1", 50, 50, 200, 200, [makeGroup("g1", 10, 10, 60, 60)]),
		];
		expect(hitTestDesignCanvas(frames, 90, 90)).toEqual({
			frameId: "f1",
			elementId: "g1",
		});
		expect(hitTestDesignCanvas(frames, 125, 90)).toEqual({
			frameId: "f1",
			elementId: null,
		});
	});
});

describe("z-index ordering with mixed element types", () => {
	it("circle beats rect at same position when higher zIndex", () => {
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [
				makeRect("r1", 50, 50, 100, 100, 0),
				makeCircle("c1", 50, 50, 100, 100, 1),
			]),
		];
		// Center (100,100) is inside both rect and circle; circle wins (zIndex=1)
		expect(hitTestDesignCanvas(frames, 100, 100)).toEqual({
			frameId: "f1",
			elementId: "c1",
		});
	});

	it("falls through to lower-zIndex element when higher misses", () => {
		// Circle at (80,80) w=20 h=20 → center(90,90) rx=10 ry=10
		// Rect covers large area; tap at (50,50) is outside circle but inside rect
		const frames = [
			makeFrame("f1", 0, 0, 300, 300, [
				makeRect("r1", 20, 20, 150, 150, 0),
				makeCircle("c1", 80, 80, 20, 20, 1),
			]),
		];
		expect(hitTestDesignCanvas(frames, 50, 50)).toEqual({
			frameId: "f1",
			elementId: "r1",
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
