import type { PenNode, PenRef } from "@slopcade/shared/types/pen";
export declare function buildComponentRegistry(nodes: PenNode[]): Map<string, PenNode>;
export declare function resolveRef(refNode: PenRef, registry: Map<string, PenNode>): PenNode | null;
export declare function resolveAllRefs(nodes: PenNode[], registry: Map<string, PenNode>): PenNode[];
//# sourceMappingURL=components.d.ts.map