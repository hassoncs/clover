import { readdirSync } from "fs";
import type { Operation } from "./_types";

const operation: Operation = {
	name: "list_files",
	description:
		"List files in a directory. Useful for verifying filesystem access.",
	category: "filesystem",
	docs: `Lists directory contents with file/directory type info. Defaults to cwd if no path given.`,
	parameters: {
		path: {
			type: "string",
			description: "Directory path to list (defaults to cwd)",
			required: false,
		},
	},
	execute: async (args) => {
		const dirPath = (args.path as string) || process.cwd();
		const entries = readdirSync(dirPath, { withFileTypes: true });
		return {
			path: dirPath,
			entries: entries.map((e) => ({
				name: e.name,
				type: e.isDirectory() ? "directory" : "file",
			})),
			count: entries.length,
		};
	},
};

export default operation;
