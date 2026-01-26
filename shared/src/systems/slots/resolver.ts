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

export function resolveSlots(
  selections: SlotSelections,
  registry: SlotRegistry
): ResolvedSlots {
  const resolved: Map<string, ResolvedSlot> = new Map();
  const errors: string[] = [];

  for (const [key, selection] of Object.entries(selections)) {
    const impl = registry.get(selection.implId);

    if (!impl) {
      errors.push(`Slot implementation '${selection.implId}' not found for slot '${key}'`);
      continue;
    }

    const isValid = registry.validateSelection(
      selection.systemId,
      selection.slotName,
      selection.implId
    );

    if (!isValid) {
      errors.push(
        `Implementation '${selection.implId}' is not valid for slot '${selection.systemId}.${selection.slotName}'`
      );
      continue;
    }

    resolved.set(key, {
      systemId: selection.systemId,
      slotName: selection.slotName,
      implementation: impl,
      params: selection.params,
    });
  }

  return { slots: resolved, errors };
}

export function resolveSlotRef(ref: SlotRef, registry: SlotRegistry): SlotImplementation | undefined {
  return registry.get(ref);
}

export function createSlotSelection(
  systemId: string,
  slotName: string,
  implId: string,
  params?: Record<string, unknown>
): SlotSelection {
  return { systemId, slotName, implId, params };
}
