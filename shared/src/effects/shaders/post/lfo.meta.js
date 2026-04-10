import lfo from "./lfo.glsl";
export const meta = {
    id: "lfo",
    glsl: lfo,
    paramsSchema: [
        {
            key: "frequency",
            uniformName: "frequency",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Frequency", min: 0.1, max: 20.0, step: 0.1 },
        },
        {
            key: "amplitude",
            uniformName: "amplitude",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "phase",
            uniformName: "phase",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Phase", min: 0.0, max: 6.28, step: 0.01 },
        },
        {
            key: "waveform",
            uniformName: "waveform",
            type: "int",
            defaultValue: 0,
            ui: {
                displayName: "Waveform",
                min: 0,
                max: 3,
                step: 1,
                options: ["sine", "square", "triangle", "sawtooth"],
            },
        },
        {
            key: "color_low",
            uniformName: "color_low",
            type: "color",
            defaultValue: [0.0, 0.0, 0.0, 1.0],
            ui: { displayName: "Low Color" },
        },
        {
            key: "color_high",
            uniformName: "color_high",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "High Color" },
        },
    ],
    aiHints: {
        description: "Low frequency oscillator generator with sine, square, triangle, or sawtooth waveforms mapped between two colors",
        aliases: ["oscillator", "wave", "pulse", "breathing"],
        category: "generator",
        combinability: [
            "blur",
            "bloom",
            "chromaticAberration",
            "vignette",
            "level",
        ],
    },
};
//# sourceMappingURL=lfo.meta.js.map