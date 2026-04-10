import rbGradientBlinds from "./rbGradientBlinds.glsl";
export const meta = {
    id: "rbGradientBlinds",
    glsl: rbGradientBlinds,
    paramsSchema: [
        {
            key: "u_angle",
            uniformName: "u_angle",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Angle", min: -180.0, max: 180.0, step: 1.0 },
        },
        {
            key: "u_noise",
            uniformName: "u_noise",
            type: "float",
            defaultValue: 0.3,
            ui: { displayName: "Noise", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "u_blind_count",
            uniformName: "u_blind_count",
            type: "float",
            defaultValue: 16.0,
            ui: { displayName: "Blind Count", min: 1.0, max: 64.0, step: 1.0 },
        },
        {
            key: "u_distort",
            uniformName: "u_distort",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Distort", min: 0.0, max: 4.0, step: 0.01 },
        },
        {
            key: "u_spotlight_opacity",
            uniformName: "u_spotlight_opacity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Spotlight Opacity", min: 0.0, max: 2.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits gradient blinds generator with rotated stripe subtraction, spotlight falloff, and optional distortion noise",
        aliases: [
            "react bits gradient blinds",
            "striped gradient",
            "venetian blinds",
            "spotlight gradient",
            "banded backdrop",
        ],
        category: "generator",
        combinability: ["vignette", "chromaticAberration", "blur", "colorGrading"],
    },
};
//# sourceMappingURL=rbGradientBlinds.meta.js.map