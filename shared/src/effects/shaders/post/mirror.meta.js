import mirror from "./mirror.glsl";
export const meta = {
    id: "mirror",
    glsl: mirror,
    paramsSchema: [
        {
            key: "mirror_x",
            uniformName: "mirror_x",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Mirror X" },
        },
        {
            key: "mirror_y",
            uniformName: "mirror_y",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Mirror Y" },
        },
        {
            key: "mirror_mode",
            uniformName: "mirror_mode",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Mirror Mode",
                min: 0,
                max: 1,
                step: 1,
                options: ["flip", "symmetry"],
            },
        },
    ],
    aiHints: {
        description: "Flips the screen on X/Y axes or mirrors halves into symmetry mode for reflective looks",
        aliases: ["flip", "mirror", "reflect", "symmetry", "kaleidoscope simple"],
        category: "distort",
        combinability: ["chromaticAberration", "glitch", "vignette", "scanlines"],
    },
};
//# sourceMappingURL=mirror.meta.js.map