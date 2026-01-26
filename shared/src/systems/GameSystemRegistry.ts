import type {
  GameSystemDefinition,
  SystemManifest,
  SystemCompatibility,
  ExpressionFunction,
} from './types';
import { isCompatibleVersion, formatVersion, parseVersion, SystemPhase } from './types';

export class GameSystemRegistry {
  private systems = new Map<string, GameSystemDefinition>();
  private expressionFunctions = new Map<string, ExpressionFunction>();

  register<TConfig, TState>(system: GameSystemDefinition<TConfig, TState>): void {
    if (this.systems.has(system.id)) {
      const existing = this.systems.get(system.id)!;
      throw new Error(
        `System '${system.id}' already registered (version ${formatVersion(existing.version)})`
      );
    }

    this.systems.set(system.id, system as GameSystemDefinition);

    if (system.expressionFunctions) {
      for (const [name, fn] of Object.entries(system.expressionFunctions)) {
        const qualifiedName = `${system.id}.${name}`;
        this.expressionFunctions.set(qualifiedName, fn);
        this.expressionFunctions.set(name, fn);
      }
    }
  }

  unregister(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;

    if (system.expressionFunctions) {
      for (const name of Object.keys(system.expressionFunctions)) {
        this.expressionFunctions.delete(`${systemId}.${name}`);
        this.expressionFunctions.delete(name);
      }
    }

    this.systems.delete(systemId);
  }

  get(systemId: string): GameSystemDefinition | undefined {
    return this.systems.get(systemId);
  }

  has(systemId: string): boolean {
    return this.systems.has(systemId);
  }

  getAll(): GameSystemDefinition[] {
    return Array.from(this.systems.values());
  }

  /**
   * Returns systems grouped by execution phase, sorted by priority within each phase.
   * Higher priority systems execute first within their phase.
   */
  getSystemsByPhase(): Map<SystemPhase, GameSystemDefinition[]> {
    const byPhase = new Map<SystemPhase, GameSystemDefinition[]>();
    
    for (const phase of Object.values(SystemPhase)) {
      if (typeof phase === 'number') {
        byPhase.set(phase, []);
      }
    }
    
    for (const system of this.systems.values()) {
      const phase = system.executionPhase ?? SystemPhase.GAME_LOGIC;
      byPhase.get(phase)!.push(system);
    }
    
    for (const systems of byPhase.values()) {
      systems.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    
    return byPhase;
  }

  /**
   * Returns a flat array of systems in execution order (phase order, then priority).
   */
  getSystemsInExecutionOrder(): GameSystemDefinition[] {
    const result: GameSystemDefinition[] = [];
    const byPhase = this.getSystemsByPhase();
    
    const phases = Array.from(byPhase.keys()).sort((a, b) => a - b);
    for (const phase of phases) {
      result.push(...byPhase.get(phase)!);
    }
    
    return result;
  }

  getExpressionFunction(name: string): ExpressionFunction | undefined {
    return this.expressionFunctions.get(name);
  }

  getAllExpressionFunctions(): Map<string, ExpressionFunction> {
    return new Map(this.expressionFunctions);
  }

  validateManifest(manifests: Record<string, string>): SystemCompatibility {
    const errors: string[] = [];

    for (const [systemId, versionStr] of Object.entries(manifests)) {
      const system = this.systems.get(systemId);
      
      if (!system) {
        errors.push(`System '${systemId}' is required but not registered`);
        continue;
      }

      const requiredVersion = parseVersion(versionStr);
      if (!isCompatibleVersion(requiredVersion, system.version)) {
        errors.push(
          `System '${systemId}' version mismatch: requires ${versionStr}, ` +
          `but ${formatVersion(system.version)} is available`
        );
      }
    }

    return {
      compatible: errors.length === 0,
      errors,
    };
  }

  getManifest(): Record<string, string> {
    const manifest: Record<string, string> = {};
    for (const [id, system] of this.systems) {
      manifest[id] = formatVersion(system.version);
    }
    return manifest;
  }
}

let globalRegistry: GameSystemRegistry | null = null;

export function getGlobalSystemRegistry(): GameSystemRegistry {
  if (!globalRegistry) {
    globalRegistry = new GameSystemRegistry();
  }
  return globalRegistry;
}

export function resetGlobalSystemRegistry(): void {
  globalRegistry = null;
}
