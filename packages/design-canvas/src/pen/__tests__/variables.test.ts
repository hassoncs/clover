import { describe, expect, it } from "vitest";
import type { PenTheme, PenVariable } from "@slopcade/protocol/pen";
import { buildThemeContext } from "../themes";
import { resolveTreeVariables, resolveVariable } from "../variables";

describe("resolveVariable", () => {
	it("resolves a simple string variable", () => {
		const variables: Record<string, PenVariable> = {
			"--color": { type: "color", value: "#FF0000" },
		};
		expect(resolveVariable("$--color", variables, { axes: {} })).toBe("#FF0000");
	});

	it("resolves a themed variable for Light mode", () => {
		const variables: Record<string, PenVariable> = {
			"--bg": {
				type: "color",
				value: [
					{ value: "#FFFFFF", theme: { Mode: "Light" } },
					{ value: "#000000", theme: { Mode: "Dark" } },
					{ value: "#888888" },
				],
			},
		};
		expect(resolveVariable("$--bg", variables, { axes: { Mode: "Light" } })).toBe("#FFFFFF");
	});

	it("resolves a themed variable for Dark mode", () => {
		const variables: Record<string, PenVariable> = {
			"--bg": {
				type: "color",
				value: [
					{ value: "#FFFFFF", theme: { Mode: "Light" } },
					{ value: "#000000", theme: { Mode: "Dark" } },
					{ value: "#888888" },
				],
			},
		};
		expect(resolveVariable("$--bg", variables, { axes: { Mode: "Dark" } })).toBe("#000000");
	});

	it("falls back to the universal entry when no theme matches", () => {
		const variables: Record<string, PenVariable> = {
			"--bg": {
				type: "color",
				value: [
					{ value: "#FFFFFF", theme: { Mode: "Light" } },
					{ value: "#000000", theme: { Mode: "Dark" } },
					{ value: "#888888" },
				],
			},
		};
		expect(resolveVariable("$--bg", variables, { axes: {} })).toBe("#888888");
	});

	it("returns the original reference when the variable is not found", () => {
		expect(resolveVariable("$--missing", {}, { axes: {} })).toBe("$--missing");
	});

	it("resolves a number variable", () => {
		const variables: Record<string, PenVariable> = {
			"--size": { type: "number", value: 16 },
		};
		expect(resolveVariable("$--size", variables, { axes: {} })).toBe(16);
	});
});

describe("buildThemeContext", () => {
	it("uses document theme defaults when no parent or override is provided", () => {
		const themes: PenTheme[] = [
			{ name: "Mode", values: ["Light", "Dark"] },
			{ name: "Size", values: ["S", "M", "L"], default: "M" },
		];
		const ctx = buildThemeContext(themes);
		expect(ctx.axes).toEqual({ Mode: "Light", Size: "M" });
	});

	it("applies node theme override on top of parent context", () => {
		const themes: PenTheme[] = [
			{ name: "Mode", values: ["Light", "Dark"] },
			{ name: "Size", values: ["S", "M", "L"], default: "M" },
		];
		const parent = { axes: { Mode: "Light", Size: "M" } };
		const ctx = buildThemeContext(themes, { Mode: "Dark" }, parent);
		expect(ctx.axes).toEqual({ Mode: "Dark", Size: "M" });
	});
});

describe("resolveTreeVariables", () => {
	it("resolves variables in a frame fill property", () => {
		const variables: Record<string, PenVariable> = {
			"--primary": { type: "color", value: "#007AFF" },
		};
		const nodes = [
			{
				type: "frame" as const,
				id: "f1",
				fill: "$--primary",
				children: [],
			},
		];
		const resolved = resolveTreeVariables(nodes, variables, undefined);
		expect((resolved[0] as { fill: unknown }).fill).toBe("#007AFF");
	});

	it("child inherits parent theme override for variable resolution", () => {
		const variables: Record<string, PenVariable> = {
			"--bg": {
				type: "color",
				value: [
					{ value: "#FFF", theme: { Mode: "Light" } },
					{ value: "#000", theme: { Mode: "Dark" } },
				],
			},
		};
		const themes: PenTheme[] = [{ name: "Mode", values: ["Light", "Dark"] }];
		const nodes = [
			{
				type: "frame" as const,
				id: "parent",
				theme: { Mode: "Dark" },
				children: [
					{
						type: "text" as const,
						id: "child",
						content: "Hello",
						fill: "$--bg",
					},
				],
			},
		];
		const resolved = resolveTreeVariables(nodes, variables, themes);
		const parent = resolved[0] as { children?: Array<{ fill: unknown }> };
		expect(parent.children?.[0].fill).toBe("#000");
	});

	it("node theme override overrides parent theme for grandchild resolution", () => {
		const variables: Record<string, PenVariable> = {
			"--bg": {
				type: "color",
				value: [
					{ value: "#FFF", theme: { Mode: "Light" } },
					{ value: "#000", theme: { Mode: "Dark" } },
				],
			},
		};
		const themes: PenTheme[] = [{ name: "Mode", values: ["Light", "Dark"] }];
		const nodes = [
			{
				type: "frame" as const,
				id: "grandparent",
				theme: { Mode: "Dark" },
				children: [
					{
						type: "frame" as const,
						id: "parent",
						theme: { Mode: "Light" },
						children: [
							{
								type: "text" as const,
								id: "grandchild",
								content: "Hello",
								fill: "$--bg",
							},
						],
					},
				],
			},
		];
		const resolved = resolveTreeVariables(nodes, variables, themes);
		const grandparent = resolved[0] as {
			children?: Array<{ children?: Array<{ fill: unknown }> }>;
		};
		expect(grandparent.children?.[0].children?.[0].fill).toBe("#FFF");
	});
});
