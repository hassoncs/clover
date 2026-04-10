import kaleidoscope from "./kaleidoscope.glsl";
export const meta = {
    id: "kaleidoscope",
    glsl: kaleidoscope,
    paramsSchema: [
        {
            key: "segments",
            uniformName: "segments",
            type: "float",
            defaultValue: 6.0,
            ui: { displayName: "Segments", min: 2.0, max: 32.0, step: 1.0 },
        },
        {
            key: "rotation",
            uniformName: "rotation",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Rotation", min: 0.0, max: 360.0, step: 1.0 },
        },
        {
            key: "center",
            uniformName: "center",
            type: "vec2",
            defaultValue: [0.5, 0.5],
            ui: { displayName: "Center" },
        },
        {
            key: "zoom",
            uniformName: "zoom",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Zoom", min: 0.5, max: 3.0, step: 0.05 },
        },
    ],
    aiHints: {
        description: "Rotational mirror symmetry effect that folds the screen into kaleidoscopic mandala segments",
        aliases: [
            "kaleidoscope",
            "mirror symmetry",
            "mandala",
            "rotational symmetry",
        ],
        category: "distort",
        combinability: ["filmGrain", "colorGrading", "duotone", "vignette"],
    },
};
//# sourceMappingURL=kaleidoscope.meta.js.map