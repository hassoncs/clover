import type { GraphDomainAdapter } from "./types";

export class AdapterRegistry {
	private adapters = new Map<string, GraphDomainAdapter>();

	register(adapter: GraphDomainAdapter): void {
		if (this.adapters.has(adapter.id)) {
			throw new Error(
				`Adapter "${adapter.id}" is already registered. Unregister it first to replace.`,
			);
		}
		this.adapters.set(adapter.id, adapter);
	}

	resolve(id: string): GraphDomainAdapter | undefined {
		return this.adapters.get(id);
	}

	resolveOrThrow(id: string): GraphDomainAdapter {
		const adapter = this.adapters.get(id);
		if (!adapter) {
			const available = [...this.adapters.keys()].join(", ") || "(none)";
			throw new Error(
				`No adapter registered for "${id}". Available: ${available}`,
			);
		}
		return adapter;
	}

	has(id: string): boolean {
		return this.adapters.has(id);
	}

	unregister(id: string): boolean {
		return this.adapters.delete(id);
	}

	getAll(): GraphDomainAdapter[] {
		return [...this.adapters.values()];
	}
}
