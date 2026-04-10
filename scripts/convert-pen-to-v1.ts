#!/usr/bin/env tsx
/**
 * Convert pencil.dev .pen files (v2.x) → our format (v1).
 *
 * Format diffs: version string→number, themes object→array,
 * variables "$--" prefix strip, effect→effects array, textGrowth mapping,
 * cornerRadius "$--" variable resolution, slot array→boolean,
 * stroke thickness partial→full side objects, drop unknown props.
 */

import * as fs from "fs";
import * as path from "path";

function convertThemes(themes: Record<string, string[]>) {
	return Object.entries(themes).map(([name, values]) => ({
		name,
		values,
		default: values[0],
	}));
}

function resolveVarRefs(obj: any, vars: Record<string, any>): any {
	if (typeof obj === "string" && obj.startsWith("$--")) {
		const key = obj.slice(1);
		const v = vars[key];
		if (v == null) return obj;
		// { type, value } — unwrap the value field
		if (typeof v === "object" && v !== null && "value" in v && "type" in v) {
			const val = v.value;
			// value itself may be a themed array [{ value, theme? }, ...]
			if (
				Array.isArray(val) &&
				val.length > 0 &&
				typeof val[0] === "object" &&
				val[0] !== null &&
				"value" in val[0]
			) {
				return val[0].value ?? obj;
			}
			return val;
		}
		// Themed array [{ value, theme? }, ...]
		if (
			Array.isArray(v) &&
			v.length > 0 &&
			typeof v[0] === "object" &&
			v[0] !== null &&
			"value" in v[0]
		) {
			return v[0].value ?? obj;
		}
		return v;
	}
	if (Array.isArray(obj)) return obj.map((item) => resolveVarRefs(item, vars));
	if (obj && typeof obj === "object") {
		const out: any = {};
		for (const [k, v] of Object.entries(obj)) {
			out[k] = resolveVarRefs(v, vars);
		}
		return out;
	}
	return obj;
}

function normalizeStrokeThickness(thickness: any): any {
	if (typeof thickness === "number") return thickness;
	if (typeof thickness !== "object" || thickness === null) return thickness;
	const sides = {
		top: thickness.top ?? 0,
		right: thickness.right ?? 0,
		bottom: thickness.bottom ?? 0,
		left: thickness.left ?? 0,
	};
	if (
		sides.top === sides.right &&
		sides.right === sides.bottom &&
		sides.bottom === sides.left
	) {
		return sides.top;
	}
	return sides;
}

/**
 * Convert pencil.dev fill to our PenFill format.
 *
 * pencil.dev fills can be:
 * - string: "#hex", "$--variable", "none"
 * - array of gradient/image entries: [color_string, {type:"gradient",...}]
 * - object: {type:"gradient", ...} (single gradient)
 *
 * Our PenFill format:
 * - string: "#hex" (resolved color)
 * - {type:"color", color:"#hex"} (color fill)
 * - {type:"gradient", ...} (gradient fill)
 * - {type:"image", url:"..."} (image fill)
 * - PenFill[] (array of fills)
 */
function convertFill(fill: any): any {
	if (fill === undefined || fill === null) return undefined;
	if (fill === "none" || fill === "") return undefined;
	if (typeof fill === "string") return fill;
	if (Array.isArray(fill)) {
		const converted: any[] = [];
		for (const entry of fill) {
			if (typeof entry === "string") {
				converted.push(entry);
			} else if (entry && typeof entry === "object" && "type" in entry) {
				converted.push({ ...entry });
			} else if (entry && typeof entry === "object" && "value" in entry) {
				converted.push(entry.value);
			}
		}
		if (converted.length === 0) return undefined;
		if (converted.every((e) => typeof e === "string")) return converted[0];
		return converted.length === 1 ? converted[0] : converted;
	}
	if (typeof fill === "object" && "type" in fill) return { ...fill };
	return undefined;
}

function convertNode(node: any, vars: Record<string, any>): any {
	if (!node || typeof node !== "object") return node;
	if (Array.isArray(node)) return node.map((item) => convertNode(item, vars));

	const out: any = { ...node };

	if (out.cornerRadius !== undefined) {
		out.cornerRadius = resolveVarRefs(out.cornerRadius, vars);
	}

	if (out.slot !== undefined) {
		out.slot = Array.isArray(out.slot) ? out.slot.length > 0 : !!out.slot;
	}

	if (out.textGrowth === "hug_content") out.textGrowth = "fit_both";
	else if (out.textGrowth === "hug_width") out.textGrowth = "fit_width";
	else if (out.textGrowth === "hug_height") out.textGrowth = "fit_height";
	else if (out.textGrowth === "fixed-width") out.textGrowth = "fixed";
	else if (out.textGrowth === "fixed-height") out.textGrowth = "fixed";

	if (out.textAlignVertical === "middle") out.textAlignVertical = "center";

	if (out.justifyContent) {
		out.justifyContent = out.justifyContent.replace(/_/g, "-");
	}

	if (
		out.stroke &&
		typeof out.stroke === "object" &&
		typeof out.stroke.thickness === "object" &&
		out.stroke.thickness !== null
	) {
		out.stroke.thickness = normalizeStrokeThickness(out.stroke.thickness);
	}

	if (out.type === "icon_font" && out.iconFontName && !out.icon) {
		out.icon = out.iconFontName;
	}
	delete out.iconFontName;
	delete out.iconFontFamily;
	delete out.weight;

	if (out.effect && !out.effects) {
		const eff = out.effect;
		if (eff.type === "shadow") {
			out.effects = [
				{
					shadow: {
						color: eff.color || "#000000",
						offsetX: eff.offset?.x || 0,
						offsetY: eff.offset?.y || 0,
						blur: eff.blur || 0,
						spread: eff.spread || 0,
						inner: eff.shadowType === "inner",
						enabled: true,
					},
				},
			];
		}
		delete out.effect;
	}

	// Convert gradient fills: pencil.dev uses `colors`, our renderer expects `stops`
	if (Array.isArray(out.fill)) {
		out.fill = out.fill.map((f: any) => {
			if (
				f &&
				typeof f === "object" &&
				f.type === "gradient" &&
				f.colors &&
				!f.stops
			) {
				return { ...f, stops: f.colors };
			}
			return f;
		});
	} else if (
		out.fill &&
		typeof out.fill === "object" &&
		out.fill.type === "gradient" &&
		out.fill.colors &&
		!out.fill.stops
	) {
		out.fill = { ...out.fill, stops: out.fill.colors };
	}

	if (out.fontFamily !== undefined) {
		out.fontFamily = resolveVarRefs(out.fontFamily, vars);
	}
	if (out.fill !== undefined) {
		out.fill = convertFill(out.fill);
		out.fill = resolveVarRefs(out.fill, vars);
	}

	if (out.children && Array.isArray(out.children)) {
		out.children = out.children.map((child: any) => convertNode(child, vars));
	}

	if (out.descendants && typeof out.descendants === "object") {
		const converted: Record<string, any> = {};
		for (const [id, val] of Object.entries(out.descendants)) {
			converted[id] = convertNode(val, vars);
		}
		out.descendants = converted;
	}

	return out;
}

function convertPenDocument(input: any): any {
	const output: any = { version: 1, children: [] };

	if (
		input.themes &&
		typeof input.themes === "object" &&
		!Array.isArray(input.themes)
	) {
		output.themes = convertThemes(input.themes);
	} else if (Array.isArray(input.themes)) {
		output.themes = input.themes;
	}

	const vars: Record<string, any> = {};
	if (input.variables) {
		for (const [k, v] of Object.entries(input.variables)) {
			const key = k.startsWith("$") ? k.slice(1) : k;
			vars[key] = v;
		}
	}
	if (Object.keys(vars).length > 0) {
		output.variables = vars;
	}

	if (input.children && Array.isArray(input.children)) {
		output.children = input.children.map((child: any) =>
			convertNode(child, vars),
		);
	}

	return output;
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/\.pen$/, "-v1.pen");

if (!inputFile) {
	console.error("Usage: tsx convert-pen-to-v1.ts <input.pen> [output.pen]");
	process.exit(1);
}

const inputPath = path.resolve(inputFile);
const outputPath = path.resolve(outputFile);

console.log(`Converting ${inputPath} → ${outputPath}`);

const raw = fs.readFileSync(inputPath, "utf-8");
const parsed = JSON.parse(raw);
const converted = convertPenDocument(parsed);

fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
console.log(
	`Done. Wrote ${outputPath} (${JSON.stringify(converted).length} bytes)`,
);
