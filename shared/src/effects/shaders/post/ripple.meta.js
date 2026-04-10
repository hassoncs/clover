import ripple from "./ripple.glsl";
export const meta = {
    id: "ripple",
    glsl: ripple,
    paramsSchema: [
        {
            key: "intensity",
            uniformName: "intensity",
            type: "float",
            defaultValue: 0.02,
            ui: { displayName: "Intensity", min: 0.0, max: 0.1, step: 0.005 },
        },
        {
            key: "speed",
            uniformName: "speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "use_noise_fallback",
            uniformName: "use_noise_fallback",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Use Noise Fallback" },
        },
    ],
    aiHints: {
        description: "Data-driven or procedural ripple distortion, ideal for water surfaces or entity-triggered displacement",
        aliases: [
            "water ripple",
            "pond ripple",
            "surface distortion",
            "wave field",
        ],
        category: "distort",
        combinability: ["underwater", "blur", "shimmer", "vignette"],
    },
};
//# sourceMappingURL=ripple.meta.js.map