import dissolve from "./dissolve.glsl";
export const meta = {
    id: "dissolve",
    glsl: dissolve,
    paramsSchema: [
        {
            key: "dissolve_amount",
            uniformName: "dissolve_amount",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Dissolve Amount", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "edge_width",
            uniformName: "edge_width",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Edge Width", min: 0.0, max: 0.3, step: 0.01 },
        },
        {
            key: "edge_color",
            uniformName: "edge_color",
            type: "color",
            defaultValue: [1.0, 0.5, 0.0, 1.0],
            ui: { displayName: "Edge Color" },
        },
        {
            key: "edge_color_2",
            uniformName: "edge_color_2",
            type: "color",
            defaultValue: [1.0, 1.0, 0.0, 1.0],
            ui: { displayName: "Edge Color 2" },
        },
        {
            key: "noise_scale",
            uniformName: "noise_scale",
            type: "float",
            defaultValue: 10.0,
            ui: { displayName: "Noise Scale", min: 1.0, max: 50.0, step: 1.0 },
        },
        {
            key: "use_gradient_edge",
            uniformName: "use_gradient_edge",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Gradient Edge" },
        },
    ],
    aiHints: {
        description: "Noise-based dissolve transition that eats away the sprite with a colored burning edge",
        aliases: ["burn away", "disintegrate", "fade noise", "erode", "crumble"],
        category: "distort",
        combinability: ["glow", "tint", "flash"],
    },
};
//# sourceMappingURL=dissolve.meta.js.map