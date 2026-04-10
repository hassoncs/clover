import dropShadow from "./dropShadow.glsl";
export const meta = {
    id: "dropShadow",
    glsl: dropShadow,
    paramsSchema: [
        {
            key: "shadow_color",
            uniformName: "shadow_color",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 0.5],
            ui: { displayName: "Shadow Color" },
        },
        {
            key: "shadow_offset",
            uniformName: "shadow_offset",
            type: "vec2",
            defaultValue: [4.0, 4.0],
            ui: { displayName: "Shadow Offset" },
        },
        {
            key: "shadow_blur",
            uniformName: "shadow_blur",
            type: "float",
            defaultValue: 2.0,
            ui: { displayName: "Shadow Blur", min: 0.0, max: 10.0, step: 0.5 },
        },
        {
            key: "shadow_only",
            uniformName: "shadow_only",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Shadow Only" },
        },
    ],
    aiHints: {
        description: "Renders a blurred offset shadow behind the sprite for a floating depth effect",
        aliases: ["shadow", "cast shadow", "depth shadow", "floating shadow"],
        category: "composite",
        combinability: ["outline", "glow", "tint", "silhouette"],
    },
};
//# sourceMappingURL=dropShadow.meta.js.map