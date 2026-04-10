import type { AppRouter } from "@slopcade/api/trpc";
import type {
	PencilDocumentStore,
	PencilFileRef,
	PencilProjectRef,
} from "@slopcade/pencil-core/contracts";
import type { PenDocument } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";
import type { TRPCClient } from "@trpc/client";

const WORKSPACE_PREFIX = "workspace:";
const LOCAL_STORAGE_ROOT = "local-storage";

function parseProjectRef(ref: PencilProjectRef): {
	gameId: string | null;
	isLocal: boolean;
} {
	const root = ref.root;
	if (root === LOCAL_STORAGE_ROOT) return { gameId: null, isLocal: true };
	if (root.startsWith(WORKSPACE_PREFIX)) {
		return { gameId: root.slice(WORKSPACE_PREFIX.length), isLocal: false };
	}
	return { gameId: null, isLocal: true };
}

export class SlopcadeDocumentStore implements PencilDocumentStore {
	constructor(private readonly client: TRPCClient<AppRouter>) {}

	async load(ref: PencilFileRef): Promise<PenDocument | null> {
		const { gameId, isLocal } = parseProjectRef(ref.session.project);
		if (isLocal || !gameId) return null;

		const result = await this.client.chatThreads.readWorkspaceFile.query({
			gameId,
			filename: ref.path,
		});

		if (!result.exists || !result.content) return null;

		try {
			return parsePenDocument(JSON.parse(result.content));
		} catch {
			return null;
		}
	}

	async save(ref: PencilFileRef, document: PenDocument): Promise<void> {
		const { gameId, isLocal } = parseProjectRef(ref.session.project);
		if (isLocal || !gameId) {
			throw new Error("SlopcadeDocumentStore cannot save to local storage");
		}

		await this.client.chatThreads.writeWorkspaceFile.mutate({
			gameId,
			filename: ref.path,
			content: JSON.stringify(document, null, 2),
		});
	}

	async exists(ref: PencilFileRef): Promise<boolean> {
		const { gameId, isLocal } = parseProjectRef(ref.session.project);
		if (isLocal || !gameId) return false;

		const result = await this.client.chatThreads.readWorkspaceFile.query({
			gameId,
			filename: ref.path,
		});

		return result.exists;
	}

	async listFiles(project: PencilProjectRef): Promise<string[]> {
		const { gameId, isLocal } = parseProjectRef(project);
		if (isLocal || !gameId) return [];

		const result = await this.client.chatThreads.listWorkspaceFiles.query({
			gameId,
		});

		return result.files;
	}

	async delete(_ref: PencilFileRef): Promise<boolean> {
		throw new Error("SlopcadeDocumentStore.delete is not implemented");
	}
}
