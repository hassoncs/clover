import rbDarkVeil from "./rbDarkVeil.glsl";
export const meta = {
    id: "rbDarkVeil",
    glsl: rbDarkVeil,
    paramsSchema: [
        {
            key: "u_hue_shift",
            uniformName: "u_hue_shift",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Hue Shift", min: -180.0, max: 180.0, step: 1.0 },
        },
        {
            key: "u_noise",
            uniformName: "u_noise",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Noise", min: 0.0, max: 0.3, step: 0.005 },
        },
        {
            key: "u_scan",
            uniformName: "u_scan",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Scan", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "u_scan_freq",
            uniformName: "u_scan_freq",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Scan Freq", min: 0.0, max: 0.5, step: 0.005 },
        },
        {
            key: "u_warp",
            uniformName: "u_warp",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Warp", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits dark veil generator with moody layered noise, hue rotation, and scanline modulation",
        aliases: [
            "react bits dark veil",
            "moody fog",
            "dark ambient",
            "scanline veil",
            "cyber mist",
        ],
        category: "generator",
        combinability: ["vignette", "chromaticAberration", "oldFilm", "bloom"],
    },
};
//# sourceMappingURL=rbDarkVeil.meta.js.map