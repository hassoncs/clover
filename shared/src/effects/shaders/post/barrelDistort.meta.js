import barrelDistort from "./barrelDistort.glsl";
export const meta = {
    id: "barrelDistort",
    glsl: barrelDistort,
    paramsSchema: [
        {
            key: "strength",
            uniformName: "strength",
            type: "float",
            defaultValue: 0.3,
            ui: { displayName: "Strength", min: -1.0, max: 1.0, step: 0.01 },
        },
        {
            key: "zoom",
            uniformName: "zoom",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Zoom", min: 0.5, max: 2.0, step: 0.01 },
        },
        {
            key: "chromatic",
            uniformName: "chromatic",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Chromatic Aberration" },
        },
        {
            key: "chromatic_spread",
            uniformName: "chromatic_spread",
            type: "float",
            defaultValue: 0.005,
            ui: { displayName: "Chromatic Spread", min: 0.0, max: 0.02, step: 0.001 },
        },
    ],
    aiHints: {
        description: "Lens warp distortion supporting barrel and pincushion profiles with optional chromatic channel separation",
        aliases: [
            "barrel distortion",
            "lens distortion",
            "fisheye",
            "pincushion",
            "lens warp",
        ],
        category: "distort",
        combinability: ["filmGrain", "gradientMap", "vignette", "colorGrading"],
    },
};
//# sourceMappingURL=barrelDistort.meta.js.map