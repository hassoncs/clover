import { z } from "zod";
import { isVariableWithTuning } from "./GameDefinition";
const AssetOverrideSchema = z.object({
    assetId: z.string(),
    assetUrl: z.string(),
    placement: z
        .object({
        scale: z.number().optional(),
        offsetX: z.number().optional(),
        offsetY: z.number().optional(),
    })
        .optional(),
});
const ShaderParamOverrideSchema = z.record(z.string(), z.number());
const SoundOverrideSchema = z.object({
    soundId: z.string(),
    url: z.string(),
    volume: z.number().min(0).max(1).optional(),
});
const VariableOverrideValueSchema = z.union([
    z.number(),
    z.boolean(),
    z.string(),
]);
export const RemixOverridesSchema = z
    .object({
    variables: z.record(z.string(), VariableOverrideValueSchema).optional(),
    assets: z.record(z.string(), AssetOverrideSchema).optional(),
    shaderParams: z.record(z.string(), ShaderParamOverrideSchema).optional(),
    sounds: z.record(z.string(), SoundOverrideSchema).optional(),
})
    .strict();
export const RemixSchema = z.object({
    id: z.string(),
    baseGameId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    creatorUserId: z.string(),
    overrides: RemixOverridesSchema,
    themeId: z.string().optional(),
    themeName: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
});
export const CreateRemixInputSchema = z.object({
    baseGameId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    overrides: RemixOverridesSchema,
    themeId: z.string().optional(),
    themeName: z.string().optional(),
});
export function validateVariableOverrides(overrides, gameVariables) {
    const errors = [];
    for (const [key, overrideValue] of Object.entries(overrides)) {
        const gameVar = gameVariables[key];
        if (gameVar === undefined) {
            errors.push({
                key,
                message: `Variable "${key}" not found in game variables`,
            });
            continue;
        }
        if (typeof overrideValue !== "number")
            continue;
        if (!isVariableWithTuning(gameVar))
            continue;
        if (!gameVar.tuning)
            continue;
        const { min, max } = gameVar.tuning;
        if (overrideValue < min) {
            errors.push({
                key,
                message: `Value ${overrideValue} is below min ${min}`,
            });
        }
        else if (overrideValue > max) {
            errors.push({
                key,
                message: `Value ${overrideValue} is above max ${max}`,
            });
        }
    }
    return { valid: errors.length === 0, errors };
}
export function applyVariableOverrides(gameVariables, overrideValues) {
    const result = {};
    for (const [key, variable] of Object.entries(gameVariables)) {
        const override = overrideValues[key];
        if (override === undefined) {
            result[key] = variable;
            continue;
        }
        if (isVariableWithTuning(variable)) {
            result[key] = { ...variable, value: override };
        }
        else {
            result[key] = override;
        }
    }
    return result;
}
//# sourceMappingURL=remix.js.map