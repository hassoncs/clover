type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type D1Database = import("@cloudflare/workers-types").D1Database;

export interface StoreStepArtifactParams {
	runId: string;
	stepIndex: number;
	filename: string;
	data: string | ArrayBuffer;
	contentType?: string;
}

export interface ReadStepArtifactParams {
	runId: string;
	stepIndex: number;
	filename: string;
}

export interface PublishToActiveParams {
	runId: string;
	gameId: string;
	sourceKey: string;
}

export interface StoreWorkspaceFileParams {
	gameId: string;
	filename: string;
	data: string;
	contentType?: string;
}

export interface ReadWorkspaceFileParams {
	gameId: string;
	filename: string;
}

export interface RollbackToVersionParams {
	gameId: string;
	previousKey: string;
}

export interface ArtifactMetadata {
	key: string;
	size: number;
	uploaded: Date;
}

export class ArtifactService {
	constructor(
		private readonly assets: R2Bucket,
		private readonly db: D1Database,
	) {}

	async storeStepArtifact(
		params: StoreStepArtifactParams,
	): Promise<{ key: string }> {
		const key = `agent-runs/${params.runId}/steps/${params.stepIndex}/${params.filename}`;

		await this.assets.put(key, params.data, {
			httpMetadata: {
				contentType: params.contentType ?? "application/octet-stream",
			},
		});

		return { key };
	}

	async readStepArtifact(
		params: ReadStepArtifactParams,
	): Promise<{ data: string; key: string } | null> {
		const key = `agent-runs/${params.runId}/steps/${params.stepIndex}/${params.filename}`;
		const obj = await this.assets.get(key);

		if (!obj) {
			return null;
		}

		const data = await obj.text();
		return { data, key };
	}

	async storeWorkspaceFile(
		params: StoreWorkspaceFileParams,
	): Promise<{ key: string }> {
		const key = `games/${params.gameId}/workspace/${params.filename}`;

		await this.assets.put(key, params.data, {
			httpMetadata: {
				contentType: params.contentType ?? "text/plain",
			},
		});

		return { key };
	}

	async readWorkspaceFile(
		params: ReadWorkspaceFileParams,
	): Promise<{ data: string } | null> {
		const key = `games/${params.gameId}/workspace/${params.filename}`;
		const obj = await this.assets.get(key);

		if (!obj) {
			return null;
		}

		return { data: await obj.text() };
	}

	async readActiveDefinition(gameId: string): Promise<string | null> {
		const key = `games/${gameId}/definition.json`;
		const obj = await this.assets.get(key);

		if (!obj) {
			return null;
		}

		return await obj.text();
	}

	async publishToActive(
		params: PublishToActiveParams,
	): Promise<{ publishedKey: string; previousKey: string | null }> {
		const activeKey = `games/${params.gameId}/definition.json`;
		const backupKey = `agent-runs/${params.runId}/previous-definition.json`;

		let previousKey: string | null = null;

		const existingActive = await this.assets.get(activeKey);
		if (existingActive) {
			const existingData = await existingActive.arrayBuffer();
			await this.assets.put(backupKey, existingData, {
				httpMetadata: {
					contentType: "application/json",
				},
			});
			previousKey = backupKey;
		}

		const sourceObj = await this.assets.get(params.sourceKey);
		if (!sourceObj) {
			throw new Error(`Source artifact not found: ${params.sourceKey}`);
		}

		const sourceData = await sourceObj.arrayBuffer();
		await this.assets.put(activeKey, sourceData, {
			httpMetadata: {
				contentType: "application/json",
			},
		});

		return {
			publishedKey: activeKey,
			previousKey,
		};
	}

	async rollbackToVersion(params: RollbackToVersionParams): Promise<void> {
		const activeKey = `games/${params.gameId}/definition.json`;

		const previousObj = await this.assets.get(params.previousKey);
		if (!previousObj) {
			throw new Error(`Previous version not found: ${params.previousKey}`);
		}

		const previousData = await previousObj.arrayBuffer();
		await this.assets.put(activeKey, previousData, {
			httpMetadata: {
				contentType: "application/json",
			},
		});
	}

	async listRunArtifacts(runId: string): Promise<ArtifactMetadata[]> {
		const prefix = `agent-runs/${runId}/steps/`;
		const listed = await this.assets.list({ prefix });

		return listed.objects.map((obj) => ({
			key: obj.key,
			size: obj.size,
			uploaded: obj.uploaded,
		}));
	}

	async listWorkspaceFileMeta(
		gameId: string,
	): Promise<Array<{ filename: string; size: number; uploaded: number }>> {
		const prefix = `games/${gameId}/workspace/`;
		const listed = await this.assets.list({ prefix });
		return listed.objects.map((obj) => ({
			filename: obj.key.slice(prefix.length),
			size: obj.size,
			uploaded: obj.uploaded.getTime(),
		}));
	}

	async readWorkspaceFiles(
		gameId: string,
		filenames: string[],
	): Promise<Map<string, string>> {
		const result = new Map<string, string>();
		for (const filename of filenames) {
			const file = await this.readWorkspaceFile({ gameId, filename });
			if (file) {
				result.set(filename, file.data);
			}
		}
		return result;
	}
}
