import channelMix from "./channelMix.glsl";
export const meta = {
    id: "channelMix",
    glsl: channelMix,
    paramsSchema: [
        {
            key: "red_source",
            uniformName: "red_source",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Red Source",
                min: 0,
                max: 6,
                step: 1,
                options: ["R", "G", "B", "A", "luminance", "zero", "one"],
            },
        },
        {
            key: "green_source",
            uniformName: "green_source",
            type: "int",
            defaultValue: 1,
            ui: {
                displayName: "Green Source",
                min: 0,
                max: 6,
                step: 1,
                options: ["R", "G", "B", "A", "luminance", "zero", "one"],
            },
        },
        {
            key: "blue_source",
            uniformName: "blue_source",
            type: "int",
            defaultValue: 2,
            ui: {
                displayName: "Blue Source",
                min: 0,
                max: 6,
                step: 1,
                options: ["R", "G", "B", "A", "luminance", "zero", "one"],
            },
        },
        {
            key: "alpha_source",
            uniformName: "alpha_source",
            type: "int",
            defaultValue: 3,
            ui: {
                displayName: "Alpha Source",
                min: 0,
                max: 6,
                step: 1,
                options: ["R", "G", "B", "A", "luminance", "zero", "one"],
            },
        },
        {
            key: "invert_r",
            uniformName: "invert_r",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Invert Red" },
        },
        {
            key: "invert_g",
            uniformName: "invert_g",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Invert Green" },
        },
        {
            key: "invert_b",
            uniformName: "invert_b",
            type: "bool",
            defaultValue: false,
            ui: { displayName: "Invert Blue" },
        },
    ],
    aiHints: {
        description: "Remaps RGBA outputs from selectable channel sources including luminance, constants, and optional channel inversion",
        aliases: [
            "channel swap",
            "swizzle",
            "channel mix",
            "reorder",
            "extract channel",
        ],
        category: "utility",
        combinability: ["colorGrading", "invert", "edge", "vignette"],
    },
};
//# sourceMappingURL=channelMix.meta.js.map