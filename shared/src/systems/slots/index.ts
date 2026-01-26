export type {
  SlotRef,
  SlotKind,
  SlotContract,
  SlotOwner,
  SlotCompatibility,
  SlotImplementation,
} from './types';

export {
  SlotRegistry,
  getGlobalSlotRegistry,
  resetGlobalSlotRegistry,
} from './SlotRegistry';

export {
  resolveSlots,
  resolveSlotRef,
  createSlotSelection,
} from './resolver';

export type {
  SlotSelection,
  ResolvedSlot,
  ResolvedSlots,
  SlotSelections,
} from './resolver';
