import rbColorBends from "./rbColorBends.glsl";
export const meta = {
    id: "rbColorBends",
    glsl: rbColorBends,
    paramsSchema: [
        {
            key: "u_speed",
            uniformName: "u_speed",
            type: "float",
            defaultValue: 0.2,
            ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.01 },
        },
        {
            key: "u_scale",
            uniformName: "u_scale",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Scale", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "u_frequency",
            uniformName: "u_frequency",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Frequency", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "u_warp_strength",
            uniformName: "u_warp_strength",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Warp Strength", min: 0.0, max: 2.0, step: 0.01 },
        },
        {
            key: "u_mouse_influence",
            uniformName: "u_mouse_influence",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Mouse Influence", min: 0.0, max: 2.0, step: 0.01 },
        },
        {
            key: "u_parallax",
            uniformName: "u_parallax",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Parallax", min: 0.0, max: 2.0, step: 0.01 },
        },
        {
            key: "u_noise",
            uniformName: "u_noise",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Noise", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits color bends generator with psychedelic warping and pointer-reactive parallax",
        aliases: [
            "react bits color bends",
            "psychedelic bands",
            "warped rainbow",
            "color flow",
            "liquid gradient",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "chromaticAberration", "oldFilm"],
    },
};
//# sourceMappingURL=rbColorBends.meta.js.map