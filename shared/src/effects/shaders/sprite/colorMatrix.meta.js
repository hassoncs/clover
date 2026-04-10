import colorMatrix from "./colorMatrix.glsl";
export const meta = {
    id: "colorMatrix",
    glsl: colorMatrix,
    paramsSchema: [
        {
            key: "row_red",
            uniformName: "row_red",
            type: "vec4",
            defaultValue: [1.0, 0.0, 0.0, 0.0],
            ui: { displayName: "Red Row" },
        },
        {
            key: "row_green",
            uniformName: "row_green",
            type: "vec4",
            defaultValue: [0.0, 1.0, 0.0, 0.0],
            ui: { displayName: "Green Row" },
        },
        {
            key: "row_blue",
            uniformName: "row_blue",
            type: "vec4",
            defaultValue: [0.0, 0.0, 1.0, 0.0],
            ui: { displayName: "Blue Row" },
        },
        {
            key: "preset",
            uniformName: "preset",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Preset",
                min: 0,
                max: 7,
                step: 1,
                options: [
                    "custom",
                    "grayscale",
                    "sepia",
                    "invert",
                    "deuteranopia",
                    "protanopia",
                    "tritanopia",
                    "high contrast",
                ],
            },
        },
    ],
    aiHints: {
        description: "Applies a 3x4 color transformation matrix with presets for grayscale, sepia, invert, and color-blind simulations",
        aliases: [
            "color transform",
            "grayscale",
            "sepia",
            "invert colors",
            "color blind",
        ],
        category: "color",
        combinability: ["tint", "posterize", "vignette", "bloom"],
    },
};
//# sourceMappingURL=colorMatrix.meta.js.map