import { afterEach, describe, expect, it } from "vitest";
import Yoga from "yoga-layout";
import { SceneGraph } from "../scene-graph";
import {
	__setYogaFactoryForTests,
	computeLayout,
	LayoutInitError,
} from "../yoga-layout";

function mustRect(
	layout: Map<string, { x: number; y: number; width: number; height: number }>,
	id: string,
) {
	const rect = layout.get(id);
	if (!rect) {
		throw new Error(`Missing rect for node: ${id}`);
	}
	return rect;
}

afterEach(() => {
	__setYogaFactoryForTests(() => Yoga);
});

describe("computeLayout (Yoga)", () => {
	it("lays out a horizontal frame with padding and gap", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			layout: "horizontal",
			width: 220,
			height: 80,
			padding: 10,
			gap: 10,
		});
		graph.createNode("rectangle", "root", { id: "a", width: 50, height: 20 });
		graph.createNode("rectangle", "root", { id: "b", width: 60, height: 20 });

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "a")).toMatchObject({
			x: 10,
			y: 10,
			width: 50,
			height: 20,
		});
		expect(mustRect(layout, "b")).toMatchObject({
			x: 70,
			y: 10,
			width: 60,
			height: 20,
		});
	});

	it("lays out a vertical frame with gap", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			layout: "vertical",
			width: 120,
			height: 200,
			gap: 8,
		});
		graph.createNode("rectangle", "root", { id: "a", width: 40, height: 20 });
		graph.createNode("rectangle", "root", { id: "b", width: 40, height: 30 });

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "a")).toMatchObject({
			x: 0,
			y: 0,
			width: 40,
			height: 20,
		});
		expect(mustRect(layout, "b")).toMatchObject({
			x: 0,
			y: 28,
			width: 40,
			height: 30,
		});
	});

	it("supports wrap layout mode", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			layout: "wrap",
			width: 120,
			height: 120,
			gap: 10,
		});
		graph.createNode("rectangle", "root", { id: "a", width: 50, height: 20 });
		graph.createNode("rectangle", "root", { id: "b", width: 50, height: 20 });
		graph.createNode("rectangle", "root", { id: "c", width: 50, height: 20 });

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "a")).toMatchObject({ x: 0, y: 0 });
		expect(mustRect(layout, "b")).toMatchObject({ x: 60, y: 0 });
		expect(mustRect(layout, "c")).toMatchObject({ x: 0, y: 30 });
	});

	it("uses absolute positioning for x/y inside non-flex parents", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			layout: "none",
			width: 300,
			height: 200,
		});
		graph.createNode("rectangle", "root", {
			id: "child",
			x: 30,
			y: 40,
			width: 50,
			height: 60,
		});

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "child")).toMatchObject({
			x: 30,
			y: 40,
			width: 50,
			height: 60,
		});
	});

	it("maps fill_container sizing to Yoga flex growth", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			layout: "horizontal",
			width: 300,
			height: 80,
		});
		graph.createNode("rectangle", "root", {
			id: "fixed",
			width: 100,
			height: 20,
		});
		graph.createNode("rectangle", "root", {
			id: "fill",
			width: "fill_container",
			height: 20,
		});

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "fill")).toMatchObject({
			width: 200,
			height: 20,
			x: 100,
			y: 0,
		});
	});

	it("lays out nested frames deterministically", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "outer",
			layout: "vertical",
			width: 300,
			height: 220,
			padding: 10,
			gap: 10,
		});
		graph.createNode("frame", "outer", {
			id: "inner",
			layout: "horizontal",
			width: "fill_container",
			height: 100,
			gap: 10,
		});
		graph.createNode("rectangle", "inner", { id: "a", width: 50, height: 50 });
		graph.createNode("rectangle", "inner", { id: "b", width: 50, height: 50 });

		const layout = computeLayout(graph, graph.rootId);

		expect(mustRect(layout, "inner")).toMatchObject({
			x: 10,
			y: 10,
			width: 280,
			height: 100,
		});
		expect(mustRect(layout, "a")).toMatchObject({
			x: 10,
			y: 10,
			width: 50,
			height: 50,
		});
		expect(mustRect(layout, "b")).toMatchObject({
			x: 70,
			y: 10,
			width: 50,
			height: 50,
		});
	});

	it("throws LayoutInitError when Yoga initialization fails", () => {
		const graph = new SceneGraph();
		graph.createNode("frame", graph.rootId, {
			id: "root",
			width: 100,
			height: 100,
		});

		__setYogaFactoryForTests(() => {
			throw new Error("wasm init failed");
		});

		expect(() => computeLayout(graph, graph.rootId)).toThrow(LayoutInitError);
		expect(() => computeLayout(graph, graph.rootId)).toThrow(
			"Failed to initialize Yoga WASM: wasm init failed",
		);
	});
});
