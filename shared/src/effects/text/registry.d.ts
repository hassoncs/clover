import type { EffectParamSchema } from '../types';
export interface ShaderLibraryEntry {
    id: string;
    glsl: string;
    paramsSchema: EffectParamSchema[];
    aiHints: {
        description: string;
        aliases: string[];
        category: string;
        combinability: string[];
    };
}
export declare const MSDF_TEXT_GENERATOR_SCHEMA: EffectParamSchema[];
export declare const TEXT_SHADER_LIBRARY: Record<string, ShaderLibraryEntry>;
export declare function getTextShaderIds(): string[];
export declare function isTextShader(shaderId: string): boolean;
//# sourceMappingURL=registry.d.ts.map