import { z } from "zod";
import type { GameVariable, GameVariableValue } from "./GameDefinition";
export declare const RemixOverridesSchema: z.ZodObject<{
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString]>>>;
    assets: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        assetId: z.ZodString;
        assetUrl: z.ZodString;
        placement: z.ZodOptional<z.ZodObject<{
            scale: z.ZodOptional<z.ZodNumber>;
            offsetX: z.ZodOptional<z.ZodNumber>;
            offsetY: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        }, {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        assetId?: string;
        assetUrl?: string;
        placement?: {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        };
    }, {
        assetId?: string;
        assetUrl?: string;
        placement?: {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        };
    }>>>;
    shaderParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    sounds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        soundId: z.ZodString;
        url: z.ZodString;
        volume: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url?: string;
        soundId?: string;
        volume?: number;
    }, {
        url?: string;
        soundId?: string;
        volume?: number;
    }>>>;
}, "strict", z.ZodTypeAny, {
    variables?: Record<string, string | number | boolean>;
    assets?: Record<string, {
        assetId?: string;
        assetUrl?: string;
        placement?: {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        };
    }>;
    shaderParams?: Record<string, Record<string, number>>;
    sounds?: Record<string, {
        url?: string;
        soundId?: string;
        volume?: number;
    }>;
}, {
    variables?: Record<string, string | number | boolean>;
    assets?: Record<string, {
        assetId?: string;
        assetUrl?: string;
        placement?: {
            scale?: number;
            offsetX?: number;
            offsetY?: number;
        };
    }>;
    shaderParams?: Record<string, Record<string, number>>;
    sounds?: Record<string, {
        url?: string;
        soundId?: string;
        volume?: number;
    }>;
}>;
export type RemixOverrides = z.infer<typeof RemixOverridesSchema>;
export declare const RemixSchema: z.ZodObject<{
    id: z.ZodString;
    baseGameId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    creatorUserId: z.ZodString;
    overrides: z.ZodObject<{
        variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString]>>>;
        assets: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            assetId: z.ZodString;
            assetUrl: z.ZodString;
            placement: z.ZodOptional<z.ZodObject<{
                scale: z.ZodOptional<z.ZodNumber>;
                offsetX: z.ZodOptional<z.ZodNumber>;
                offsetY: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            }, {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>>>;
        shaderParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodNumber>>>;
        sounds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            soundId: z.ZodString;
            url: z.ZodString;
            volume: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url?: string;
            soundId?: string;
            volume?: number;
        }, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    }, {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    }>;
    themeId: z.ZodOptional<z.ZodString>;
    themeName: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    description?: string;
    creatorUserId?: string;
    createdAt?: number;
    updatedAt?: number;
    themeId?: string;
    baseGameId?: string;
    overrides?: {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    };
    themeName?: string;
}, {
    id?: string;
    name?: string;
    description?: string;
    creatorUserId?: string;
    createdAt?: number;
    updatedAt?: number;
    themeId?: string;
    baseGameId?: string;
    overrides?: {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    };
    themeName?: string;
}>;
export type Remix = z.infer<typeof RemixSchema>;
export declare const CreateRemixInputSchema: z.ZodObject<{
    baseGameId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    overrides: z.ZodObject<{
        variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodBoolean, z.ZodString]>>>;
        assets: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            assetId: z.ZodString;
            assetUrl: z.ZodString;
            placement: z.ZodOptional<z.ZodObject<{
                scale: z.ZodOptional<z.ZodNumber>;
                offsetX: z.ZodOptional<z.ZodNumber>;
                offsetY: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            }, {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>>>;
        shaderParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodNumber>>>;
        sounds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            soundId: z.ZodString;
            url: z.ZodString;
            volume: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url?: string;
            soundId?: string;
            volume?: number;
        }, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    }, {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    }>;
    themeId: z.ZodOptional<z.ZodString>;
    themeName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    themeId?: string;
    baseGameId?: string;
    overrides?: {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    };
    themeName?: string;
}, {
    name?: string;
    description?: string;
    themeId?: string;
    baseGameId?: string;
    overrides?: {
        variables?: Record<string, string | number | boolean>;
        assets?: Record<string, {
            assetId?: string;
            assetUrl?: string;
            placement?: {
                scale?: number;
                offsetX?: number;
                offsetY?: number;
            };
        }>;
        shaderParams?: Record<string, Record<string, number>>;
        sounds?: Record<string, {
            url?: string;
            soundId?: string;
            volume?: number;
        }>;
    };
    themeName?: string;
}>;
export type CreateRemixInput = z.infer<typeof CreateRemixInputSchema>;
export interface VariableValidationError {
    key: string;
    message: string;
}
export interface VariableValidationResult {
    valid: boolean;
    errors: VariableValidationError[];
}
export declare function validateVariableOverrides(overrides: Record<string, GameVariableValue>, gameVariables: Record<string, GameVariable>): VariableValidationResult;
export declare function applyVariableOverrides(gameVariables: Record<string, GameVariable>, overrideValues: Record<string, GameVariableValue>): Record<string, GameVariable>;
//# sourceMappingURL=remix.d.ts.map