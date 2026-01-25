import type { PropertySyncPayload, EntityPropertySnapshot, PropertyPath, PropertyValue } from './types';
import { TypeCoercion } from './TypeCoercion';
import { PropertyRegistry } from './PropertyRegistry';

export class PropertyCache {
  private currentFrame: number = 0;
  private timestamp: number = 0;
  private snapshots: Map<string, EntityPropertySnapshot> = new Map();
  private validationEnabled: boolean;

  constructor(validationEnabled: boolean = false) {
    this.validationEnabled = validationEnabled;
  }

  update(payload: PropertySyncPayload): void {
    this.currentFrame = payload.frameId;
    this.timestamp = payload.timestamp;

    for (const [entityId, snapshot] of Object.entries(payload.entities)) {
      const coercedSnapshot: EntityPropertySnapshot = {};
      
      for (const [property, value] of Object.entries(snapshot)) {
        const knownMetadata = PropertyRegistry.getMetadata(property as PropertyPath);
        
        const metadata = knownMetadata ?? {
          scope: 'entity' as const,
          source: 'game' as const,
          frequency: 'change' as const,
          type: TypeCoercion.inferType(value),
        };
        
        const coercedValue = TypeCoercion.coerceToExpectedType(value, metadata);
        
        if (this.validationEnabled) {
          const validation = TypeCoercion.validate(coercedValue, metadata);
          if (!validation.valid) {
            console.warn(
              `[PropertyCache] Type validation failed for ${entityId}.${property}: ${validation.error}`,
              { value, coercedValue, expectedType: metadata.type }
            );
          }
        }
        
        coercedSnapshot[property] = coercedValue;
      }
      
      this.snapshots.set(entityId, coercedSnapshot);
    }
  }

  get(entityId: string, property: PropertyPath): PropertyValue {
    const snapshot = this.snapshots.get(entityId);
    if (!snapshot) return undefined;
    return snapshot[property];
  }

  set(entityId: string, property: PropertyPath, value: PropertyValue): void {
    let snapshot = this.snapshots.get(entityId);
    
    if (!snapshot) {
      snapshot = {};
      this.snapshots.set(entityId, snapshot);
    }

    snapshot[property] = value;
  }

  getSnapshot(entityId: string): EntityPropertySnapshot | undefined {
    const snapshot = this.snapshots.get(entityId);
    if (!snapshot) return undefined;
    return { ...snapshot };
  }

  setSnapshot(entityId: string, snapshot: EntityPropertySnapshot): void {
    this.snapshots.set(entityId, { ...snapshot });
  }

  has(entityId: string): boolean {
    return this.snapshots.has(entityId);
  }

  delete(entityId: string): void {
    this.snapshots.delete(entityId);
  }

  clear(): void {
    this.snapshots.clear();
    this.currentFrame = 0;
    this.timestamp = 0;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTimestamp(): number {
    return this.timestamp;
  }

  getAllEntityIds(): string[] {
    return Array.from(this.snapshots.keys());
  }

  getSize(): number {
    return this.snapshots.size;
  }
}
