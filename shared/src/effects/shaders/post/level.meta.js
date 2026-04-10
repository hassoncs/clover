import level from "./level.glsl";
export const meta = {
    id: "level",
    glsl: level,
    paramsSchema: [
        {
            key: "brightness",
            uniformName: "brightness",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Brightness", min: -1.0, max: 1.0, step: 0.05 },
        },
        {
            key: "contrast",
            uniformName: "contrast",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Contrast", min: 0.0, max: 3.0, step: 0.05 },
        },
        {
            key: "gamma",
            uniformName: "gamma",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Gamma", min: 0.1, max: 3.0, step: 0.05 },
        },
        {
            key: "black_point",
            uniformName: "black_point",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Black Point", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "white_point",
            uniformName: "white_point",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "White Point", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "opacity",
            uniformName: "opacity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "Levels-style color correction with black/white point remap, gamma, contrast, brightness, and blend opacity",
        aliases: ["levels", "brightness contrast", "exposure", "color adjust"],
        category: "color",
        combinability: ["vignette", "bloom", "blur", "scanlines", "crt"],
    },
};
//# sourceMappingURL=level.meta.js.map