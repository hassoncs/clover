import resize from "./resize.glsl";
export const meta = {
    id: "resize",
    glsl: resize,
    paramsSchema: [
        {
            key: "scale",
            uniformName: "scale",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Scale", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "filter_mode",
            uniformName: "filter_mode",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Filter Mode",
                min: 0,
                max: 1,
                step: 1,
                options: ["bilinear", "nearest"],
            },
        },
        {
            key: "maintain_aspect",
            uniformName: "maintain_aspect",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Maintain Aspect" },
        },
    ],
    aiHints: {
        description: "Rescales the screen around center with bilinear or nearest filtering and optional aspect handling",
        aliases: ["resize", "scale image", "resolution", "downscale", "upscale"],
        category: "utility",
        combinability: ["pixelateScreen", "blur", "scanlines", "colorGrading"],
    },
};
//# sourceMappingURL=resize.meta.js.map