import type { QualityTier, EffectParamSchema } from './types';
/**
 * @deprecated Use EffectParamSchema from types.ts instead
 */
export interface ParamSummary {
    name: string;
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'bool';
    range?: {
        min: number;
        max: number;
    };
    defaultValue: number | string | boolean | number[];
}
export interface PackageManifest {
    name: string;
    description: string;
    tags: string[];
    categories: string[];
    scopeSupport: ('screen' | 'entity')[];
    nodeTypes: string[];
    parameterSummary: ParamSummary[];
    performanceTier: QualityTier;
    compatibility: {
        requires?: string[];
        conflicts?: string[];
    };
    license: 'open' | 'custom' | 'proprietary';
}
export interface NodeTypeRegistration {
    type: string;
    family: 'generator' | 'filter' | 'combiner';
    displayName: string;
    description: string;
    inputSlots: {
        name: string;
        dataType: string;
        required: boolean;
    }[];
    outputType: 'texture';
    defaultParams: Record<string, unknown>;
    paramsSchema: Array<{
        name: string;
        type: string;
        range?: {
            min: number;
            max: number;
        };
        defaultValue: unknown;
    }>;
    tags: string[];
    performanceTier: QualityTier;
    constraints: {
        requires?: string[];
        conflicts?: string[];
        before?: string[];
        after?: string[];
    };
    aiHints: {
        aliases: string[];
        promptDescription: string;
        commonCombinations: string[];
    };
}
export interface SearchQuery {
    tags?: string[];
    scope?: 'screen' | 'entity';
    family?: 'generator' | 'filter' | 'combiner';
    performanceTier?: QualityTier;
    text?: string;
}
export interface SearchResult {
    registration: NodeTypeRegistration;
    relevanceScore: number;
}
export declare class ManifestRegistry {
    private nodes;
    private aliasMap;
    register(registration: NodeTypeRegistration): void;
    unregister(type: string): boolean;
    get(type: string): NodeTypeRegistration | undefined;
    has(type: string): boolean;
    getAll(): NodeTypeRegistration[];
    search(query: SearchQuery): SearchResult[];
    resolveAlias(alias: string): string | undefined;
    getAIContext(types: string[]): string;
    validateConstraints(nodeTypes: string[]): {
        valid: boolean;
        errors: string[];
    };
    private computeTextScore;
}
export declare function convertRegistrationParamsToEffectParamSchema(reg: NodeTypeRegistration): EffectParamSchema[];
//# sourceMappingURL=registry.d.ts.map