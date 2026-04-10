import type { EffectType } from "./types";
export type EffectCategory = "glow" | "distortion" | "color" | "postProcess" | "artistic";
/**
 * @deprecated Use EffectParamSchema from types.ts instead
 */
export interface EffectParamMeta {
    key: string;
    type: "number" | "color" | "boolean" | "select";
    displayName: string;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    defaultValue: number | string | boolean;
}
export interface EffectMetadata {
    type: EffectType;
    displayName: string;
    description: string;
    category: EffectCategory;
    params: EffectParamMeta[];
    defaultValues: Record<string, unknown>;
}
export declare const EFFECT_METADATA: Record<EffectType, EffectMetadata>;
//# sourceMappingURL=metadata.d.ts.map