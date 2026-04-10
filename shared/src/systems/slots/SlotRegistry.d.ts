import type { SlotImplementation } from './types';
export declare class SlotRegistry {
    private implementations;
    register(impl: SlotImplementation): void;
    unregister(implId: string): void;
    get(id: string): SlotImplementation | undefined;
    has(id: string): boolean;
    listForSlot(systemId: string, slotName: string): SlotImplementation[];
    validateSelection(systemId: string, slotName: string, implId: string): boolean;
    getAll(): SlotImplementation[];
    clear(): void;
    get size(): number;
}
export declare function getGlobalSlotRegistry(): SlotRegistry;
export declare function resetGlobalSlotRegistry(): void;
//# sourceMappingURL=SlotRegistry.d.ts.map