import blur from "./blur.glsl";
export const meta = {
    id: "blur",
    glsl: blur,
    paramsSchema: [
        {
            key: "blur_amount",
            uniformName: "blur_amount",
            type: "float",
            defaultValue: 2.0,
            ui: { displayName: "Blur Amount", min: 0.0, max: 10.0, step: 0.5 },
        },
    ],
    aiHints: {
        description: "Gaussian blur using a 5x5 weighted kernel to soften the entire screen image",
        aliases: ["gaussian blur", "soften", "smooth", "defocus"],
        category: "blur",
        combinability: ["vignette", "bloom", "scanlines", "crt", "colorGrading"],
    },
};
//# sourceMappingURL=blur.meta.js.map