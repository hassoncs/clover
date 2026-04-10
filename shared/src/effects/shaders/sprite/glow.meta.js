import glow from "./glow.glsl";
export const meta = {
    id: "glow",
    glsl: glow,
    paramsSchema: [
        {
            key: "glow_color",
            uniformName: "glow_color",
            type: "color",
            defaultValue: [1.0, 0.8, 0.2, 1.0],
            ui: { displayName: "Glow Color" },
        },
        {
            key: "glow_intensity",
            uniformName: "glow_intensity",
            type: "float",
            defaultValue: 1.5,
            ui: { displayName: "Glow Intensity", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "glow_size",
            uniformName: "glow_size",
            type: "float",
            defaultValue: 4.0,
            ui: { displayName: "Glow Size", min: 1.0, max: 20.0, step: 0.5 },
        },
        {
            key: "pulse_speed",
            uniformName: "pulse_speed",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Pulse Speed", min: 0.0, max: 10.0, step: 0.5 },
        },
    ],
    aiHints: {
        description: "Adds a soft luminous outer glow around the sprite edges, with optional pulsing animation",
        aliases: ["outer glow", "aura", "halo", "luminance", "neon glow"],
        category: "glow",
        combinability: ["outline", "tint", "bloom", "rimLight", "innerGlow"],
    },
};
//# sourceMappingURL=glow.meta.js.map