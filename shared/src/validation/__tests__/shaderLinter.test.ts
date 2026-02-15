import { describe, expect, it } from "vitest";
import type { GameDefinition } from "../../types/GameDefinition";
import type {
	ValidationError,
	ValidationWarning,
} from "../gameDefinitionTypes";
import {
	autoFixShader,
	extractShaderSources,
	lintShaderSource,
	validateShaders,
} from "../shaderLinter";

describe("lintShaderSource", () => {
	it("passes valid Godot 4 shader", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	COLOR = texture(TEXTURE, UV);
}`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("catches TEXTURE_SIZE (Godot 3)", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	vec2 size = TEXTURE_SIZE;
	COLOR = vec4(1.0);
}`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(false);
		expect(result.errors[0].code).toBe("INCOMPATIBLE_TEXTURE_SIZE");
		expect(result.errors[0].message).toContain("TEXTURE_PIXEL_SIZE");
	});

	it("catches texture2D (GLSL ES 2.0)", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	COLOR = texture2D(tex, UV);
}`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(false);
		expect(result.errors[0].code).toBe("INCOMPATIBLE_TEXTURE2D__");
	});

	it("catches gl_FragColor (WebGL)", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	gl_FragColor = vec4(1.0);
}`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(false);
		expect(result.errors[0].code).toBe("INCOMPATIBLE_GL_FRAGCOLOR");
	});

	it("catches Shadertoy iTime", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	float t = iTime;
	COLOR = vec4(1.0);
}`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(false);
		expect(result.errors[0].code).toBe("INCOMPATIBLE_ITIME");
	});

	it("catches missing shader_type", () => {
		const shader = `void fragment() { COLOR = vec4(1.0); }`;
		const result = lintShaderSource(shader);
		expect(result.valid).toBe(false);
		expect(result.errors[0].code).toBe("MISSING_SHADER_TYPE");
	});

	it("reports line numbers for errors", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	vec2 size = TEXTURE_SIZE;
	COLOR = vec4(1.0);
}`;
		const result = lintShaderSource(shader);
		expect(result.issues[0].line).toBe(3);
	});

	it("reports multiple errors", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	gl_FragColor = texture2D(tex, UV);
}`;
		const result = lintShaderSource(shader);
		expect(result.errors.length).toBe(2);
	});
});

describe("extractShaderSources", () => {
	it("extracts from effects.graph.nodes", () => {
		const game = {
			effects: {
				graph: {
					nodes: [
						{
							id: "swirl",
							params: {
								shaderSource:
									"shader_type canvas_item; void fragment() { COLOR = vec4(1.0); }",
							},
						},
					],
				},
			},
		} as GameDefinition;

		const shaders = extractShaderSources(game);
		expect(shaders).toHaveLength(1);
		expect(shaders[0].id).toBe("swirl");
	});

	it("extracts from effects.shaders", () => {
		const game = {
			effects: {
				shaders: {
					glow: {
						filename: "glow.gdshader",
						glsl: "shader_type canvas_item; void fragment() {}",
					},
				},
			},
		} as unknown as GameDefinition;

		const shaders = extractShaderSources(game);
		expect(shaders).toHaveLength(1);
		expect(shaders[0].id).toBe("glow");
	});

	it("extracts from effects.entityEffects", () => {
		const game = {
			effects: {
				entityEffects: [
					{
						entityId: "player",
						glsl: "shader_type canvas_item; void fragment() {}",
					},
				],
			},
		} as GameDefinition;

		const shaders = extractShaderSources(game);
		expect(shaders).toHaveLength(1);
		expect(shaders[0].id).toBe("player");
	});

	it("returns empty array when no effects", () => {
		const game = {} as GameDefinition;
		const shaders = extractShaderSources(game);
		expect(shaders).toHaveLength(0);
	});
});

describe("validateShaders", () => {
	it("adds errors for invalid shaders", () => {
		const game = {
			effects: {
				shaders: {
					bad: {
						filename: "bad.gdshader",
						glsl: "void main() { gl_FragColor = vec4(1.0); }",
					},
				},
			},
		} as unknown as GameDefinition;

		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];
		validateShaders(game, errors, warnings);

		expect(errors.length).toBeGreaterThan(0);
	});
});

describe("autoFixShader", () => {
	it("fixes TEXTURE_SIZE", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	vec2 size = TEXTURE_SIZE;
}`;
		const { fixed, changes } = autoFixShader(shader);
		expect(fixed).toContain("1.0 / TEXTURE_PIXEL_SIZE");
		expect(changes).toHaveLength(1);
	});

	it("fixes texture2D", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	COLOR = texture2D(tex, UV);
}`;
		const { fixed } = autoFixShader(shader);
		expect(fixed).toContain("texture(");
		expect(fixed).not.toContain("texture2D");
	});

	it("fixes multiple issues", () => {
		const shader = `shader_type canvas_item;
void fragment() {
	float t = iTime;
	vec2 res = iResolution;
	COLOR = vec4(1.0);
}`;
		const { fixed, changes } = autoFixShader(shader);
		expect(fixed).toContain("TIME");
		expect(fixed).toContain("SCREEN_PIXEL_SIZE");
		expect(changes).toHaveLength(2);
	});
});
