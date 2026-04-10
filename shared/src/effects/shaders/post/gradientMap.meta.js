import gradientMap from "./gradientMap.glsl";
export const meta = {
    id: "gradientMap",
    glsl: gradientMap,
    paramsSchema: [
        {
            key: "color_0",
            uniformName: "color_0",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Color 0%" },
        },
        {
            key: "color_25",
            uniformName: "color_25",
            type: "color",
            defaultValue: [0.0, 0.1, 0.3, 1.0],
            ui: { displayName: "Color 25%" },
        },
        {
            key: "color_50",
            uniformName: "color_50",
            type: "color",
            defaultValue: [0.0, 0.6, 0.2, 1.0],
            ui: { displayName: "Color 50%" },
        },
        {
            key: "color_75",
            uniformName: "color_75",
            type: "color",
            defaultValue: [1.0, 0.9, 0.2, 1.0],
            ui: { displayName: "Color 75%" },
        },
        {
            key: "color_100",
            uniformName: "color_100",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Color 100%" },
        },
        {
            key: "intensity",
            uniformName: "intensity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
        },
    ],
    aiHints: {
        description: "Five-stop gradient mapping that remaps luminance into custom false-color ramps",
        aliases: ["gradient map", "color ramp", "false color", "heatmap"],
        category: "color",
        combinability: ["filmGrain", "vignette", "kaleidoscope", "barrelDistort"],
    },
};
//# sourceMappingURL=gradientMap.meta.js.map