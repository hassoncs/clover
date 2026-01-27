import type { PropertyCache } from './PropertyCache';
import type { PropertyPath, PropertyValue } from './types';

export class EntityContextProxy {
  private cache: PropertyCache;
  private entityId: string;

  constructor(cache: PropertyCache, entityId: string) {
    this.cache = cache;
    this.entityId = entityId;
  }

  get(property: PropertyPath): PropertyValue {
    return this.cache.get(this.entityId, property);
  }

  set(property: PropertyPath, value: PropertyValue): void {
    this.cache.set(this.entityId, property, value);
  }

  toObject(): Record<string, PropertyValue> {
    const snapshot = this.cache.getSnapshot(this.entityId);
    return snapshot ?? {};
  }

  static createEntityContext(cache: PropertyCache, entityId: string): Record<string, unknown> {
    const proxy = new EntityContextProxy(cache, entityId);
    const snapshot = cache.getSnapshot(entityId) ?? {};

    function createNestedProxy(basePath: string): Record<string, unknown> {
      return new Proxy({}, {
        get(target, prop: string) {
          const fullPath = basePath ? `${basePath}.${prop}` : prop;
          const value = proxy.get(fullPath as PropertyPath);
          
          if (value !== undefined && value !== null && typeof value === 'object') {
            return createNestedProxy(fullPath);
          }
          
          return value;
        },
      });
    }

    return new Proxy(snapshot, {
      get(target, prop: string) {
        if (prop === 'id') {
          return entityId;
        }

        if (prop === 'transform') {
          return {
            get x() { return proxy.get('transform.x'); },
            get y() { return proxy.get('transform.y'); },
            get angle() { return proxy.get('transform.angle'); },
          };
        }

        if (prop === 'velocity') {
          return {
            get x() { return proxy.get('velocity.x') ?? 0; },
            get y() { return proxy.get('velocity.y') ?? 0; },
          };
        }

        if (prop === 'angularVelocity') {
          return proxy.get('angularVelocity') ?? 0;
        }

        const directValue = proxy.get(prop as PropertyPath);
        if (directValue !== undefined) {
          return directValue;
        }

        const nestedValue = createNestedProxy(prop);
        if (Object.keys(nestedValue).length > 0) {
          return nestedValue;
        }

        return target[prop];
      },

      set(target, prop: string, value: unknown) {
        if (prop === 'transform' || prop === 'velocity') {
          return false;
        }

        target[prop] = value as PropertyValue;
        return true;
      },
    });
  }
}
