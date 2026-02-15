export type { AuthoringOptions, AuthoringResult } from "./authoring";
export { authorGraph } from "./authoring";
export type {
	BudgetCheckResult,
	BudgetMetrics,
	BudgetViolation,
	BudgetViolationCode,
	PerformanceMetrics,
} from "./budget";
export { BUDGET_TIER_PRESETS, checkBudget, PerformanceHarness } from "./budget";
export type {
	CatalogAPI,
	CatalogListQuery,
	CatalogListResult,
	CatalogSearchQuery,
	CreateDraftInput,
	ModerationStatus,
	ModerationTransition,
	PackageFetchPolicy,
	PackageFetchResult,
	PublishInput,
	R2PathResolver,
	SeedEntry,
	ShaderPackageSummary,
	UpdateDraftInput,
} from "./catalog-api";
export {
	createR2PathResolver,
	isValidModerationTransition,
	seedBuiltInNodes,
	VALID_MODERATION_TRANSITIONS,
} from "./catalog-api";
export type {
	CompileError,
	CompileResult,
	CompilerOptions,
	OrderingConstraints,
} from "./compiler";
export { compileGraph, wrapShadersAsPlan } from "./compiler";
export type {
	GraphValidationError,
	GraphValidationErrorCode,
	GraphValidationResult,
} from "./errors";
export type { FeedbackBufferState } from "./feedback";
export { FeedbackManager } from "./feedback";
export type { EffectCategory, EffectMetadata } from "./metadata";
export { EFFECT_METADATA } from "./metadata";
export type {
	NormalizationError,
	NormalizationErrorCode,
	NormalizationResult,
} from "./normalizer";
export { normalizeAIOutput } from "./normalizer";
export type {
	CompatibilityError,
	CompatibilityResult,
	LicenseType,
	PackageProvenance,
	PackageStatus,
	ShaderPackage,
	ShaderPackageVersion,
	SourceType,
} from "./package";
export { ShaderPackageManager } from "./package";
export type {
	NodeTypeRegistration,
	PackageManifest as EffectPackageManifest,
	ParamSummary,
	SearchQuery,
	SearchResult,
} from "./registry";
export { ManifestRegistry } from "./registry";
export type {
	ResourceBinding,
	ResourceGraph,
	ResourceKind,
	ResourceNode,
	ResourceResolutionError,
	ResourceResolutionErrorCode,
	ResourceResolutionResult,
	ScopeTarget,
} from "./resources";
export {
	areFormatsCompatible,
	areResolutionsCompatible,
	buildResourceGraph,
	resolveEffectiveResolution,
} from "./resources";
export { getBuiltInSeeds, registerBuiltInSeeds } from "./seeds/index";
export {
	needsScreenTextureRewrite,
	rewriteScreenShaderForSubViewport,
} from "./shaderRewrite";
export type {
	EffectsSnapshot,
	FeedbackSnapshotState,
	RestoreResult,
	SnapshotCompatibility,
	SnapshotCompatibilityError,
	SnapshotCompatibilityErrorCode,
} from "./snapshot";
export { SnapshotManager } from "./snapshot";
// Text Effects
export * from "./text/index";
export type {
	BudgetTierPolicy,
	BufferFormat,
	CompiledPass,
	CompiledPlan,
	Connection,
	EffectGraphSpec,
	EffectNode,
	EffectParamSchema,
	EffectType,
	FeedbackEdge,
	FeedbackPolicy,
	FusibilityFlag,
	InputSlot,
	NodeFamily,
	OutputTarget,
	ParamValue,
	PersistenceMode,
	PlatformTier,
	QualityTier,
	ResolutionMode,
	ResourceRef,
	ShaderSource,
	UniformDeclaration,
} from "./types";
export type { ValidatorOptions } from "./validator";
export { validateGraph } from "./validator";
