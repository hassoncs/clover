import rbLiquidChrome from "./rbLiquidChrome.glsl";
export const meta = {
    id: "rbLiquidChrome",
    glsl: rbLiquidChrome,
    paramsSchema: [
        {
            key: "u_base_color",
            uniformName: "u_base_color",
            type: "color",
            defaultValue: [0.1, 0.1, 0.1, 1.0],
            ui: { displayName: "Base Color" },
        },
        {
            key: "u_amplitude",
            uniformName: "u_amplitude",
            type: "float",
            defaultValue: 0.3,
            ui: { displayName: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "u_frequency_x",
            uniformName: "u_frequency_x",
            type: "float",
            defaultValue: 3.0,
            ui: { displayName: "Frequency X", min: 0.1, max: 10.0, step: 0.1 },
        },
        {
            key: "u_frequency_y",
            uniformName: "u_frequency_y",
            type: "float",
            defaultValue: 3.0,
            ui: { displayName: "Frequency Y", min: 0.1, max: 10.0, step: 0.1 },
        },
    ],
    aiHints: {
        description: "Liquid chrome distortion generator with recursive wave advection and localized ripple response",
        aliases: [
            "react bits liquid chrome",
            "molten metal",
            "chrome fluid",
            "liquid distortion",
            "mercury",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "chromaticAberration", "scanlines"],
    },
};
//# sourceMappingURL=rbLiquidChrome.meta.js.map