import edge from "./edge.glsl";
export const meta = {
    id: "edge",
    glsl: edge,
    paramsSchema: [
        {
            key: "strength",
            uniformName: "strength",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Strength", min: 0.0, max: 5.0, step: 0.05 },
        },
        {
            key: "threshold",
            uniformName: "threshold",
            type: "float",
            defaultValue: 0.1,
            ui: { displayName: "Threshold", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "edge_color",
            uniformName: "edge_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Edge Color" },
        },
        {
            key: "bg_color",
            uniformName: "bg_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Background Color" },
        },
        {
            key: "use_luminance",
            uniformName: "use_luminance",
            type: "bool",
            defaultValue: true,
            ui: { displayName: "Use Luminance" },
        },
    ],
    aiHints: {
        description: "Sobel edge detection that extracts contours with thresholding and stylized edge/background coloring",
        aliases: ["sobel", "outline detect", "contour", "sketch", "edge detect"],
        category: "artistic",
        combinability: ["colorGrading", "vignette", "pixelateScreen", "scanlines"],
    },
};
//# sourceMappingURL=edge.meta.js.map