export class AdapterRegistry {
    adapters = new Map();
    register(adapter) {
        if (this.adapters.has(adapter.id)) {
            throw new Error(`Adapter "${adapter.id}" is already registered. Unregister it first to replace.`);
        }
        this.adapters.set(adapter.id, adapter);
    }
    resolve(id) {
        return this.adapters.get(id);
    }
    resolveOrThrow(id) {
        const adapter = this.adapters.get(id);
        if (!adapter) {
            const available = [...this.adapters.keys()].join(", ") || "(none)";
            throw new Error(`No adapter registered for "${id}". Available: ${available}`);
        }
        return adapter;
    }
    has(id) {
        return this.adapters.has(id);
    }
    unregister(id) {
        return this.adapters.delete(id);
    }
    getAll() {
        return [...this.adapters.values()];
    }
}
//# sourceMappingURL=registry.js.map