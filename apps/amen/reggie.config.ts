import { defineConfig } from "@chriscode/reggie";

export default defineConfig({
	examples: {
		sourceDir: "app/(dev)/examples",
		include: "**/*.tsx",
		exclude: ["_layout.tsx", "*.test.tsx"],
		output: "lib/registry/generated/examples.ts",
		importAlias: "@/app/(dev)/examples",
		urlPrefix: "/(dev)/examples",
		typeImports: `import type { ExampleEntry, ExampleMeta, LazyComponent } from "../types";`,
		types: {
			id: "ExampleId",
			entry: "ExampleEntry",
			meta: "ExampleMeta",
		},
	},
});
