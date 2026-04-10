import filmGrain from "./filmGrain.glsl";
export const meta = {
    id: "filmGrain",
    glsl: filmGrain,
    paramsSchema: [
        {
            key: "grain_amount",
            uniformName: "grain_amount",
            type: "float",
            defaultValue: 0.15,
            ui: { displayName: "Grain Amount", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "grain_size",
            uniformName: "grain_size",
            type: "float",
            defaultValue: 1.5,
            ui: { displayName: "Grain Size", min: 1.0, max: 5.0, step: 0.05 },
        },
        {
            key: "luminance_response",
            uniformName: "luminance_response",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Luminance Response", min: 0.0, max: 1.0, step: 0.05 },
        },
        {
            key: "colored",
            uniformName: "colored",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Colored Grain" },
        },
    ],
    aiHints: {
        description: "Photographic film grain overlay with luminance-aware response and optional chromatic grain channels",
        aliases: [
            "film grain",
            "noise overlay",
            "analog noise",
            "grain",
            "texture",
        ],
        category: "artistic",
        combinability: ["duotone", "gradientMap", "colorGrading", "vignette"],
    },
};
//# sourceMappingURL=filmGrain.meta.js.map