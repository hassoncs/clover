import pixelateScreen from "./pixelateScreen.glsl";
export const meta = {
    id: "pixelateScreen",
    glsl: pixelateScreen,
    paramsSchema: [
        {
            key: "pixel_size",
            uniformName: "pixel_size",
            type: "float",
            defaultValue: 4.0,
            ui: { displayName: "Pixel Size", min: 1.0, max: 32.0, step: 1.0 },
        },
        {
            key: "color_reduction",
            uniformName: "color_reduction",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Color Reduction" },
        },
        {
            key: "color_levels",
            uniformName: "color_levels",
            type: "float",
            defaultValue: 8.0,
            ui: { displayName: "Color Levels", min: 2.0, max: 32.0, step: 1.0 },
        },
        {
            key: "dithering",
            uniformName: "dithering",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Dithering" },
        },
    ],
    aiHints: {
        description: "Full-screen pixelation with optional color palette reduction and Bayer dithering for retro game looks",
        aliases: [
            "screen pixelate",
            "retro screen",
            "low resolution",
            "chunky pixels",
            "gameboy",
        ],
        category: "artistic",
        combinability: ["scanlines", "posterize", "crt", "colorGrading"],
    },
};
//# sourceMappingURL=pixelateScreen.meta.js.map