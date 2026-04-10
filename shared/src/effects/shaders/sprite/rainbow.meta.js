import rainbow from "./rainbow.glsl";
export const meta = {
    id: "rainbow",
    glsl: rainbow,
    paramsSchema: [
        {
            key: "speed",
            uniformName: "speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "saturation_boost",
            uniformName: "saturation_boost",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Saturation Boost", min: 0.0, max: 1.0, step: 0.05 },
        },
        {
            key: "use_uv_offset",
            uniformName: "use_uv_offset",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "UV-Based Offset" },
        },
        {
            key: "uv_scale",
            uniformName: "uv_scale",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "UV Scale", min: 0.0, max: 5.0, step: 0.1 },
        },
    ],
    aiHints: {
        description: "Animated rainbow hue-cycling effect that shifts all colors through the spectrum over time",
        aliases: [
            "rainbow cycle",
            "hue rotate",
            "color cycle",
            "spectrum",
            "iridescent",
        ],
        category: "color",
        combinability: ["glow", "outline", "pixelate", "holographic"],
    },
};
//# sourceMappingURL=rainbow.meta.js.map