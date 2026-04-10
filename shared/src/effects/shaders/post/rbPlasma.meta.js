import rbPlasma from "./rbPlasma.glsl";
export const meta = {
    id: "rbPlasma",
    glsl: rbPlasma,
    paramsSchema: [
        {
            key: "u_color",
            uniformName: "u_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Color" },
        },
        {
            key: "u_speed",
            uniformName: "u_speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.01 },
        },
        {
            key: "u_direction",
            uniformName: "u_direction",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Direction", min: -1.0, max: 1.0, step: 2.0 },
        },
        {
            key: "u_scale",
            uniformName: "u_scale",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Scale", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "u_opacity",
            uniformName: "u_opacity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits plasma generator with volumetric field marching, tint control, and directional time flow",
        aliases: [
            "react bits plasma",
            "plasma field",
            "volumetric swirl",
            "neon cloud",
            "energy haze",
        ],
        category: "generator",
        combinability: ["bloom", "vignette", "chromaticAberration", "motionBlur"],
    },
};
//# sourceMappingURL=rbPlasma.meta.js.map