import type { PropertyWatchSpec, ActiveWatchConfig, PropertyPath, WatchScope } from './types';

export class WatchRegistry {
  private watches: Map<string, PropertyWatchSpec> = new Map();
  private activeConfig: ActiveWatchConfig = {
    frameProperties: new Set(),
    changeProperties: new Map(),
    entityWatches: new Map(),
    tagWatches: new Map(),
  };

  addWatch(spec: PropertyWatchSpec): void {
    const key = this.generateWatchKey(spec);
    
    if (this.watches.has(key)) {
      return;
    }

    this.watches.set(key, spec);
    this.updateActiveConfig(spec);
  }

  addWatches(specs: PropertyWatchSpec[]): void {
    for (const spec of specs) {
      this.addWatch(spec);
    }
  }

  removeWatch(spec: PropertyWatchSpec): void {
    const key = this.generateWatchKey(spec);
    this.watches.delete(key);
    this.rebuildActiveConfig();
  }

  clear(): void {
    this.watches.clear();
    this.activeConfig = {
      frameProperties: new Set(),
      changeProperties: new Map(),
      entityWatches: new Map(),
      tagWatches: new Map(),
    };
  }

  getActiveConfig(): ActiveWatchConfig {
    return this.activeConfig;
  }

  getAllWatches(): PropertyWatchSpec[] {
    return Array.from(this.watches.values());
  }

  getWatchesForProperty(property: PropertyPath): PropertyWatchSpec[] {
    return Array.from(this.watches.values()).filter(w => w.property === property);
  }

  getWatchesForScope(scope: WatchScope): PropertyWatchSpec[] {
    return Array.from(this.watches.values()).filter(w => 
      this.scopesMatch(w.scope, scope)
    );
  }

  private generateWatchKey(spec: PropertyWatchSpec): string {
    const scopeKey = this.serializeScope(spec.scope);
    return `${spec.property}:${scopeKey}:${spec.frequency}`;
  }

  private serializeScope(scope: WatchScope): string {
    switch (scope.type) {
      case 'all':
        return 'all';
      case 'self':
        return 'self';
      case 'by_tag':
        return `tag:${scope.tag}`;
      case 'by_id':
        return `id:${scope.entityId}`;
    }
  }

  private scopesMatch(a: WatchScope, b: WatchScope): boolean {
    if (a.type !== b.type) return false;
    
    switch (a.type) {
      case 'all':
      case 'self':
        return true;
      case 'by_tag':
        return b.type === 'by_tag' && a.tag === b.tag;
      case 'by_id':
        return b.type === 'by_id' && a.entityId === b.entityId;
    }
  }

  private updateActiveConfig(spec: PropertyWatchSpec): void {
    if (spec.frequency === 'frame' && spec.scope.type === 'all') {
      this.activeConfig.frameProperties.add(spec.property);
    }

    if (spec.frequency === 'change') {
      if (spec.scope.type === 'by_id') {
        const entityIds = this.activeConfig.changeProperties.get(spec.property) ?? new Set();
        entityIds.add(spec.scope.entityId);
        this.activeConfig.changeProperties.set(spec.property, entityIds);
      }
    }

    if (spec.scope.type === 'by_id') {
      const properties = this.activeConfig.entityWatches.get(spec.scope.entityId) ?? new Set();
      properties.add(spec.property);
      this.activeConfig.entityWatches.set(spec.scope.entityId, properties);
    }

    if (spec.scope.type === 'by_tag') {
      const properties = this.activeConfig.tagWatches.get(spec.scope.tag) ?? new Set();
      properties.add(spec.property);
      this.activeConfig.tagWatches.set(spec.scope.tag, properties);
    }
  }

  private rebuildActiveConfig(): void {
    this.activeConfig = {
      frameProperties: new Set(),
      changeProperties: new Map(),
      entityWatches: new Map(),
      tagWatches: new Map(),
    };

    for (const spec of this.watches.values()) {
      this.updateActiveConfig(spec);
    }
  }
}
