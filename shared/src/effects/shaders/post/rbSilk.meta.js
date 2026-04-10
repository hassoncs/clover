import rbSilk from "./rbSilk.glsl";
export const meta = {
    id: "rbSilk",
    glsl: rbSilk,
    paramsSchema: [
        {
            key: "u_color",
            uniformName: "u_color",
            type: "color",
            defaultValue: [0.4824, 0.4549, 0.5059, 1.0],
            ui: { displayName: "Color" },
        },
        {
            key: "u_speed",
            uniformName: "u_speed",
            type: "float",
            defaultValue: 5.0,
            ui: { displayName: "Speed", min: 0.0, max: 10.0, step: 0.1 },
        },
        {
            key: "u_scale",
            uniformName: "u_scale",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Scale", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "u_rotation",
            uniformName: "u_rotation",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Rotation", min: -6.2832, max: 6.2832, step: 0.01 },
        },
        {
            key: "u_noise_intensity",
            uniformName: "u_noise_intensity",
            type: "float",
            defaultValue: 1.5,
            ui: { displayName: "Noise Intensity", min: 0.0, max: 3.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits silk-style flowing fabric generator with rotational warping and grain noise",
        aliases: [
            "react bits silk",
            "fabric flow",
            "cloth waves",
            "smooth ribbons",
            "soft texture",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "colorGrading", "chromaticAberration"],
    },
};
//# sourceMappingURL=rbSilk.meta.js.map