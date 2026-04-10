import ascii from "./ascii.glsl";
export const meta = {
    id: "ascii",
    glsl: ascii,
    paramsSchema: [
        {
            key: "pixel_size",
            uniformName: "pixel_size",
            type: "float",
            defaultValue: 8.0,
            ui: { displayName: "Character Size", min: 4.0, max: 32.0, step: 1.0 },
        },
        {
            key: "monochrome",
            uniformName: "monochrome",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Monochrome" },
        },
        {
            key: "color",
            uniformName: "color",
            type: "color",
            defaultValue: [0.0, 1.0, 0.0, 1.0],
            ui: { displayName: "Tint Color" },
        },
    ],
    aiHints: {
        description: "Converts the screen to ASCII-style art using SDF shapes mapped to luminance (dots, crosses, blocks)",
        aliases: [
            "text art",
            "character art",
            "terminal art",
            "matrix style",
            "typewriter",
        ],
        category: "artistic",
        combinability: ["scanlines", "crt", "vignette", "colorGrading"],
    },
};
//# sourceMappingURL=ascii.meta.js.map