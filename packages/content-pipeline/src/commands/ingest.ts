import type { ArgumentsCamelCase, Argv } from "yargs";

export interface IngestOptions {
	source: string;
	gameType: string;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("source", {
			alias: "s",
			type: "string",
			demandOption: true,
			description: "Source file path (JSON)",
		})
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type",
		});
}

export async function handler(
	args: ArgumentsCamelCase<IngestOptions>,
): Promise<void> {
	console.log("Ingest command:", args);
	console.log(`Ingesting from ${args.source} for ${args.gameType}`);
}
