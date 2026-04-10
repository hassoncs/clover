import rbLightRays from "./rbLightRays.glsl";
export const meta = {
    id: "rbLightRays",
    glsl: rbLightRays,
    paramsSchema: [
        {
            key: "u_rays_color",
            uniformName: "u_rays_color",
            type: "color",
            defaultValue: [1.0, 1.0, 1.0, 1.0],
            ui: { displayName: "Rays Color" },
        },
        {
            key: "u_rays_speed",
            uniformName: "u_rays_speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Rays Speed", min: 0.0, max: 5.0, step: 0.01 },
        },
        {
            key: "u_light_spread",
            uniformName: "u_light_spread",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Light Spread", min: 0.05, max: 3.0, step: 0.01 },
        },
        {
            key: "u_ray_length",
            uniformName: "u_ray_length",
            type: "float",
            defaultValue: 2.0,
            ui: { displayName: "Ray Length", min: 0.1, max: 4.0, step: 0.01 },
        },
        {
            key: "u_fade_distance",
            uniformName: "u_fade_distance",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Fade Distance", min: 0.1, max: 3.0, step: 0.01 },
        },
        {
            key: "u_noise_amount",
            uniformName: "u_noise_amount",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Noise Amount", min: 0.0, max: 1.0, step: 0.01 },
        },
        {
            key: "u_distortion",
            uniformName: "u_distortion",
            type: "float",
            defaultValue: 0.0,
            ui: { displayName: "Distortion", min: 0.0, max: 2.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits light rays generator with directional shafts, depth fade, and optional distortion",
        aliases: [
            "react bits light rays",
            "god rays",
            "sun beams",
            "volumetric light",
            "light shafts",
        ],
        category: "generator",
        combinability: ["bloom", "vignette", "chromaticAberration", "colorGrading"],
    },
};
//# sourceMappingURL=rbLightRays.meta.js.map