import type { PropertyPath, PropertyMetadata } from './types';
export declare class PropertyRegistry {
    static getMetadata(property: PropertyPath): PropertyMetadata | undefined;
    static isKnownProperty(property: PropertyPath): boolean;
    static getAllProperties(): PropertyPath[];
    static getPropertiesByScope(scope: PropertyMetadata['scope']): PropertyPath[];
    static getPropertiesBySource(source: PropertyMetadata['source']): PropertyPath[];
    static getPropertiesByFrequency(frequency: PropertyMetadata['frequency']): PropertyPath[];
    static registerCustomProperty(path: PropertyPath, metadata: PropertyMetadata): void;
    static getMetadataOrInfer(property: PropertyPath): PropertyMetadata;
    private static inferMetadata;
}
//# sourceMappingURL=PropertyRegistry.d.ts.map