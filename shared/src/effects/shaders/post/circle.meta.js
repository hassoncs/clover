import circle from "./circle.glsl";
export const meta = {
    id: "circle",
    glsl: circle,
    paramsSchema: [
        {
            key: "radius",
            uniformName: "radius",
            type: "float",
            defaultValue: 0.4,
            ui: { displayName: "Radius", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "softness",
            uniformName: "softness",
            type: "float",
            defaultValue: 0.02,
            ui: { displayName: "Softness", min: 0.0, max: 0.5, step: 0.005 },
        },
        {
            key: "fill_color",
            uniformName: "fill_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Fill Color" },
        },
        {
            key: "bg_color",
            uniformName: "bg_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 0.0],
            ui: { displayName: "Background Color" },
        },
        {
            key: "center",
            uniformName: "center",
            type: "vec2",
            defaultValue: [0.5, 0.5],
            ui: { displayName: "Center" },
        },
        {
            key: "ring_width",
            uniformName: "ring_width",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Ring Width", min: 0.0, max: 0.5, step: 0.005 },
        },
    ],
    aiHints: {
        description: "Procedural circle and ring generator with adjustable radius, softness, center, and foreground/background colors",
        aliases: ["circle", "ring", "dot", "spotlight"],
        category: "generator",
        combinability: ["lfo", "ramp", "blur", "bloom", "vignette"],
    },
};
//# sourceMappingURL=circle.meta.js.map