import emboss from "./emboss.glsl";
export const meta = {
    id: "emboss",
    glsl: emboss,
    paramsSchema: [
        {
            key: "strength",
            uniformName: "strength",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Strength", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "angle",
            uniformName: "angle",
            type: "float",
            defaultValue: 135.0,
            ui: { displayName: "Angle", min: 0.0, max: 360.0, step: 1.0 },
        },
        {
            key: "blend_with_original",
            uniformName: "blend_with_original",
            type: "float",
            defaultValue: 0.5,
            ui: {
                displayName: "Blend With Original",
                min: 0.0,
                max: 1.0,
                step: 0.05,
            },
        },
    ],
    aiHints: {
        description: "Emboss and relief filter that extracts directional surface detail and blends it with the original image",
        aliases: ["emboss", "relief", "bevel", "engrave"],
        category: "artistic",
        combinability: ["colorGrading", "vignette", "filmGrain", "blur"],
    },
};
//# sourceMappingURL=emboss.meta.js.map