import glitch from "./glitch.glsl";
export const meta = {
    id: "glitch",
    glsl: glitch,
    paramsSchema: [
        {
            key: "glitch_intensity",
            uniformName: "glitch_intensity",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Glitch Intensity", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "glitch_speed",
            uniformName: "glitch_speed",
            type: "float",
            defaultValue: 10.0,
            ui: { displayName: "Glitch Speed", min: 1.0, max: 60.0, step: 1.0 },
        },
        {
            key: "block_size",
            uniformName: "block_size",
            type: "float",
            defaultValue: 20.0,
            ui: { displayName: "Block Size", min: 5.0, max: 100.0, step: 1.0 },
        },
        {
            key: "color_drift",
            uniformName: "color_drift",
            type: "float",
            defaultValue: 0.01,
            ui: { displayName: "Color Drift", min: 0.0, max: 0.05, step: 0.001 },
        },
        {
            key: "enable_scanline_shift",
            uniformName: "enable_scanline_shift",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Scanline Shift" },
        },
        {
            key: "enable_color_separation",
            uniformName: "enable_color_separation",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Color Separation" },
        },
        {
            key: "enable_noise",
            uniformName: "enable_noise",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Enable Noise" },
        },
    ],
    aiHints: {
        description: "Digital glitch effect with horizontal block displacement, color channel separation, noise, and color inversion",
        aliases: [
            "digital glitch",
            "data corruption",
            "VHS glitch",
            "signal error",
            "broken TV",
        ],
        category: "distort",
        combinability: ["chromaticAberration", "scanlines", "crt", "holographic"],
    },
};
//# sourceMappingURL=glitch.meta.js.map