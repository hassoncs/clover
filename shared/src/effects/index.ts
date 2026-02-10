export type {
  NodeFamily,
  BufferFormat,
  ResolutionMode,
  FusibilityFlag,
  InputSlot,
  OutputTarget,
  ParamValue,
  EffectParamSchema,
  EffectNode,
  Connection,
  FeedbackEdge,
  FeedbackPolicy,
  EffectGraphSpec,
  ResourceRef,
  CompiledPass,
  CompiledPlan,
  ShaderSource,
  UniformDeclaration,
  QualityTier,
  PersistenceMode,
  PlatformTier,
  BudgetTierPolicy,
  EffectType,
} from './types';

export type { EffectCategory, EffectMetadata } from './metadata';
export { EFFECT_METADATA } from './metadata';

export type {
  ParamSummary,
  PackageManifest,
  NodeTypeRegistration,
  SearchQuery,
  SearchResult,
} from './registry';
export { ManifestRegistry } from './registry';

export type {
  GraphValidationErrorCode,
  GraphValidationError,
  GraphValidationResult,
} from './errors';

export type { ValidatorOptions } from './validator';
export { validateGraph } from './validator';

export type {
  ScopeTarget,
  ResourceKind,
  ResourceNode,
  ResourceBinding,
  ResourceGraph,
  ResourceResolutionErrorCode,
  ResourceResolutionError,
  ResourceResolutionResult,
} from './resources';
export {
  areFormatsCompatible,
  areResolutionsCompatible,
  resolveEffectiveResolution,
  buildResourceGraph,
} from './resources';

export type { FeedbackBufferState } from './feedback';
export { FeedbackManager } from './feedback';

export type {
  OrderingConstraints,
  CompilerOptions,
  CompileError,
  CompileResult,
} from './compiler';
export { compileGraph } from './compiler';

export type {
  FeedbackSnapshotState,
  EffectsSnapshot,
  SnapshotCompatibilityErrorCode,
  SnapshotCompatibilityError,
  SnapshotCompatibility,
  RestoreResult,
} from './snapshot';
export { SnapshotManager } from './snapshot';

export type {
  BudgetViolationCode,
  BudgetViolation,
  BudgetMetrics,
  BudgetCheckResult,
  PerformanceMetrics,
} from './budget';
export { checkBudget, PerformanceHarness, BUDGET_TIER_PRESETS } from './budget';

export type {
  PackageStatus,
  SourceType,
  LicenseType,
  ShaderPackage,
  ShaderPackageVersion,
  PackageProvenance,
  CompatibilityResult,
  CompatibilityError,
} from './package';
export { ShaderPackageManager } from './package';

export type {
  NormalizationErrorCode,
  NormalizationError,
  NormalizationResult,
} from './normalizer';
export { normalizeAIOutput } from './normalizer';

export type { AuthoringOptions, AuthoringResult } from './authoring';
export { authorGraph } from './authoring';

export type {
  ModerationStatus,
  ModerationTransition,
  CatalogListQuery,
  CatalogSearchQuery,
  CatalogListResult,
  ShaderPackageSummary,
  R2PathResolver,
  PackageFetchPolicy,
  PackageFetchResult,
  CatalogAPI,
  CreateDraftInput,
  UpdateDraftInput,
  PublishInput,
  SeedEntry,
} from './catalog-api';
export {
  VALID_MODERATION_TRANSITIONS,
  isValidModerationTransition,
  createR2PathResolver,
  seedBuiltInNodes,
} from './catalog-api';

export { getBuiltInSeeds, registerBuiltInSeeds } from './seeds/index';

export { SHADER_LIBRARY, getShaderGlsl, getShaderGlslStrict, getAvailableShaderKeys } from './shaderLibrary';

export type { ShaderCategory, ShaderLibraryEntry } from './shaderRegistry';
export {
  SHADER_REGISTRY,
  getShaderEntry,
  listShadersByCategory,
  searchShaders,
  getCombinableShaders,
  getAllShaderCategories,
  getShaderCount,
} from './shaderRegistry';
