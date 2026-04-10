import rbOrb from "./rbOrb.glsl";
export const meta = {
    id: "rbOrb",
    glsl: rbOrb,
    paramsSchema: [
        {
            key: "u_hue_shift",
            uniformName: "u_hue_shift",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Hue Shift", min: 0.0, max: 360.0, step: 1.0 },
        },
        {
            key: "u_hover_intensity",
            uniformName: "u_hover_intensity",
            type: "float",
            defaultValue: 0.2,
            ui: { displayName: "Hover Intensity", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "u_rotation",
            uniformName: "u_rotation",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Rotation", min: -6.2832, max: 6.2832, step: 0.01 },
        },
        {
            key: "u_background_color",
            uniformName: "u_background_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Background Color" },
        },
    ],
    aiHints: {
        description: "React Bits orb generator with simplex-noise lighting lobes, hue rotation, and hover-reactive flow",
        aliases: [
            "react bits orb",
            "glowing orb",
            "energy sphere",
            "plasma orb",
            "noise sphere",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "chromaticAberration", "colorGrading"],
    },
};
//# sourceMappingURL=rbOrb.meta.js.map