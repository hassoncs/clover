import mosaic from "./mosaic.glsl";
export const meta = {
    id: "mosaic",
    glsl: mosaic,
    paramsSchema: [
        {
            key: "cell_size",
            uniformName: "cell_size",
            type: "float",
            defaultValue: 20.0,
            ui: { displayName: "Cell Size", min: 5.0, max: 100.0, step: 1.0 },
        },
        {
            key: "edge_width",
            uniformName: "edge_width",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Edge Width", min: 0.0, max: 5.0, step: 0.1 },
        },
        {
            key: "edge_color",
            uniformName: "edge_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Edge Color" },
        },
        {
            key: "randomness",
            uniformName: "randomness",
            type: "float",
            defaultValue: 0.8,
            ui: { displayName: "Randomness", min: 0.0, max: 1.0, step: 0.05 },
        },
        {
            key: "round_cells",
            uniformName: "round_cells",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Round Cells" },
        },
    ],
    aiHints: {
        description: "Voronoi-inspired stained-glass mosaic that flattens color within cells and outlines boundaries",
        aliases: [
            "mosaic",
            "voronoi",
            "stained glass",
            "crystallize",
            "cell shade",
        ],
        category: "artistic",
        combinability: ["duotone", "gradientMap", "filmGrain", "vignette"],
    },
};
//# sourceMappingURL=mosaic.meta.js.map