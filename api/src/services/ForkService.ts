type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type D1Database = import("@cloudflare/workers-types").D1Database;
type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

export interface ForkParams {
	sourceGameId: string;
	newGameId: string;
	userId: string;
	title: string;
	description: string | null;
	r2Prefix: string;
	baseGameId: string;
	validationReport: string | null;
	validationScore: number | null;
	validationCriticalCount: number;
	validationWarningCount: number;
	validationValid: number;
	validatorVersion: string | null;
}

export interface ForkResult {
	gameId: string;
	copiedObjectCount: number;
}

export class ForkService {
	constructor(
		private assets: R2Bucket,
		private db: D1Database,
		private gameRepoNamespace: DurableObjectNamespace | undefined,
	) {}

	async forkGame(params: ForkParams): Promise<ForkResult> {
		const now = Date.now();

		const copiedObjectCount = await this.copyGitObjects(
			params.sourceGameId,
			params.newGameId,
		);

		await this.insertForkRow(params, now);

		await this.initForkedRepoDO(params.newGameId);

		return {
			gameId: params.newGameId,
			copiedObjectCount,
		};
	}

	private async copyGitObjects(
		sourceGameId: string,
		newGameId: string,
	): Promise<number> {
		const sourcePrefix = `repos/${sourceGameId}/.git/`;
		const destPrefix = `repos/${newGameId}/.git/`;

		const keys = await this.listAllKeys(sourcePrefix);

		await Promise.all(
			keys.map(async (sourceKey) => {
				const relativePath = sourceKey.slice(sourcePrefix.length);
				if (!relativePath) return;

				const obj = await this.assets.get(sourceKey);
				if (!obj) return;

				const destKey = `${destPrefix}${relativePath}`;
				await this.assets.put(destKey, await obj.arrayBuffer(), {
					httpMetadata: obj.httpMetadata,
				});
			}),
		);

		return keys.length;
	}

	private async listAllKeys(prefix: string): Promise<string[]> {
		const keys: string[] = [];
		let cursor: string | undefined;

		do {
			const listed = await this.assets.list({ prefix, cursor });
			for (const obj of listed.objects) {
				keys.push(obj.key);
			}
			cursor = listed.truncated ? listed.cursor : undefined;
		} while (cursor);

		return keys;
	}

	private async insertForkRow(params: ForkParams, now: number): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO games (
				id, user_id, title, description, r2_prefix, is_public, play_count,
				created_at, updated_at, base_game_id, forked_from_id,
				validation_report, validation_score, validation_critical_count,
				validation_warning_count, validation_valid, validation_updated_at, validator_version,
				version, build_number
			) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				params.newGameId,
				params.userId,
				params.title,
				params.description,
				params.r2Prefix,
				now,
				now,
				params.baseGameId,
				params.sourceGameId,
				params.validationReport,
				params.validationScore,
				params.validationCriticalCount,
				params.validationWarningCount,
				params.validationValid,
				now,
				params.validatorVersion,
				"1.0.0",
				1,
			)
			.run();
	}

	private async initForkedRepoDO(gameId: string): Promise<void> {
		if (!this.gameRepoNamespace) {
			console.warn(
				`[Fork ${gameId}] GAME_REPO binding unavailable, skipping DO init`,
			);
			return;
		}

		try {
			const id = this.gameRepoNamespace.idFromName(gameId);
			const stub = this.gameRepoNamespace.get(id);
			await stub.fetch(
				new Request("https://git-repo/init", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Game-Id": gameId,
					},
					body: JSON.stringify({ gameId }),
				}),
			);
		} catch (error) {
			console.error(
				`[Fork ${gameId}] Failed to init DO:`,
				error instanceof Error ? error.message : String(error),
			);
		}
	}
}
