import over from "./over.glsl";
export const meta = {
    id: "over",
    glsl: over,
    paramsSchema: [
        {
            key: "overlay_color",
            uniformName: "overlay_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 0.5],
            ui: { displayName: "Overlay Color" },
        },
        {
            key: "blend_mode",
            uniformName: "blend_mode",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Blend Mode",
                min: 0,
                max: 4,
                step: 1,
                options: ["normal", "multiply", "screen", "overlay", "softlight"],
            },
        },
        {
            key: "opacity",
            uniformName: "opacity",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "Composites a colored overlay over the screen with alpha and multiple blend modes",
        aliases: ["overlay", "layer", "composite over", "alpha blend"],
        category: "composite",
        combinability: ["colorGrading", "vignette", "blur", "scanlines"],
    },
};
//# sourceMappingURL=over.meta.js.map