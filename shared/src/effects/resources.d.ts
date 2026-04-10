import type { BufferFormat, ResolutionMode, EffectGraphSpec } from './types';
export type ScopeTarget = {
    type: 'screen';
} | {
    type: 'entity';
    entityId: string;
};
export type ResourceKind = 'screenColor' | 'intermediate' | 'feedback' | 'external';
export interface ResourceNode {
    id: string;
    kind: ResourceKind;
    format: BufferFormat;
    resolution: ResolutionMode;
    customWidth?: number;
    customHeight?: number;
    providedBy: string | null;
    consumedBy: string[];
}
export interface ResourceBinding {
    passId: string;
    direction: 'input' | 'output';
    slotName: string;
    resourceId: string;
}
export interface ResourceGraph {
    scope: ScopeTarget;
    resources: Map<string, ResourceNode>;
    bindings: ResourceBinding[];
}
export type ResourceResolutionErrorCode = 'E_RESOURCE_UNRESOLVED' | 'E_FORMAT_MISMATCH' | 'E_RESOLUTION_MISMATCH' | 'E_DUPLICATE_PROVIDER';
export interface ResourceResolutionError {
    code: ResourceResolutionErrorCode;
    message: string;
    resourceId?: string;
    nodeIds?: string[];
}
export interface ResourceResolutionResult {
    success: boolean;
    graph?: ResourceGraph;
    errors: ResourceResolutionError[];
}
export declare function areFormatsCompatible(source: BufferFormat, target: BufferFormat): boolean;
export declare function areResolutionsCompatible(source: ResolutionMode, target: ResolutionMode): boolean;
export declare function resolveEffectiveResolution(mode: ResolutionMode, customWidth?: number, customHeight?: number): {
    widthScale: number;
    heightScale: number;
};
export declare function buildResourceGraph(spec: EffectGraphSpec): ResourceResolutionResult;
//# sourceMappingURL=resources.d.ts.map