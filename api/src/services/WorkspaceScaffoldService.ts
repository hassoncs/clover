import type { FileChange, GitService } from "./git/GitService";

export interface SeedWorkspaceScaffoldOptions {
	gameId: string;
	gameTitle?: string;
}

export interface SeedWorkspaceScaffoldResult {
	created: string[];
	skipped: string[];
}

interface ScaffoldFile {
	filename: string;
	content: (options: SeedWorkspaceScaffoldOptions) => string;
}

const DEFAULT_GAME_TITLE = "Untitled Game";

function stringifyJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

const SYSTEM_AUTHOR = { name: "System", email: "system@slopcade.app" };

export class WorkspaceScaffoldService {
	private static readonly SCAFFOLD_FILES: ScaffoldFile[] = [
		{
			filename: "slopcade.json",
			content: ({ gameId, gameTitle }) =>
				stringifyJson({
					id: gameId,
					name: gameTitle?.trim() || DEFAULT_GAME_TITLE,
					version: "0.1.0",
					activeScene: null,
				}),
		},
		{
			filename: "world.json",
			content: () =>
				stringifyJson({
					gravity: { x: 0, y: 10 },
					pixelsPerMeter: 50,
					bounds: { width: 20, height: 12 },
					background: { type: "static", color: "#0f172a" },
				}),
		},
		{
			filename: "entities.json",
			content: () => stringifyJson([]),
		},
		{
			filename: "prefabs/default.json",
			content: () =>
				stringifyJson({
					id: "default",
					visual: { type: "rect", width: 1, height: 1, color: "#fff" },
					physics: { bodyType: "static" },
					tags: ["default"],
				}),
		},
		{
			filename: "scripts/main.js",
			content: () =>
				"exports.onStart = function(ctx) {};\nexports.onUpdate = function(ctx, dt) {};",
		},
		{
			filename: "effects/screen.json",
			content: () => stringifyJson({ nodes: [], connections: [] }),
		},
	];

	constructor(private readonly gitService: GitService) {}

	async seedIfMissing(
		options: SeedWorkspaceScaffoldOptions,
	): Promise<SeedWorkspaceScaffoldResult> {
		const created: string[] = [];
		const skipped: string[] = [];

		let existingFiles: string[] = [];
		try {
			existingFiles = await this.gitService.listFiles(options.gameId);
		} catch {
			// Empty repo — no files yet
		}

		const existingSet = new Set(existingFiles);
		const filesToCommit: FileChange[] = [];

		for (const scaffoldFile of WorkspaceScaffoldService.SCAFFOLD_FILES) {
			if (existingSet.has(scaffoldFile.filename)) {
				skipped.push(scaffoldFile.filename);
			} else {
				filesToCommit.push({
					path: scaffoldFile.filename,
					content: scaffoldFile.content(options),
				});
				created.push(scaffoldFile.filename);
			}
		}

		if (filesToCommit.length > 0) {
			await this.gitService.commitFiles(
				options.gameId,
				filesToCommit,
				"Initialize workspace scaffold",
				SYSTEM_AUTHOR,
			);
		}

		return { created, skipped };
	}
}
