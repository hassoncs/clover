/**
 * Property Watching System - Type Definitions
 *
 * Dual Purpose:
 * 1. Property Sync: Identify which entity properties need syncing from Godot
 * 2. Game Validation: Detect errors in AI-generated game definitions
 */
import type { Vec2 } from '../types';
/**
 * Dot-notation path to an entity property
 * Examples: "transform.x", "velocity.y", "health", "angularVelocity"
 */
export type PropertyPath = string;
/**
 * Category of property based on update source
 */
export type PropertySource = 'physics' | 'game' | 'hybrid';
/**
 * How often property needs to be synced
 */
export type SyncFrequency = 'frame' | 'change' | 'demand' | 'static';
/**
 * Metadata about a property type
 */
export interface PropertyMetadata {
    scope: 'entity' | 'aggregate' | 'global';
    source: PropertySource;
    frequency: SyncFrequency;
    type: 'number' | 'string' | 'boolean' | 'vec2' | 'entity' | 'entity[]';
}
/**
 * Defines which entities to watch a property for
 */
export type WatchScope = {
    type: 'all';
} | {
    type: 'by_tag';
    tag: string;
} | {
    type: 'by_id';
    entityId: string;
} | {
    type: 'self';
};
/**
 * Specification for a property to watch
 */
export interface PropertyWatchSpec {
    /** Property to watch (dot-notation path) */
    property: PropertyPath;
    /** Who to watch it for */
    scope: WatchScope;
    /** How often to sync */
    frequency: SyncFrequency;
    /** Debug name for tracing (e.g., "MoveBehavior.speed expression") */
    debugName?: string;
}
/**
 * Optimized watch configuration sent to Godot
 */
export interface ActiveWatchConfig {
    /** Properties to sync for all entities every frame */
    frameProperties: Set<PropertyPath>;
    /** Properties to sync on change (event-driven) */
    changeProperties: Map<PropertyPath, Set<string>>;
    /** Properties synced for specific entities */
    entityWatches: Map<string, Set<PropertyPath>>;
    /** Tag-based watches: all entities with tag need these properties */
    tagWatches: Map<string, Set<PropertyPath>>;
}
/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';
/**
 * Error codes for validation failures
 */
export type ValidationErrorCode = 'MISSING_PROPERTY' | 'UNDEFINED_TAG' | 'TYPE_MISMATCH' | 'PHYSICS_MISMATCH' | 'CIRCULAR_DEP' | 'UNREACHABLE' | 'PERF_CONCERN' | 'UNKNOWN_BEHAVIOR' | 'UNKNOWN_PROPERTY' | 'INVALID_EXPRESSION';
/**
 * Location of a validation issue in the game definition
 */
export interface ValidationLocation {
    file?: string;
    entity?: string;
    behavior?: string;
    behaviorType?: string;
    rule?: string;
    expression?: string;
    line?: number;
    column?: number;
}
/**
 * A validation error or warning
 */
export interface ValidationIssue {
    severity: ValidationSeverity;
    code: ValidationErrorCode;
    message: string;
    location: ValidationLocation;
    suggestion?: string;
}
/**
 * Statistics about the analyzed game
 */
export interface ValidationStats {
    totalExpressions: number;
    totalBehaviors: number;
    totalRules: number;
    totalEntities: number;
    propertiesWatched: PropertyPath[];
    entitiesAffected: number;
    estimatedBandwidth: string;
    estimatedCPU: string;
}
/**
 * Dependency information for an entity
 */
export interface EntityDependencies {
    needs: PropertyPath[];
    behaviors: string[];
    usedByRules: string[];
}
/**
 * Complete dependency graph
 */
export type DependencyGraph = Record<string, EntityDependencies>;
/**
 * Complete validation report
 */
export interface ValidationReport {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    stats: ValidationStats;
    dependencyGraph: DependencyGraph;
    timestamp: number;
}
/**
 * Possible property value types
 */
export type PropertyValue = number | string | boolean | Vec2 | undefined;
/**
 * Snapshot of an entity's properties at a specific frame
 */
export interface EntityPropertySnapshot {
    'transform.x'?: number;
    'transform.y'?: number;
    'transform.angle'?: number;
    'velocity.x'?: number;
    'velocity.y'?: number;
    'angularVelocity'?: number;
    'health'?: number;
    'maxHealth'?: number;
    [key: string]: PropertyValue;
}
/**
 * Property sync payload from Godot
 */
export interface PropertySyncPayload {
    frameId: number;
    timestamp: number;
    entities: Record<string, EntityPropertySnapshot>;
}
/**
 * Compact payload format for efficient transfer
 * (used for optimization in Phase 3)
 */
export interface CompactPropertySyncPayload {
    f: number;
    t: number;
    m: PropertyPath[];
    e: Record<string, number[]>;
}
/**
 * Context information for dependency analysis
 */
export interface AnalysisContext {
    /** Is this expression evaluated per-entity (has `self` context)? */
    hasSelfContext: boolean;
    /** Entity tags in this context (for tag-based watches) */
    contextTags?: string[];
    /** Debug name for error messages */
    debugName: string;
    /** Entity ID if analyzing a specific entity */
    entityId?: string;
    /** Behavior type if analyzing a behavior */
    behaviorType?: string;
    /** Rule ID if analyzing a rule */
    ruleId?: string;
}
//# sourceMappingURL=types.d.ts.map