import type { z } from 'zod';
import type { RuleAction, RuleCondition, Behavior } from '../types';
import type { ExpressionValueType, EvalContext } from '../expressions/types';

export interface SystemVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface SystemManifest {
  id: string;
  version: SystemVersion;
}

export type ExpressionFunction = (
  args: ExpressionValueType[],
  ctx: EvalContext
) => ExpressionValueType;

/**
 * System execution phases (like Unity's script execution order).
 * Systems are executed in phase order, then by priority within each phase.
 */
export enum SystemPhase {
  PRE_UPDATE = 0,    // Setup, input buffering
  GAME_LOGIC = 1,    // Match3, Tetris core loops
  PHYSICS = 2,       // Physics simulation
  POST_PHYSICS = 3,  // Physics reactions
  VISUAL = 4,        // Particle systems, effects
  CLEANUP = 5        // Destruction, pooling
}

export interface GameSystemDefinition<
  TConfig = unknown,
  TState = unknown,
> {
  id: string;
  version: SystemVersion;
  
  /** Execution phase for this system (default: GAME_LOGIC) */
  executionPhase?: SystemPhase;
  /** Priority within phase - higher = executes first (default: 0) */
  priority?: number;
  
  configSchema?: z.ZodType<TConfig>;
  
  expressionFunctions?: Record<string, ExpressionFunction>;
  
  actionTypes?: string[];
  behaviorTypes?: string[];
  
  createState?: (config: TConfig) => TState;
  
  onGameLoad?: (config: TConfig, state: TState) => void;
  onGameUnload?: (state: TState) => void;
}

export interface SystemCompatibility {
  compatible: boolean;
  errors: string[];
}

export function parseVersion(versionString: string): SystemVersion {
  const parts = versionString.split('.').map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

export function formatVersion(version: SystemVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function isCompatibleVersion(
  required: SystemVersion,
  available: SystemVersion
): boolean {
  if (available.major !== required.major) {
    return false;
  }
  if (available.minor < required.minor) {
    return false;
  }
  return true;
}
