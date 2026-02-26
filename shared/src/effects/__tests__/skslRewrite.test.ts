import { describe, expect, it } from "vitest";
import { rewriteGodotToSkSL } from "../skslRewrite";

describe("rewriteGodotToSkSL", () => {
	it("should handle a simple generator (constantColor-like)", () => {
		const glsl = `shader_type canvas_item;
uniform vec4 fill_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
void fragment() {
	COLOR = vec4(fill_color.rgb, 1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);

		expect(result.sksl).not.toContain("shader_type canvas_item;");
		expect(result.sksl).toContain("uniform float4 fill_color;");
		expect(result.sksl).toContain("half4 main(float2 xy)");
		expect(result.sksl).toContain("return half4(fill_color.rgb, 1.0);");
		expect(result.warnings).toHaveLength(0);
		expect(result.uniforms).toContainEqual({
			name: "fill_color",
			type: "float4",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
		});
	});

	it("should inject iTime and iResolution when TIME and SCREEN_UV are used", () => {
		const glsl = `void fragment() {
	COLOR = vec4(SCREEN_UV, TIME, 1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);

		expect(result.sksl).toContain("uniform float iTime;");
		expect(result.sksl).toContain("uniform float2 iResolution;");
		expect(result.sksl).toContain("(xy / iResolution)");
		expect(result.sksl).toContain("iTime");
		expect(result.uniforms.map((u) => u.name)).toContain("iTime");
		expect(result.uniforms.map((u) => u.name)).toContain("iResolution");
	});

	it("should rewrite mat2 to float2x2", () => {
		const glsl = `void fragment() {
	mat2 m = mat2(1.0, 0.0, 0.0, 1.0);
	COLOR = vec4(1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.sksl).toContain("float2x2 m = float2x2(1.0, 0.0, 0.0, 1.0);");
	});

	it("should rewrite PI and TAU constants", () => {
		const glsl = `void fragment() {
	float p = PI;
	float t = TAU;
	COLOR = vec4(1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.sksl).toContain("float p = 3.14159265358979;");
		expect(result.sksl).toContain("float t = 6.28318530718;");
	});

	it("should rewrite FRAGCOORD.xy to xy", () => {
		const glsl = `void fragment() {
	vec2 f = FRAGCOORD.xy;
	COLOR = vec4(1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.sksl).toContain("float2 f = xy;");
	});

	it("should rewrite SCREEN_PIXEL_SIZE to (1.0 / iResolution)", () => {
		const glsl = `void fragment() {
	vec2 s = SCREEN_PIXEL_SIZE;
	COLOR = vec4(1.0);
}`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.sksl).toContain("float2 s = (1.0 / iResolution);");
		expect(result.sksl).toContain("uniform float2 iResolution;");
	});

	it("should extract uniforms with correct names, types, and default values", () => {
		const glsl = `uniform float intensity = 0.5;
uniform vec2 offset = vec2(10.0, 20.0);
uniform int count;
void fragment() { COLOR = vec4(1.0); }`;
		const result = rewriteGodotToSkSL(glsl);

		expect(result.uniforms).toContainEqual({
			name: "intensity",
			type: "float",
			defaultValue: 0.5,
		});
		expect(result.uniforms).toContainEqual({
			name: "offset",
			type: "float2",
			defaultValue: [10.0, 20.0],
		});
		expect(result.uniforms).toContainEqual({
			name: "count",
			type: "int",
			defaultValue: undefined,
		});
	});

	it("should produce a warning on SCREEN_TEXTURE / hint_screen_texture", () => {
		const glsl = `uniform sampler2D screen : hint_screen_texture;
void fragment() { COLOR = texture(screen, SCREEN_UV); }`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.warnings).toContain(
			"SCREEN_TEXTURE not supported — filter shaders require a separate approach",
		);
	});

	it("should produce a warning on #include", () => {
		const glsl = `#include "res://some.gdshaderinc"
void fragment() { COLOR = vec4(1.0); }`;
		const result = rewriteGodotToSkSL(glsl);
		expect(result.warnings).toContain(
			"Shader uses #include — SkSL does not support includes",
		);
	});
});
