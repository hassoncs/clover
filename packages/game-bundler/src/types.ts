import type { GameDefinition } from "@slopcade/shared";

/**
 * Reference to a constant defined in the bundle's constants.json.
 * Used in bundle format to reference values by name instead of hardcoding.
 * Example: { const: "GRAVITY" } resolves to the value of constants.GRAVITY
 */
export interface ConstantRef {
	const: string;
}

export interface AssetReference {
	id: string;
	type: "image" | "sound";
	remoteUrl?: string;
	localPath?: string;
}

/**
 * Check if a value is a constant reference
 */
export function isConstantRef(value: unknown): value is ConstantRef {
	return (
		typeof value === "object" &&
		value !== null &&
		"const" in value &&
		typeof (value as ConstantRef).const === "string"
	);
}

/**
 * Error codes for compile errors
 */
export type CompileErrorCode =
	| "UNKNOWN_CONSTANT"
	| "UNKNOWN_ASSET"
	| "UNKNOWN_TEMPLATE"
	| "DUPLICATE_ID"
	| "INVALID_JSON"
	| "MISSING_FILE"
	| "CONSTANT_CYCLE"
	| "INVALID_BUNDLE_STRUCTURE"
	| "INVALID_MANIFEST"
	| "SCHEMA_VALIDATION_FAILED"
	| "INVALID_SCRIPT"
	| "SCRIPT_SYNTAX_ERROR"
	| "MISSING_LOCAL_ASSET"
	| "INVALID_ASSET_REFERENCE";

/**
 * Warning codes for compile warnings
 */
export type CompileWarningCode =
	| "UNUSED_CONSTANT"
	| "UNUSED_ASSET"
	| "MISSING_OPTIONAL_FILE"
	| "EDITOR_CONSTANT_MISMATCH"
	| "DUPLICATE_EXPORT"
	| "NESTED_SCRIPTS_IGNORED";

/**
 * Structured compile error with AI-actionable details
 */
export interface CompileError {
	code: CompileErrorCode;
	message: string;
	file?: string;
	path?: string;
	context?: Record<string, unknown>;
	suggestions?: string[];
}

/**
 * Structured compile warning
 */
export interface CompileWarning {
	code: CompileWarningCode;
	message: string;
	file?: string;
	path?: string;
	context?: Record<string, unknown>;
}

/**
 * Editor metadata extracted from editor.json
 */
export interface EditorMetadata {
	constants?: Record<
		string,
		{
			label?: string;
			category?: string;
			min?: number;
			max?: number;
			step?: number;
			description?: string;
		}
	>;
}

/**
 * Raw bundle data before compilation
 */
export interface RawBundleData {
	manifest: Record<string, unknown> | null;
	constants: Record<string, number | string | boolean> | null;
	editor: EditorMetadata | null;
	assets: Record<
		string,
		{
			path?: string;
			remoteUrl?: string;
			localPath?: string;
			type: string;
		}
	> | null;
	scripts: Record<string, string> | null;
	effects: GameDefinition["effects"] | null;
	templates: Array<Record<string, unknown>>;
	entities: Array<Record<string, unknown>>;
	schemas?: {
		level?: object;
		persistence?: object;
	};
}

/**
 * Result of compiling a bundle
 */
export interface BundleCompileResult {
	success: boolean;
	gameDefinition: GameDefinition | null;
	editorMetadata: EditorMetadata | null;
	errors: CompileError[];
	warnings: CompileWarning[];
	/** Raw data for debugging/incremental compilation */
	rawData: RawBundleData;
	/** Files that were processed */
	processedFiles: string[];
}

/**
 * Sections of a game definition for modular loading
 */
export interface BundleSections {
	world: GameDefinition["world"];
	prefabs: GameDefinition["prefabs"];
	entities: GameDefinition["entities"];
	script?: string;
	effects?: GameDefinition["effects"];
	systems?: {
		match3?: GameDefinition["match3"];
		tetris?: GameDefinition["tetris"];
	};
}

/**
 * Sectioned bundle format for modular bridge protocol
 */
export interface SectionedBundle {
	version: string;
	contentHash: string;
	sections: BundleSections;
}

/**
 * Result of compiling a sectioned bundle
 */
export interface SectionedCompileResult {
	success: boolean;
	bundle: SectionedBundle | null;
	errors: CompileError[];
	warnings: CompileWarning[];
}
