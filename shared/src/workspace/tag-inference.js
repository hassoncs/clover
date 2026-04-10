const ALL_TAGS = [
    "world",
    "prefabs",
    "entities",
    "scripts",
    "effects",
    "assets",
];
const TAG_RULES = [
    { test: (p) => p === "slopcade.json", tags: ALL_TAGS },
    { test: (p) => p === "world.json", tags: ["world"] },
    { test: (p) => p === "entities.json", tags: ["entities"] },
    {
        test: (p) => p.startsWith("prefabs/") && p.endsWith(".json"),
        tags: ["prefabs"],
    },
    {
        test: (p) => p.startsWith("scripts/") && p.endsWith(".js"),
        tags: ["scripts"],
    },
    {
        test: (p) => p.startsWith("effects/") && p.endsWith(".json"),
        tags: ["effects"],
    },
    {
        test: (p) => p.startsWith("shaders/") && p.endsWith(".gdshader"),
        tags: ["effects"],
    },
    { test: (p) => p.startsWith("assets/"), tags: ["assets"] },
    {
        test: (p) => /^scenes\/[^/]+\/entities\.json$/.test(p),
        tags: ["entities"],
    },
];
export function inferTagHints(path) {
    for (const rule of TAG_RULES) {
        if (rule.test(path)) {
            return rule.tags;
        }
    }
    return ALL_TAGS;
}
//# sourceMappingURL=tag-inference.js.map