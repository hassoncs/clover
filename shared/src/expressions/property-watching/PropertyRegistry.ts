import type { PropertyPath, PropertyMetadata } from './types';

const PROPERTY_REGISTRY: Record<PropertyPath, PropertyMetadata> = {
  // Transform properties (always synced for all entities)
  'transform.x': {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },
  'transform.y': {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },
  'transform.angle': {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },

  // Velocity properties (synced on-demand when watched)
  'velocity.x': {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },
  'velocity.y': {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },
  angularVelocity: {
    scope: 'entity',
    source: 'physics',
    frequency: 'frame',
    type: 'number',
  },

  // Health system properties
  health: {
    scope: 'entity',
    source: 'game',
    frequency: 'change',
    type: 'number',
  },
  maxHealth: {
    scope: 'entity',
    source: 'game',
    frequency: 'static',
    type: 'number',
  },

  // Game state properties (global scope)
  score: {
    scope: 'global',
    source: 'game',
    frequency: 'change',
    type: 'number',
  },
  lives: {
    scope: 'global',
    source: 'game',
    frequency: 'change',
    type: 'number',
  },
  time: {
    scope: 'global',
    source: 'game',
    frequency: 'frame',
    type: 'number',
  },
  wave: {
    scope: 'global',
    source: 'game',
    frequency: 'change',
    type: 'number',
  },
  frameId: {
    scope: 'global',
    source: 'game',
    frequency: 'frame',
    type: 'number',
  },
  dt: {
    scope: 'global',
    source: 'game',
    frequency: 'frame',
    type: 'number',
  },
};

export class PropertyRegistry {
  static getMetadata(property: PropertyPath): PropertyMetadata | undefined {
    return PROPERTY_REGISTRY[property];
  }

  static isKnownProperty(property: PropertyPath): boolean {
    return property in PROPERTY_REGISTRY;
  }

  static getAllProperties(): PropertyPath[] {
    return Object.keys(PROPERTY_REGISTRY);
  }

  static getPropertiesByScope(scope: PropertyMetadata['scope']): PropertyPath[] {
    return Object.entries(PROPERTY_REGISTRY)
      .filter(([, meta]) => meta.scope === scope)
      .map(([path]) => path);
  }

  static getPropertiesBySource(source: PropertyMetadata['source']): PropertyPath[] {
    return Object.entries(PROPERTY_REGISTRY)
      .filter(([, meta]) => meta.source === source)
      .map(([path]) => path);
  }

  static getPropertiesByFrequency(frequency: PropertyMetadata['frequency']): PropertyPath[] {
    return Object.entries(PROPERTY_REGISTRY)
      .filter(([, meta]) => meta.frequency === frequency)
      .map(([path]) => path);
  }

  static registerCustomProperty(
    path: PropertyPath,
    metadata: PropertyMetadata
  ): void {
    if (PROPERTY_REGISTRY[path]) {
      throw new Error(`Property ${path} is already registered`);
    }
    PROPERTY_REGISTRY[path] = metadata;
  }

  static getMetadataOrInfer(property: PropertyPath): PropertyMetadata {
    const known = PROPERTY_REGISTRY[property];
    if (known) return known;

    const inferredMetadata = this.inferMetadata(property);
    return inferredMetadata;
  }

  private static inferMetadata(property: PropertyPath): PropertyMetadata {
    if (property.startsWith('transform.')) {
      return { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' };
    }
    if (property.startsWith('velocity.')) {
      return { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' };
    }
    if (property.startsWith('entities_with_tag.')) {
      return { scope: 'aggregate', source: 'game', frequency: 'change', type: 'number' };
    }
    if (['score', 'lives', 'wave', 'time', 'frameId', 'dt'].includes(property)) {
      return { scope: 'global', source: 'game', frequency: 'change', type: 'number' };
    }

    return { scope: 'entity', source: 'game', frequency: 'change', type: 'number' };
  }
}
