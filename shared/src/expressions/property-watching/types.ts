/**
 * Property Watching System - Type Definitions
 * 
 * Dual Purpose:
 * 1. Property Sync: Identify which entity properties need syncing from Godot
 * 2. Game Validation: Detect errors in AI-generated game definitions
 */

import type { Vec2 } from '../types';

// ============================================================================
// PROPERTY PATHS
// ============================================================================

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

// ============================================================================
// WATCH SPECIFICATIONS
// ============================================================================

/**
 * Defines which entities to watch a property for
 */
export type WatchScope =
  | { type: 'all' }                          // All entities
  | { type: 'by_tag'; tag: string }          // Entities with specific tag
  | { type: 'by_id'; entityId: string }      // Specific entity
  | { type: 'self' };                        // Context entity (resolved at runtime)

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

// ============================================================================
// ACTIVE WATCH CONFIGURATION
// ============================================================================

/**
 * Optimized watch configuration sent to Godot
 */
export interface ActiveWatchConfig {
  /** Properties to sync for all entities every frame */
  frameProperties: Set<PropertyPath>;
  
  /** Properties to sync on change (event-driven) */
  changeProperties: Map<PropertyPath, Set<string>>; // property -> Set(entityIds)
  
  /** Properties synced for specific entities */
  entityWatches: Map<string, Set<PropertyPath>>; // entityId -> Set(properties)
  
  /** Tag-based watches: all entities with tag need these properties */
  tagWatches: Map<string, Set<PropertyPath>>; // tag -> Set(properties)
}

// ============================================================================
// VALIDATION REPORT
// ============================================================================

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Error codes for validation failures
 */
export type ValidationErrorCode =
  | 'MISSING_PROPERTY'     // Property doesn't exist on entity
  | 'UNDEFINED_TAG'        // Referenced tag not used by any entity
  | 'TYPE_MISMATCH'        // Expression type doesn't match usage
  | 'PHYSICS_MISMATCH'     // Behavior incompatible with physics config
  | 'CIRCULAR_DEP'         // Circular dependency detected
  | 'UNREACHABLE'          // Code that can never execute
  | 'PERF_CONCERN'         // Performance issue detected
  | 'UNKNOWN_BEHAVIOR'     // Behavior type not recognized
  | 'UNKNOWN_PROPERTY'     // Property not in registry
  | 'INVALID_EXPRESSION';  // Expression syntax error

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
  estimatedBandwidth: string; // "2.4 KB/frame"
  estimatedCPU: string; // "0.5 ms/frame"
}

/**
 * Dependency information for an entity
 */
export interface EntityDependencies {
  needs: PropertyPath[]; // Properties this entity needs synced
  behaviors: string[]; // Behavior types that need these properties
  usedByRules: string[]; // Rule IDs that reference this entity
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

// ============================================================================
// PROPERTY CACHE
// ============================================================================

/**
 * Possible property value types
 */
export type PropertyValue = number | string | boolean | Vec2 | undefined;

/**
 * Snapshot of an entity's properties at a specific frame
 */
export interface EntityPropertySnapshot {
  // Transform properties (always synced)
  'transform.x'?: number;
  'transform.y'?: number;
  'transform.angle'?: number;
  
  // Velocity properties (synced if watched)
  'velocity.x'?: number;
  'velocity.y'?: number;
  'angularVelocity'?: number;
  
  // Custom properties (synced if watched)
  'health'?: number;
  'maxHealth'?: number;
  
  // Extensible for future properties
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
  f: number; // frameId
  t: number; // timestamp
  m: PropertyPath[]; // property map (defines array indices)
  e: Record<string, number[]>; // entityId -> flat array of values
}

// ============================================================================
// ANALYSIS CONTEXT
// ============================================================================

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
