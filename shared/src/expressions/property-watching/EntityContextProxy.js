export class EntityContextProxy {
    cache;
    entityId;
    constructor(cache, entityId) {
        this.cache = cache;
        this.entityId = entityId;
    }
    get(property) {
        return this.cache.get(this.entityId, property);
    }
    set(property, value) {
        this.cache.set(this.entityId, property, value);
    }
    toObject() {
        const snapshot = this.cache.getSnapshot(this.entityId);
        return snapshot ?? {};
    }
    static createEntityContext(cache, entityId) {
        const proxy = new EntityContextProxy(cache, entityId);
        const snapshot = cache.getSnapshot(entityId) ?? {};
        function createNestedProxy(basePath) {
            return new Proxy({}, {
                get(target, prop) {
                    const fullPath = basePath ? `${basePath}.${prop}` : prop;
                    const value = proxy.get(fullPath);
                    if (value !== undefined && value !== null && typeof value === 'object') {
                        return createNestedProxy(fullPath);
                    }
                    return value;
                },
            });
        }
        return new Proxy(snapshot, {
            get(target, prop) {
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
                const directValue = proxy.get(prop);
                if (directValue !== undefined) {
                    return directValue;
                }
                const nestedValue = createNestedProxy(prop);
                if (Object.keys(nestedValue).length > 0) {
                    return nestedValue;
                }
                return target[prop];
            },
            set(target, prop, value) {
                if (prop === 'transform' || prop === 'velocity') {
                    return false;
                }
                target[prop] = value;
                return true;
            },
        });
    }
}
//# sourceMappingURL=EntityContextProxy.js.map