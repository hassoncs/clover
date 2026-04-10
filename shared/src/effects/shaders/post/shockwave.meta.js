import shockwave from "./shockwave.glsl";
export const meta = {
    id: "shockwave",
    glsl: shockwave,
    paramsSchema: [
        {
            key: "center",
            uniformName: "center",
            type: "vec2",
            defaultValue: [0.5, 0.5],
            ui: { displayName: "Center" },
        },
        {
            key: "radius",
            uniformName: "radius",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Radius", min: 0.0, max: 2.0, step: 0.01 },
        },
        {
            key: "thickness",
            uniformName: "thickness",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Thickness", min: 0.0, max: 0.5, step: 0.01 },
        },
        {
            key: "amplitude",
            uniformName: "amplitude",
            type: "float",
            defaultValue: 0.03,
            ui: { displayName: "Amplitude", min: 0.0, max: 0.1, step: 0.005 },
        },
        {
            key: "distortion_type",
            uniformName: "distortion_type",
            type: "float",
            defaultValue: 0,
            ui: {
                displayName: "Distortion Type",
                min: 0,
                max: 2,
                step: 1,
                options: ["outward", "inward", "wave"],
            },
        },
    ],
    aiHints: {
        description: "Expanding ring distortion emanating from a center point, like a ripple from an explosion",
        aliases: [
            "explosion ring",
            "ripple wave",
            "impact wave",
            "blast wave",
            "pulse ring",
        ],
        category: "distort",
        combinability: ["chromaticAberration", "bloom", "speedLines", "vignette"],
    },
};
//# sourceMappingURL=shockwave.meta.js.map