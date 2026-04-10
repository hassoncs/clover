import holographic from "./holographic.glsl";
export const meta = {
    id: "holographic",
    glsl: holographic,
    paramsSchema: [
        {
            key: "speed",
            uniformName: "speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "scan_line_count",
            uniformName: "scan_line_count",
            type: "float",
            defaultValue: 50.0,
            ui: { displayName: "Scan Line Count", min: 10.0, max: 200.0, step: 5.0 },
        },
        {
            key: "scan_line_intensity",
            uniformName: "scan_line_intensity",
            type: "float",
            defaultValue: 0.3,
            ui: {
                displayName: "Scan Line Intensity",
                min: 0.0,
                max: 1.0,
                step: 0.05,
            },
        },
        {
            key: "chromatic_offset",
            uniformName: "chromatic_offset",
            type: "float",
            defaultValue: 0.005,
            ui: { displayName: "Chromatic Offset", min: 0.0, max: 0.02, step: 0.001 },
        },
        {
            key: "flicker_intensity",
            uniformName: "flicker_intensity",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Flicker Intensity", min: 0.0, max: 0.5, step: 0.01 },
        },
        {
            key: "glitch_intensity",
            uniformName: "glitch_intensity",
            type: "float",
            defaultValue: 0.02,
            ui: { displayName: "Glitch Intensity", min: 0.0, max: 0.1, step: 0.005 },
        },
        {
            key: "hologram_tint",
            uniformName: "hologram_tint",
            type: "color",
            defaultValue: [0.3, 0.8, 1.0, 1.0],
            ui: { displayName: "Hologram Tint" },
        },
        {
            key: "alpha_boost",
            uniformName: "alpha_boost",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Alpha Boost", min: 0.0, max: 1.0, step: 0.05 },
        },
    ],
    aiHints: {
        description: "Sci-fi holographic display effect with scanlines, chromatic aberration, glitch, and cyan tint",
        aliases: [
            "hologram",
            "sci-fi",
            "futuristic",
            "cyber projection",
            "digital ghost",
        ],
        category: "artistic",
        combinability: ["glitch", "scanlines", "chromaticAberration", "glow"],
    },
};
//# sourceMappingURL=holographic.meta.js.map