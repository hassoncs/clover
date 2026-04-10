import speedLines from "./speedLines.glsl";
export const meta = {
    id: "speedLines",
    glsl: speedLines,
    paramsSchema: [
        {
            key: "intensity",
            uniformName: "intensity",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
        },
        {
            key: "density",
            uniformName: "density",
            type: "float",
            defaultValue: 0.2,
            ui: { displayName: "Density", min: 0.0, max: 1.0, step: 0.05 },
        },
        {
            key: "speed",
            uniformName: "speed",
            type: "float",
            defaultValue: 2.0,
            ui: { displayName: "Speed", min: 0.1, max: 10.0, step: 0.5 },
        },
        {
            key: "center",
            uniformName: "center",
            type: "vec2",
            defaultValue: [0.5, 0.5],
            ui: { displayName: "Center" },
        },
    ],
    aiHints: {
        description: "Anime-style radial speed lines emanating from a center point to convey motion or impact",
        aliases: [
            "zoom lines",
            "action lines",
            "manga lines",
            "impact lines",
            "anime speed",
        ],
        category: "generator",
        combinability: [
            "vignette",
            "chromaticAberration",
            "motionBlur",
            "shockwave",
        ],
    },
};
//# sourceMappingURL=speedLines.meta.js.map