import type { ArgumentsCamelCase, Argv } from "yargs";

export interface BuildPackOptions {
	name: string;
	gameType: string;
	output: string;
	count?: number;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("name", {
			alias: "n",
			type: "string",
			demandOption: true,
			description: "Pack name",
		})
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type",
		})
		.option("output", {
			alias: "o",
			type: "string",
			demandOption: true,
			description: "Output file path",
		})
		.option("count", {
			alias: "c",
			type: "number",
			description: "Number of items to include",
		});
}

export async function handler(
	args: ArgumentsCamelCase<BuildPackOptions>,
): Promise<void> {
	console.log("Build pack command:", args);
	console.log(`Building pack "${args.name}" for ${args.gameType}`);
	console.log(`Output: ${args.output}`);
	if (args.count) {
		console.log(`Including ${args.count} items`);
	}
}
