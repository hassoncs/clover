import flash from "./flash.glsl";
export const meta = {
    id: "flash",
    glsl: flash,
    paramsSchema: [
        {
            key: "flash_color",
            uniformName: "flash_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Flash Color" },
        },
        {
            key: "flash_amount",
            uniformName: "flash_amount",
            type: "float",
            defaultValue: 0.5,
            ui: { displayName: "Flash Amount", min: 0.0, max: 1.0, step: 0.05 },
        },
    ],
    aiHints: {
        description: "Flashes the sprite toward a solid color, commonly used for hit/damage feedback",
        aliases: ["hit flash", "damage flash", "white flash", "blink"],
        category: "color",
        combinability: ["tint", "glow", "outline"],
    },
};
//# sourceMappingURL=flash.meta.js.map