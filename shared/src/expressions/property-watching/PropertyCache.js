import { TypeCoercion } from './TypeCoercion';
import { PropertyRegistry } from './PropertyRegistry';
export class PropertyCache {
    currentFrame = 0;
    timestamp = 0;
    snapshots = new Map();
    validationEnabled;
    constructor(validationEnabled = false) {
        this.validationEnabled = validationEnabled;
    }
    update(payload) {
        this.currentFrame = payload.frameId;
        this.timestamp = payload.timestamp;
        for (const [entityId, snapshot] of Object.entries(payload.entities)) {
            const coercedSnapshot = {};
            for (const [property, value] of Object.entries(snapshot)) {
                const knownMetadata = PropertyRegistry.getMetadata(property);
                const metadata = knownMetadata ?? {
                    scope: 'entity',
                    source: 'game',
                    frequency: 'change',
                    type: TypeCoercion.inferType(value),
                };
                const coercedValue = TypeCoercion.coerceToExpectedType(value, metadata);
                if (this.validationEnabled) {
                    const validation = TypeCoercion.validate(coercedValue, metadata);
                    if (!validation.valid) {
                        console.warn(`[PropertyCache] Type validation failed for ${entityId}.${property}: ${validation.error}`, { value, coercedValue, expectedType: metadata.type });
                    }
                }
                coercedSnapshot[property] = coercedValue;
            }
            this.snapshots.set(entityId, coercedSnapshot);
        }
    }
    get(entityId, property) {
        const snapshot = this.snapshots.get(entityId);
        if (!snapshot)
            return undefined;
        return snapshot[property];
    }
    set(entityId, property, value) {
        let snapshot = this.snapshots.get(entityId);
        if (!snapshot) {
            snapshot = {};
            this.snapshots.set(entityId, snapshot);
        }
        snapshot[property] = value;
    }
    getSnapshot(entityId) {
        const snapshot = this.snapshots.get(entityId);
        if (!snapshot)
            return undefined;
        return { ...snapshot };
    }
    setSnapshot(entityId, snapshot) {
        this.snapshots.set(entityId, { ...snapshot });
    }
    has(entityId) {
        return this.snapshots.has(entityId);
    }
    delete(entityId) {
        this.snapshots.delete(entityId);
    }
    clear() {
        this.snapshots.clear();
        this.currentFrame = 0;
        this.timestamp = 0;
    }
    getCurrentFrame() {
        return this.currentFrame;
    }
    getTimestamp() {
        return this.timestamp;
    }
    getAllEntityIds() {
        return Array.from(this.snapshots.keys());
    }
    getSize() {
        return this.snapshots.size;
    }
}
//# sourceMappingURL=PropertyCache.js.map