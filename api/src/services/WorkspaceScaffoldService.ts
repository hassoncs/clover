type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

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
	contentType: string;
	content: (options: SeedWorkspaceScaffoldOptions) => string;
}

const DEFAULT_GAME_TITLE = "Untitled Game";

function stringifyJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

export class WorkspaceScaffoldService {
	private static readonly SCAFFOLD_FILES: ScaffoldFile[] = [
		{
			filename: "slopcade.json",
			contentType: "application/json",
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
			contentType: "application/json",
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
			contentType: "application/json",
			content: () => stringifyJson([]),
		},
		{
			filename: "rules.json",
			contentType: "application/json",
			content: () => stringifyJson([]),
		},
		{
			filename: "prefabs/default.json",
			contentType: "application/json",
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
			contentType: "text/javascript",
			content: () =>
				"exports.onStart = function(ctx) {};\nexports.onUpdate = function(ctx, dt) {};",
		},
		{
			filename: "effects/screen.json",
			contentType: "application/json",
			content: () => stringifyJson({ nodes: [], connections: [] }),
		},
	];

	constructor(private readonly bucket: R2Bucket) {}

	async seedIfMissing(
		options: SeedWorkspaceScaffoldOptions,
	): Promise<SeedWorkspaceScaffoldResult> {
		const created: string[] = [];
		const skipped: string[] = [];

		for (const scaffoldFile of WorkspaceScaffoldService.SCAFFOLD_FILES) {
			const key = `games/${options.gameId}/workspace/${scaffoldFile.filename}`;
			const existing = await this.bucket.head(key);

			if (existing) {
				skipped.push(scaffoldFile.filename);
				continue;
			}

			await this.bucket.put(key, scaffoldFile.content(options), {
				httpMetadata: {
					contentType: scaffoldFile.contentType,
				},
			});
			created.push(scaffoldFile.filename);
		}

		return { created, skipped };
	}
}
