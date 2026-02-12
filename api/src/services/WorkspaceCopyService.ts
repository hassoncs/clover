type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

export interface WorkspaceCopyOptions {
	sourcePrefix: string;
	destPrefix: string;
	metadataOverrides?: {
		id?: string;
		title?: string;
	};
}

export interface WorkspaceCopyResult {
	copiedFiles: string[];
	updatedFiles: string[];
	skipped: boolean;
}

export class WorkspaceCopyService {
	constructor(private readonly bucket: R2Bucket) {}

	async copyWorkspace(
		options: WorkspaceCopyOptions,
	): Promise<WorkspaceCopyResult> {
		const { sourcePrefix, destPrefix, metadataOverrides } = options;
		const workspaceSource = `${sourcePrefix}/workspace/`;
		const workspaceDest = `${destPrefix}/workspace/`;

		const sourceKeys = await this.listAllKeys(workspaceSource);

		if (sourceKeys.length === 0) {
			return { copiedFiles: [], updatedFiles: [], skipped: true };
		}

		const copiedFiles: string[] = [];
		const updatedFiles: string[] = [];

		for (const sourceKey of sourceKeys) {
			const relativePath = sourceKey.slice(workspaceSource.length);
			if (!relativePath) continue;

			const destKey = `${workspaceDest}${relativePath}`;
			const obj = await this.bucket.get(sourceKey);
			if (!obj) continue;

			let body: ArrayBuffer | string = await obj.arrayBuffer();

			if (relativePath === "slopcade.json" && metadataOverrides) {
				const text = new TextDecoder().decode(body);
				try {
					const manifest = JSON.parse(text);
					if (metadataOverrides.id !== undefined) {
						manifest.id = metadataOverrides.id;
					}
					if (metadataOverrides.title !== undefined) {
						manifest.name = metadataOverrides.title;
					}
					body = JSON.stringify(manifest, null, 2);
					updatedFiles.push(relativePath);
				} catch {
					// If manifest isn't valid JSON, copy as-is
				}
			}

			await this.bucket.put(destKey, body, {
				httpMetadata: obj.httpMetadata,
			});
			copiedFiles.push(relativePath);
		}

		return { copiedFiles, updatedFiles, skipped: false };
	}

	private async listAllKeys(prefix: string): Promise<string[]> {
		const keys: string[] = [];
		let cursor: string | undefined;

		do {
			const listed = await this.bucket.list({ prefix, cursor });
			for (const obj of listed.objects) {
				keys.push(obj.key);
			}
			cursor = listed.truncated ? listed.cursor : undefined;
		} while (cursor);

		return keys;
	}
}
