import type { GameDefinition } from "../types/GameDefinition";
import type { ValidationError, ValidationWarning } from "./gameDefinitionTypes";

export interface ShaderLintIssue {
	code: string;
	message: string;
	severity: "critical" | "warning";
	line?: number;
	context?: string;
	suggestion?: string;
}

export interface ShaderLintResult {
	valid: boolean;
	issues: ShaderLintIssue[];
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

const GODOT_INCOMPATIBLE_PATTERNS: Array<{
	pattern: RegExp;
	code: string;
	severity: "critical" | "warning";
	message: string;
	suggestion: string;
}> = [
	// Godot 3 → Godot 4 migration
	{
		pattern: /\bTEXTURE_SIZE\b/g,
		code: "TEXTURE_SIZE",
		severity: "critical",
		message: "TEXTURE_SIZE does not exist in Godot 4",
		suggestion:
			"Use 1.0 / TEXTURE_PIXEL_SIZE for texture dimensions in UV space",
	},
	{
		pattern: /\bSCREEN_SIZE\b/g,
		code: "SCREEN_SIZE",
		severity: "critical",
		message: "SCREEN_SIZE does not exist in Godot 4",
		suggestion: "Use 1.0 / SCREEN_PIXEL_SIZE for screen dimensions in UV space",
	},

	// WebGL/GLSL ES 2.0 deprecated functions
	{
		pattern: /\btexture2D\s*\(/g,
		code: "texture2D()",
		severity: "critical",
		message: "texture2D() is GLSL ES 2.0 syntax, not supported in Godot 4",
		suggestion: "Use texture(sampler, uv) instead",
	},
	{
		pattern: /\btexture2DLod\s*\(/g,
		code: "texture2DLod()",
		severity: "critical",
		message: "texture2DLod() is GLSL ES 2.0 syntax",
		suggestion: "Use textureLod(sampler, uv, lod) instead",
	},
	{
		pattern: /\btextureCube\s*\(/g,
		code: "textureCube()",
		severity: "critical",
		message: "textureCube() is GLSL ES 2.0 syntax",
		suggestion: "Use texture(samplerCube, dir) instead",
	},

	// WebGL built-ins
	{
		pattern: /\bgl_FragColor\b/g,
		code: "gl_FragColor",
		severity: "critical",
		message: "gl_FragColor is WebGL/GLSL built-in, not Godot",
		suggestion: "Use COLOR = vec4(...) in fragment() function",
	},
	{
		pattern: /\bgl_FragCoord\b/g,
		code: "gl_FragCoord",
		severity: "critical",
		message: "gl_FragCoord is WebGL/GLSL built-in, not Godot",
		suggestion: "Use FRAGCOORD.xy for window-relative coordinates",
	},
	{
		pattern: /\bgl_Position\b/g,
		code: "gl_Position",
		severity: "critical",
		message: "gl_Position is WebGL/GLSL built-in, not Godot",
		suggestion: "Use VERTEX in vertex() function",
	},
	{
		pattern: /\bgl_VertexID\b/g,
		code: "gl_VertexID",
		severity: "critical",
		message: "gl_VertexID is WebGL/GLSL built-in, not Godot",
		suggestion: "Use VERTEX_ID in vertex() function",
	},

	// Shadertoy built-ins
	{
		pattern: /\biTime\b/g,
		code: "iTime",
		severity: "critical",
		message: "iTime is a Shadertoy uniform, not available in Godot",
		suggestion: "Use TIME (built-in) or declare uniform float time;",
	},
	{
		pattern: /\biResolution\b/g,
		code: "iResolution",
		severity: "critical",
		message: "iResolution is a Shadertoy uniform, not available in Godot",
		suggestion: "Use 1.0 / SCREEN_PIXEL_SIZE for screen dimensions",
	},
	{
		pattern: /\biMouse\b/g,
		code: "iMouse",
		severity: "warning",
		message: "iMouse is a Shadertoy uniform, not available in Godot",
		suggestion: "Handle mouse input via script and pass as uniform",
	},
	{
		pattern: /\biFrame\b/g,
		code: "iFrame",
		severity: "warning",
		message: "iFrame is a Shadertoy uniform, not available in Godot",
		suggestion: "Track frame count in script and pass as uniform",
	},
	{
		pattern: /\biDate\b/g,
		code: "iDate",
		severity: "warning",
		message: "iDate is a Shadertoy uniform, not available in Godot",
		suggestion: "Use script to pass date/time as uniform",
	},
	{
		pattern: /\bfragCoord\b/g,
		code: "fragCoord",
		severity: "critical",
		message: "fragCoord is Shadertoy syntax for pixel coordinates",
		suggestion: "Use FRAGCOORD.xy for window-relative pixel coordinates",
	},
	{
		pattern: /\bfragColor\b/g,
		code: "fragColor",
		severity: "critical",
		message: "fragColor is Shadertoy output variable",
		suggestion: "Use COLOR = vec4(...) in fragment() function",
	},

	// Common GLSL patterns that differ in Godot
	{
		pattern: /\bvoid\s+main\s*\(\s*\)\s*\{/g,
		code: "void main()",
		severity: "critical",
		message: "void main() is standard GLSL, not Godot shader syntax",
		suggestion: "Use void vertex() { ... } or void fragment() { ... }",
	},
	{
		pattern: /\buniform\s+sampler2D\s+\w+\s*;/g,
		code: "uniform sampler2D",
		severity: "warning",
		message: "sampler2D uniform may need Godot hints for proper behavior",
		suggestion: "Consider adding hints: uniform sampler2D tex : hint_albedo;",
	},

	// Precision qualifiers (Godot handles these automatically)
	{
		pattern: /\bprecision\s+(highp|mediump|lowp)\s+(float|int)\s*;/g,
		code: "precision qualifier",
		severity: "warning",
		message: "Precision qualifiers are handled automatically by Godot",
		suggestion: "Remove precision statement; Godot sets appropriate defaults",
	},
];

const REQUIRED_PATTERNS: Array<{
	pattern: RegExp;
	message: string;
}> = [
	{
		pattern: /\bshader_type\s+\w+\s*;/,
		message: "Shader must declare shader_type (e.g., shader_type canvas_item;)",
	},
];

function findLineNumber(
	source: string,
	_match: string,
	startIndex: number,
): number {
	return source.substring(0, startIndex).split("\n").length;
}

function extractContext(
	source: string,
	matchIndex: number,
	_matchLength: number,
): string {
	const lines = source.split("\n");
	let currentPos = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineStart = currentPos;
		const lineEnd = currentPos + lines[i].length;

		if (matchIndex >= lineStart && matchIndex <= lineEnd) {
			return lines[i].trim();
		}

		currentPos = lineEnd + 1; // +1 for newline
	}

	return "";
}

export function lintShaderSource(
	source: string,
	path: string = "shader",
): ShaderLintResult {
	const issues: ShaderLintIssue[] = [];
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	// Check for required patterns
	for (const { pattern, message } of REQUIRED_PATTERNS) {
		if (!pattern.test(source)) {
			issues.push({
				code: "MISSING_SHADER_TYPE",
				message,
				severity: "critical",
			});
			errors.push({
				code: "MISSING_SHADER_TYPE",
				message,
				path,
			});
		}
	}

	// Check for incompatible patterns
	for (const {
		pattern,
		code,
		severity,
		message,
		suggestion,
	} of GODOT_INCOMPATIBLE_PATTERNS) {
		const regex = new RegExp(pattern.source, pattern.flags);
		const matches = [...source.matchAll(regex)];

		for (const match of matches) {
			const line = findLineNumber(source, match[0], match.index!);
			const context = extractContext(source, match.index!, match[0].length);

			const issue: ShaderLintIssue = {
				code: `INCOMPATIBLE_${code.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`,
				message: `${message}. ${suggestion}`,
				severity,
				line,
				context,
				suggestion,
			};

			issues.push(issue);

			if (severity === "critical") {
				errors.push({
					code: issue.code,
					message: `${message} (line ${line}). ${suggestion}`,
					path: `${path}:${line}`,
				});
			} else {
				warnings.push({
					code: issue.code,
					message: `${message} (line ${line}). ${suggestion}`,
					path: `${path}:${line}`,
				});
			}
		}
	}

	return {
		valid: errors.length === 0,
		issues,
		errors,
		warnings,
	};
}

interface EffectGraphNode {
	id: string;
	params?: Record<string, unknown>;
}

interface EffectGraphWithNodes {
	nodes?: EffectGraphNode[];
}

function isEffectGraphWithNodes(value: unknown): value is EffectGraphWithNodes {
	return (
		typeof value === "object" &&
		value !== null &&
		("nodes" in value || !Object.keys(value).length)
	);
}

export function extractShaderSources(game: GameDefinition): Array<{
	id: string;
	source: string;
	path: string;
}> {
	const shaders: Array<{ id: string; source: string; path: string }> = [];

	if (game.effects?.graph && isEffectGraphWithNodes(game.effects.graph)) {
		const graph = game.effects.graph;
		if (graph.nodes) {
			for (const node of graph.nodes) {
				if (node.params?.shaderSource) {
					const shaderSource = node.params.shaderSource;
					let source: string | undefined;

					if (typeof shaderSource === "string") {
						source = shaderSource;
					} else if (
						typeof shaderSource === "object" &&
						shaderSource !== null &&
						"glsl" in shaderSource
					) {
						source = (shaderSource as { glsl: string }).glsl;
					}

					if (source) {
						shaders.push({
							id: node.id,
							source,
							path: `effects.graph.nodes.${node.id}.params.shaderSource`,
						});
					}
				}
			}
		}
	}

	if (game.effects?.shaders) {
		for (const [id, shader] of Object.entries(game.effects.shaders)) {
			if (shader.glsl) {
				shaders.push({
					id,
					source: shader.glsl,
					path: `effects.shaders.${id}.glsl`,
				});
			}
		}
	}

	return shaders;
}

export function validateShaders(
	game: GameDefinition,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	const shaders = extractShaderSources(game);

	for (const { source, path } of shaders) {
		const result = lintShaderSource(source, path);
		errors.push(...result.errors);
		warnings.push(...result.warnings);
	}
}

export function autoFixShader(source: string): {
	fixed: string;
	changes: Array<{ from: string; to: string; line: number }>;
} {
	let fixed = source;
	const changes: Array<{ from: string; to: string; line: number }> = [];

	const FIXES: Array<{ pattern: RegExp; replacement: string }> = [
		// Godot 3 → 4
		{ pattern: /\bTEXTURE_SIZE\b/g, replacement: "(1.0 / TEXTURE_PIXEL_SIZE)" },
		{ pattern: /\bSCREEN_SIZE\b/g, replacement: "(1.0 / SCREEN_PIXEL_SIZE)" },

		// GLSL ES 2.0 → modern
		{ pattern: /\btexture2D\s*\(/g, replacement: "texture(" },
		{ pattern: /\btexture2DLod\s*\(/g, replacement: "textureLod(" },
		{ pattern: /\btextureCube\s*\(/g, replacement: "texture(" },

		// Shadertoy → Godot
		{ pattern: /\biTime\b/g, replacement: "TIME" },
		{ pattern: /\biResolution\b/g, replacement: "(1.0 / SCREEN_PIXEL_SIZE)" },
		{ pattern: /\bfragCoord\b/g, replacement: "FRAGCOORD.xy" },
		{ pattern: /\bfragColor\b/g, replacement: "COLOR" },
		{ pattern: /\bgl_FragColor\b/g, replacement: "COLOR" },
		{ pattern: /\bgl_FragCoord\b/g, replacement: "FRAGCOORD" },
	];

	for (const { pattern, replacement } of FIXES) {
		const matches = [...source.matchAll(pattern)];
		for (const match of matches) {
			changes.push({
				from: match[0],
				to: replacement,
				line: findLineNumber(source, match[0], match.index!),
			});
		}
		fixed = fixed.replace(pattern, replacement);
	}

	return { fixed, changes };
}
