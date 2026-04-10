import type { GraphDomainAdapter } from "./types";
export declare class AdapterRegistry {
    private adapters;
    register(adapter: GraphDomainAdapter): void;
    resolve(id: string): GraphDomainAdapter | undefined;
    resolveOrThrow(id: string): GraphDomainAdapter;
    has(id: string): boolean;
    unregister(id: string): boolean;
    getAll(): GraphDomainAdapter[];
}
//# sourceMappingURL=registry.d.ts.map