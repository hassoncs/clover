export class SlotRegistry {
    implementations = new Map();
    register(impl) {
        if (this.implementations.has(impl.id)) {
            throw new Error(`Slot implementation '${impl.id}' already registered`);
        }
        this.implementations.set(impl.id, impl);
    }
    unregister(implId) {
        this.implementations.delete(implId);
    }
    get(id) {
        return this.implementations.get(id);
    }
    has(id) {
        return this.implementations.has(id);
    }
    listForSlot(systemId, slotName) {
        return Array.from(this.implementations.values()).filter((impl) => impl.owner.systemId === systemId && impl.owner.slotName === slotName);
    }
    validateSelection(systemId, slotName, implId) {
        const impl = this.get(implId);
        if (!impl)
            return false;
        if (impl.owner.systemId !== systemId || impl.owner.slotName !== slotName) {
            return false;
        }
        return impl.compatibleWith.some((c) => c.systemId === systemId);
    }
    getAll() {
        return Array.from(this.implementations.values());
    }
    clear() {
        this.implementations.clear();
    }
    get size() {
        return this.implementations.size;
    }
}
let globalSlotRegistry = null;
export function getGlobalSlotRegistry() {
    if (!globalSlotRegistry) {
        globalSlotRegistry = new SlotRegistry();
    }
    return globalSlotRegistry;
}
export function resetGlobalSlotRegistry() {
    globalSlotRegistry = null;
}
//# sourceMappingURL=SlotRegistry.js.map