import rbFloatingLines from "./rbFloatingLines.glsl";
export const meta = {
    id: "rbFloatingLines",
    glsl: rbFloatingLines,
    paramsSchema: [
        {
            key: "u_animation_speed",
            uniformName: "u_animation_speed",
            type: "float",
            defaultValue: 1.0,
            ui: { displayName: "Animation Speed", min: 0.0, max: 5.0, step: 0.01 },
        },
        {
            key: "u_bend_radius",
            uniformName: "u_bend_radius",
            type: "float",
            defaultValue: 5.0,
            ui: { displayName: "Bend Radius", min: 0.5, max: 20.0, step: 0.1 },
        },
        {
            key: "u_bend_strength",
            uniformName: "u_bend_strength",
            type: "float",
            defaultValue: -0.5,
            ui: { displayName: "Bend Strength", min: -2.0, max: 2.0, step: 0.01 },
        },
        {
            key: "u_parallax_strength",
            uniformName: "u_parallax_strength",
            type: "float",
            defaultValue: 0.2,
            ui: { displayName: "Parallax Strength", min: 0.0, max: 1.0, step: 0.01 },
        },
    ],
    aiHints: {
        description: "React Bits floating lines generator with cursor bending and layered parallax wave ribbons",
        aliases: [
            "react bits floating lines",
            "wave ribbons",
            "neon strands",
            "line field",
            "flow lines",
        ],
        category: "generator",
        combinability: ["vignette", "bloom", "colorGrading", "chromaticAberration"],
    },
};
//# sourceMappingURL=rbFloatingLines.meta.js.map