import type { GameDefinition } from '../types/GameDefinition';

/**
 * Reference to a constant defined in the bundle's constants.json.
 * Used in bundle format to reference values by name instead of hardcoding.
 * Example: { const: "GRAVITY" } resolves to the value of constants.GRAVITY
 */
export interface ConstantRef {
  const: string;
}

/**
 * Check if a value is a constant reference
 */
export function isConstantRef(value: unknown): value is ConstantRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'const' in value &&
    typeof (value as ConstantRef).const === 'string'
  );
}

/**
 * Error codes for compile errors
 */
export type CompileErrorCode =
  | 'UNKNOWN_CONSTANT'
  | 'UNKNOWN_ASSET'
  | 'UNKNOWN_TEMPLATE'
  | 'DUPLICATE_ID'
  | 'INVALID_JSON'
  | 'MISSING_FILE'
  | 'CONSTANT_CYCLE'
  | 'INVALID_BUNDLE_STRUCTURE'
  | 'INVALID_MANIFEST'
  | 'SCHEMA_VALIDATION_FAILED';

/**
 * Warning codes for compile warnings
 */
export type CompileWarningCode =
  | 'UNUSED_CONSTANT'
  | 'UNUSED_ASSET'
  | 'MISSING_OPTIONAL_FILE'
  | 'EDITOR_CONSTANT_MISMATCH';

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
  constants?: Record<string, {
    label?: string;
    category?: string;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
  }>;
}

/**
 * Raw bundle data before compilation
 */
export interface RawBundleData {
  manifest: Record<string, unknown> | null;
  constants: Record<string, number | string | boolean> | null;
  editor: EditorMetadata | null;
  assets: Record<string, {
    path: string;
    type: string;
  }> | null;
  templates: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
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
