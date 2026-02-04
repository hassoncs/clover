/**
 * Configuration for a single registry.
 */
export interface RegistryConfig {
  /** Source directory to scan (relative to project root) */
  sourceDir: string;

  /** Glob pattern for files to include (relative to sourceDir) */
  include: string;

  /** Patterns to exclude (file names or globs) */
  exclude?: string[];

  /** Output file path (relative to project root) */
  output: string;

  /** Import alias to use in generated imports (e.g., '@/app/examples') */
  importAlias: string;

  /** URL prefix for href generation (e.g., '/examples') */
  urlPrefix?: string;

  /** Custom type imports to add at top of generated file */
  typeImports?: string;

  /**
   * Type names to use in generated code.
   * If not provided, derived from registry name:
   * - id: `${Name}Id`
   * - entry: `${Name}Entry`
   * - meta: `${Name}Meta`
   */
  types?: {
    id?: string;
    entry?: string;
    meta?: string;
  };
}

/**
 * Full reggie configuration.
 * Keys are registry names, values are their configs.
 */
export interface ReggieConfig {
  [registryName: string]: RegistryConfig;
}

/**
 * Parsed entry from a source file.
 */
export interface ParsedEntry {
  /** Unique identifier derived from file path */
  id: string;
  /** Full path to source file */
  filePath: string;
  /** Relative path from sourceDir (without extension) */
  relativePath: string;
  /** Generated import path using importAlias */
  importPath: string;
  /** Generated URL using urlPrefix */
  href: string;
  /** Extracted metadata object (or null if extraction failed) */
  metadata: Record<string, unknown> | null;
}

/**
 * Result of generating a registry.
 */
export interface GenerateResult {
  /** Registry name */
  name: string;
  /** Output file path */
  outputPath: string;
  /** Number of entries found */
  entryCount: number;
  /** Generated source code */
  code: string;
  /** SHA256 hash of source files (for staleness checking) */
  hash: string;
}

/**
 * Options for the generate function.
 */
export interface GenerateOptions {
  /** Project root directory (defaults to cwd) */
  rootDir?: string;
  /** Only check if files are stale, don't write */
  checkOnly?: boolean;
  /** Suppress console output */
  quiet?: boolean;
}

/**
 * Helper to define config with type checking.
 */
export function defineConfig(config: ReggieConfig): ReggieConfig {
  return config;
}
