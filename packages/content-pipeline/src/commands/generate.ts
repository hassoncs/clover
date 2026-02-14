import type { ArgumentsCamelCase, Argv } from "yargs";

export interface GenerateOptions {
	gameType: string;
	count: number;
	category?: string;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type (trivia, quip, drawing, etc.)",
		})
		.option("count", {
			alias: "n",
			type: "number",
			default: 10,
			description: "Number of items to generate",
		})
		.option("category", {
			alias: "c",
			type: "string",
			description: "Category filter",
		});
}

export async function handler(
	args: ArgumentsCamelCase<GenerateOptions>,
): Promise<void> {
	console.log("Generate command:", args);
	console.log(`Generating ${args.count} items for ${args.gameType}`);
	if (args.category) {
		console.log(`Category: ${args.category}`);
	}
}
