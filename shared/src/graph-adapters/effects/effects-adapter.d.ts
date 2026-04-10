import type { EffectGraphSpec } from "../../effects/types";
import type { GraphDocument } from "../../graph-core/types";
import type { DomainValidationResult, GraphDomainAdapter, InspectorConfig, NodeCatalogEntry } from "../types";
export declare class EffectsGraphAdapter implements GraphDomainAdapter<EffectGraphSpec> {
    readonly id = "effects";
    readonly name = "Effects Graph Adapter";
    toGeneric(spec: EffectGraphSpec): GraphDocument;
    fromGeneric(doc: GraphDocument): EffectGraphSpec;
    validateDomain(spec: EffectGraphSpec): DomainValidationResult;
    getNodeCatalog(): NodeCatalogEntry[];
    getInspectorConfig(nodeType: string): InspectorConfig | null;
}
//# sourceMappingURL=effects-adapter.d.ts.map