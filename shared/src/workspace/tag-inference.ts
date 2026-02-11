import type { WorkspaceTag } from "./types";

const ALL_TAGS: WorkspaceTag[] = [
	"world",
	"prefabs",
	"entities",
	"rules",
	"scripts",
	"effects",
	"assets",
];

interface TagRule {
	test: (path: string) => boolean;
	tags: WorkspaceTag[];
}

const TAG_RULES: TagRule[] = [
	{ test: (p) => p === "slopcade.json", tags: ALL_TAGS },
	{ test: (p) => p === "world.json", tags: ["world"] },
	{ test: (p) => p === "entities.json", tags: ["entities"] },
	{ test: (p) => p === "rules.json", tags: ["rules"] },
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
	{ test: (p) => /^scenes\/[^/]+\/rules\.json$/.test(p), tags: ["rules"] },
];

export function inferTagHints(path: string): WorkspaceTag[] {
	for (const rule of TAG_RULES) {
		if (rule.test(path)) {
			return rule.tags;
		}
	}
	return ALL_TAGS;
}
