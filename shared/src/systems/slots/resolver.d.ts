import type { SlotImplementation, SlotRef } from './types';
import type { SlotRegistry } from './SlotRegistry';
export interface SlotSelection {
    systemId: string;
    slotName: string;
    implId: string;
    params?: Record<string, unknown>;
}
export interface ResolvedSlot {
    systemId: string;
    slotName: string;
    implementation: SlotImplementation;
    params?: Record<string, unknown>;
}
export interface ResolvedSlots {
    slots: Map<string, ResolvedSlot>;
    errors: string[];
}
export interface SlotSelections {
    [key: string]: SlotSelection;
}
export declare function resolveSlots(selections: SlotSelections, registry: SlotRegistry): ResolvedSlots;
export declare function resolveSlotRef(ref: SlotRef, registry: SlotRegistry): SlotImplementation | undefined;
export declare function createSlotSelection(systemId: string, slotName: string, implId: string, params?: Record<string, unknown>): SlotSelection;
//# sourceMappingURL=resolver.d.ts.map