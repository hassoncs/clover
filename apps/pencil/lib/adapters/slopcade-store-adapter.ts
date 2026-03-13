import type {
	PencilDocumentStore,
	PencilFileRef,
	PencilHostAdapter,
	PencilSessionRef,
} from "@slopcade/pencil-core/contracts";
import { parsePenDocument } from "@slopcade/protocol/pen";

interface ReadWorkspaceFileResult {
	exists: boolean;
	content: string | null;
}

interface ListWorkspaceFilesResult {
	files: string[];
}

interface SlopcadeWorkspaceClient {
	query(path: "chatThreads.readWorkspaceFile", input: {
		gameId: string;
		filename: string;
	}): Promise<ReadWorkspaceFileResult>;
	query(path: "chatThreads.listWorkspaceFiles", input: {
		gameId: string;
	}): Promise<ListWorkspaceFilesResult>;
	mutation(path: "chatThreads.writeWorkspaceFile", input: {
		gameId: string;
		filename: string;
		content: string;
	}): Promise<unknown>;
}

class SlopcadeStoreAdapter implements PencilDocumentStore {
	constructor(
		private readonly client: SlopcadeWorkspaceClient,
		private readonly gameId: string,
	) {}

	async load(fileRef: PencilFileRef) {
		const result = await this.client.query("chatThreads.readWorkspaceFile", {
			gameId: this.resolveGameId(fileRef),
			filename: fileRef.path,
		});
		if (!result.exists || !result.content) return null;
		return parsePenDocument(JSON.parse(result.content));
	}

	async save(fileRef: PencilFileRef, document: Parameters<
		PencilDocumentStore["save"]
	>[1]) {
		await this.client.mutation("chatThreads.writeWorkspaceFile", {
			gameId: this.resolveGameId(fileRef),
			filename: fileRef.path,
			content: JSON.stringify(document),
		});
	}

	async list(session: PencilSessionRef) {
		const result = await this.client.query("chatThreads.listWorkspaceFiles", {
			gameId: this.resolveGameId({ session, path: "canvas.pen" }),
		});
		return result.files.map((path) => ({ session, path }));
	}

	private resolveGameId(fileRef: PencilFileRef): string {
		const projectRoot = fileRef.session.project.root;
		if (projectRoot === `workspace:${this.gameId}`) {
			return this.gameId;
		}
		if (fileRef.session.id === `session:${this.gameId}`) {
			return this.gameId;
		}
		throw new Error("Slopcade store adapter only supports workspace-backed Pencil files");
	}
}

class SlopcadeHostAdapter implements PencilHostAdapter {
	private readonly documentStore: PencilDocumentStore;

	constructor(client: SlopcadeWorkspaceClient, gameId: string) {
		this.documentStore = new SlopcadeStoreAdapter(client, gameId);
	}

	getDocumentStore(): PencilDocumentStore {
		return this.documentStore;
	}
}

export function createSlopcadeHostAdapter(
	client: SlopcadeWorkspaceClient,
	gameId: string | null,
): PencilHostAdapter | null {
	if (!gameId) return null;
	return new SlopcadeHostAdapter(client, gameId);
}
