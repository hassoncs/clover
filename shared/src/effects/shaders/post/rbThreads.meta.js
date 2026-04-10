import rbThreads from "./rbThreads.glsl";
export const meta = {
    id: "rbThreads",
    glsl: rbThreads,
    paramsSchema: [
        {
            key: "u_color",
            uniformName: "u_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Color" },
        },
        {
            key: "u_amplitude",
            uniformName: "u_amplitude",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Amplitude", min: 0.0, max: 2.0, step: 0.01 },
        },
        {
            key: "u_distance",
            uniformName: "u_distance",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Distance", min: -1.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "Layered thread-line generator using Perlin-driven strand offsets and alpha-composited filament density",
        aliases: [
            "react bits threads",
            "fiber lines",
            "string field",
            "woven strands",
            "line mesh",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "colorGrading", "scanlines"],
    },
};
//# sourceMappingURL=rbThreads.meta.js.map