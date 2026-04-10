import type { PropertyCache } from './PropertyCache';
import type { PropertyPath, PropertyValue } from './types';
export declare class EntityContextProxy {
    private cache;
    private entityId;
    constructor(cache: PropertyCache, entityId: string);
    get(property: PropertyPath): PropertyValue;
    set(property: PropertyPath, value: PropertyValue): void;
    toObject(): Record<string, PropertyValue>;
    static createEntityContext(cache: PropertyCache, entityId: string): Record<string, unknown>;
}
//# sourceMappingURL=EntityContextProxy.d.ts.map