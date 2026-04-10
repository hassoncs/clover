import crop from "./crop.glsl";
export const meta = {
    id: "crop",
    glsl: crop,
    paramsSchema: [
        {
            key: "left",
            uniformName: "left",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Left", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "right",
            uniformName: "right",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Right", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "top",
            uniformName: "top",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Top", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "bottom",
            uniformName: "bottom",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Bottom", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "fill_color",
            uniformName: "fill_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Fill Color" },
        },
    ],
    aiHints: {
        description: "Crops to a rectangular UV region and fills outside pixels with a configurable color",
        aliases: ["crop", "trim", "cut", "region", "sub-image"],
        category: "utility",
        combinability: ["resize", "colorGrading", "vignette", "blur"],
    },
};
//# sourceMappingURL=crop.meta.js.map