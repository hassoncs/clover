import thermalVision from "./thermalVision.glsl";
export const meta = {
    id: "thermalVision",
    glsl: thermalVision,
    paramsSchema: [
        {
            key: "intensity",
            uniformName: "intensity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
        },
    ],
    aiHints: {
        description: "Maps screen luminance to a thermal heat-map gradient from deep blue (cold) to white (hot)",
        aliases: ["heat vision", "infrared", "heat map", "thermal camera", "FLIR"],
        category: "color",
        combinability: ["vignette", "scanlines", "blur", "nightVision"],
    },
};
//# sourceMappingURL=thermalVision.meta.js.map