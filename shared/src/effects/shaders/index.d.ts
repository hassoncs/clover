import { type SkSLRewriteResult } from "../skslRewrite";
import type { EffectParamSchema, EffectType } from "../types";
export type ShaderCategory = "distort" | "color" | "blur" | "generator" | "composite" | "glow" | "artistic" | "utility";
export interface ShaderLibraryEntry {
    id: string;
    glsl: string;
    paramsSchema: EffectParamSchema[];
    aiHints: {
        description: string;
        aliases: string[];
        category: ShaderCategory;
        combinability: string[];
    };
    previewThumbnail?: string;
}
export declare const SHADER_LIBRARY: Record<string, string>;
export declare const SHADER_REGISTRY: Record<string, ShaderLibraryEntry>;
export declare function getShaderGlsl(effectType: string): string | null;
export declare function getShaderGlslStrict(effectType: EffectType): string;
export declare function getAvailableShaderKeys(): string[];
export declare function getShaderEntry(id: string): ShaderLibraryEntry | null;
export declare function listShadersByCategory(category: ShaderCategory): ShaderLibraryEntry[];
export declare function searchShaders(query: string): ShaderLibraryEntry[];
export declare function getCombinableShaders(id: string): string[];
export declare function getAllShaderCategories(): ShaderCategory[];
export declare function getShaderCount(): number;
export declare function getShaderSkSL(effectType: string): SkSLRewriteResult | null;
export declare function getSkSLCompatibleShaderKeys(): string[];
//# sourceMappingURL=index.d.ts.map