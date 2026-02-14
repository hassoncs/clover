import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { containsBlockedKeyword } from "../moderate/blocklist.js";

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

function manuallySetStatus(db: PipelineDB, id: string, status: string): void {
	db.updateModerationStatus(id, status);
	console.log(`✓ Set ${id} to ${status}`);
}

function autoModerateAllPending(db: PipelineDB): void {
	const pendingItems = db.getContentItems({
		moderationStatus: "pending",
	});

	console.log(`Found ${pendingItems.length} pending items`);

	let approved = 0;
	let rejected = 0;

	for (const item of pendingItems) {
		const check = containsBlockedKeyword(item.text);

		if (check.blocked) {
			db.updateModerationStatus(
				item.id,
				"rejected",
				`Blocked keyword: ${check.keyword}`,
			);
			console.log(
				`✗ Rejected ${item.id}: "${check.keyword}" in "${item.text}"`,
			);
			rejected++;
		} else {
			db.updateModerationStatus(item.id, "approved");
			console.log(`✓ Approved ${item.id}: "${item.text}"`);
			approved++;
		}
	}

	console.log(
		`\nModeration complete: ${approved} approved, ${rejected} rejected`,
	);
}

export async function handler(
	args: ArgumentsCamelCase<ModerateOptions>,
): Promise<void> {
	const db = new PipelineDB();

	try {
		if (args.interactive) {
			console.log("Starting interactive moderation...");
		} else if (args.id && args.status) {
			manuallySetStatus(db, args.id, args.status);
		} else {
			autoModerateAllPending(db);
		}
	} finally {
		db.close();
	}
}
