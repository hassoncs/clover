import type { ArgumentsCamelCase, Argv } from "yargs";

export interface ModerateOptions {
	id?: string;
	status?: string;
	interactive?: boolean;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("id", {
			type: "string",
			description: "Content item ID to moderate",
		})
		.option("status", {
			type: "string",
			choices: ["approved", "rejected", "flagged"],
			description: "Moderation status",
		})
		.option("interactive", {
			alias: "i",
			type: "boolean",
			default: false,
			description: "Interactive moderation mode",
		});
}

export async function handler(
	args: ArgumentsCamelCase<ModerateOptions>,
): Promise<void> {
	console.log("Moderate command:", args);
	if (args.interactive) {
		console.log("Starting interactive moderation...");
	} else if (args.id && args.status) {
		console.log(`Setting ${args.id} to ${args.status}`);
	} else {
		console.log("Listing pending items...");
	}
}
