import type { SlotImplementation } from './types';

export class SlotRegistry {
  private implementations = new Map<string, SlotImplementation>();

  register(impl: SlotImplementation): void {
    if (this.implementations.has(impl.id)) {
      throw new Error(`Slot implementation '${impl.id}' already registered`);
    }
    this.implementations.set(impl.id, impl);
  }

  unregister(implId: string): void {
    this.implementations.delete(implId);
  }

  get(id: string): SlotImplementation | undefined {
    return this.implementations.get(id);
  }

  has(id: string): boolean {
    return this.implementations.has(id);
  }

  listForSlot(systemId: string, slotName: string): SlotImplementation[] {
    return Array.from(this.implementations.values()).filter(
      (impl) => impl.owner.systemId === systemId && impl.owner.slotName === slotName
    );
  }

  validateSelection(systemId: string, slotName: string, implId: string): boolean {
    const impl = this.get(implId);
    if (!impl) return false;
    if (impl.owner.systemId !== systemId || impl.owner.slotName !== slotName) {
      return false;
    }
    return impl.compatibleWith.some((c) => c.systemId === systemId);
  }

  getAll(): SlotImplementation[] {
    return Array.from(this.implementations.values());
  }

  clear(): void {
    this.implementations.clear();
  }

  get size(): number {
    return this.implementations.size;
  }
}

let globalSlotRegistry: SlotRegistry | null = null;

export function getGlobalSlotRegistry(): SlotRegistry {
  if (!globalSlotRegistry) {
    globalSlotRegistry = new SlotRegistry();
  }
  return globalSlotRegistry;
}

export function resetGlobalSlotRegistry(): void {
  globalSlotRegistry = null;
}
