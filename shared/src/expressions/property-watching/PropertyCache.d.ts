import type { PropertySyncPayload, EntityPropertySnapshot, PropertyPath, PropertyValue } from './types';
export declare class PropertyCache {
    private currentFrame;
    private timestamp;
    private snapshots;
    private validationEnabled;
    constructor(validationEnabled?: boolean);
    update(payload: PropertySyncPayload): void;
    get(entityId: string, property: PropertyPath): PropertyValue;
    set(entityId: string, property: PropertyPath, value: PropertyValue): void;
    getSnapshot(entityId: string): EntityPropertySnapshot | undefined;
    setSnapshot(entityId: string, snapshot: EntityPropertySnapshot): void;
    has(entityId: string): boolean;
    delete(entityId: string): void;
    clear(): void;
    getCurrentFrame(): number;
    getTimestamp(): number;
    getAllEntityIds(): string[];
    getSize(): number;
}
//# sourceMappingURL=PropertyCache.d.ts.map