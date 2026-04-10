import crossFade from "./crossFade.glsl";
export const meta = {
    id: "crossFade",
    glsl: crossFade,
    paramsSchema: [
        {
            key: "mix_amount",
            uniformName: "mix_amount",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Mix Amount", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "fade_color",
            uniformName: "fade_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Fade Color" },
        },
        {
            key: "use_color",
            uniformName: "use_color",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Use Color" },
        },
        {
            key: "fade_mode",
            uniformName: "fade_mode",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Fade Mode",
                min: 0,
                max: 3,
                step: 1,
                options: ["linear", "smooth", "ease_in", "ease_out"],
            },
        },
    ],
    aiHints: {
        description: "Crossfades the current screen toward a target color using linear, smooth, ease-in, or ease-out curves",
        aliases: ["crossfade", "lerp", "fade", "dissolve to", "mix"],
        category: "composite",
        combinability: ["vignette", "colorGrading", "blur", "bloom"],
    },
};
//# sourceMappingURL=crossFade.meta.js.map