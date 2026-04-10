import type { PenDocument, PenNode } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";

export const LOCAL_DOC_KEY = "pencil:last-document";
export const WORKSPACE_GAME_ID_KEY = "pencil:workspace-game-id";
export const PENCIL_SESSION_ID_KEY = "pencil:session-id";
export const PENCIL_PROJECT_ROOT_KEY = "pencil:project-root";
export const WORKSPACE_FILENAME = "pencil-document.pen.json";

export type PencilEmbedMode = "prism" | "embed";

export interface PencilRuntimeState {
	mode: PencilEmbedMode;
	sessionId: string | null;
	projectRef: string;
	fileRef: string;
	filename: string;
	targetId: string | null;
	targetPath: string[] | null;
	designStateRef: string;
}

export interface PencilRuntimeBinding {
	sessionId: string | null;
	projectRef: string;
	fileRef: string;
	filename: string;
	gameId: string | null;
	projectRoot: string | null;
}

export interface EmbedDocumentResult {
	document: PenDocument;
	targetPath: string[];
}

function simpleHash(value: string): string {
	let hash = 5381;
	for (let i = 0; i < value.length; i += 1) {
		hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

function stripTransientState(document: PenDocument): PenDocument {
	const { _syncedAt: _ignored, ...rest } = document as PenDocument & {
		_syncedAt?: number;
	};
	return rest;
}

function cloneNode(node: PenNode): PenNode {
	return JSON.parse(JSON.stringify(node)) as PenNode;
}

function findNodePathById(
	nodes: PenNode[],
	targetId: string,
	parentPath: string[] = [],
): string[] | null {
	for (const node of nodes) {
		const nextPath = [...parentPath, node.id];
		if (node.id === targetId) {
			return nextPath;
		}
		if ("children" in node && Array.isArray(node.children)) {
			const childPath = findNodePathById(
				node.children as PenNode[],
				targetId,
				nextPath,
			);
			if (childPath) {
				return childPath;
			}
		}
	}
	return null;
}

function isolateNodePath(nodes: PenNode[], path: string[]): PenNode | null {
	const [head, ...rest] = path;
	const node = nodes.find((candidate) => candidate.id === head);
	if (!node) {
		return null;
	}

	if (rest.length === 0) {
		return cloneNode(node);
	}

	if (!("children" in node) || !Array.isArray(node.children)) {
		return null;
	}

	const isolatedChild = isolateNodePath(node.children as PenNode[], rest);
	if (!isolatedChild) {
		return null;
	}

	return {
		...cloneNode(node),
		children: [isolatedChild],
	} as PenNode;
}

export function createEmbedDocumentForTarget(
	document: PenDocument,
	targetId: string,
): EmbedDocumentResult | null {
	const targetPath = findNodePathById(document.children, targetId);
	if (!targetPath) {
		return null;
	}

	const isolatedRoot = isolateNodePath(document.children, targetPath);
	if (!isolatedRoot) {
		return null;
	}

	return {
		targetPath,
		document: {
			...document,
			children: [isolatedRoot],
		},
	};
}

export function createDesignStateRef(document: PenDocument): string {
	const stableDocument = stripTransientState(document);
	return `pen:${simpleHash(JSON.stringify(stableDocument))}`;
}

export function buildPencilRuntimeState({
	document,
	gameId,
	sessionId,
	projectRoot,
	filename,
	targetId,
	targetPath,
	mode,
}: {
	document: PenDocument;
	gameId: string | null;
	sessionId?: string | null;
	projectRoot?: string | null;
	filename?: string | null;
	targetId: string | null;
	targetPath: string[] | null;
	mode: PencilEmbedMode;
}): PencilRuntimeState {
	const binding = resolvePencilRuntimeBinding({
		gameId,
		sessionId,
		projectRoot,
		filename,
	});

	return {
		mode,
		sessionId: binding.sessionId,
		projectRef: binding.projectRef,
		fileRef: binding.fileRef,
		filename: binding.filename,
		targetId,
		targetPath,
		designStateRef: createDesignStateRef(document),
	};
}

export function resolvePencilRuntimeBinding({
	gameId,
	sessionId,
	projectRoot,
	filename,
}: {
	gameId?: string | null;
	sessionId?: string | null;
	projectRoot?: string | null;
	filename?: string | null;
}): PencilRuntimeBinding {
	const resolvedFilename = filename?.trim() || WORKSPACE_FILENAME;
	const resolvedSessionId = sessionId?.trim() || null;
	const resolvedProjectRoot = projectRoot?.trim() || null;

	if (resolvedSessionId && resolvedProjectRoot) {
		const projectRef = `project:${resolvedProjectRoot}`;
		return {
			sessionId: resolvedSessionId,
			projectRef,
			fileRef: `${projectRef}:${resolvedFilename}`,
			filename: resolvedFilename,
			gameId: null,
			projectRoot: resolvedProjectRoot,
		};
	}

	if (gameId) {
		const projectRef = `workspace:${gameId}`;
		return {
			sessionId: null,
			projectRef,
			fileRef: `${projectRef}:${resolvedFilename}`,
			filename: resolvedFilename,
			gameId,
			projectRoot: null,
		};
	}

	return {
		sessionId: null,
		projectRef: "local-storage",
		fileRef: `local-storage:${LOCAL_DOC_KEY}`,
		filename: resolvedFilename,
		gameId: null,
		projectRoot: null,
	};
}

export function getConfiguredGameId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("session")) return null;
		const fromUrl = urlParams.get("gameId");
		if (fromUrl) return fromUrl;
		return window.localStorage.getItem(WORKSPACE_GAME_ID_KEY);
	} catch {
		return null;
	}
}

export function getConfiguredSessionId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const urlParams = new URLSearchParams(window.location.search);
		const fromUrl = urlParams.get("session");
		if (fromUrl) return fromUrl;
		return window.localStorage.getItem(PENCIL_SESSION_ID_KEY);
	} catch {
		return null;
	}
}

export function getConfiguredProjectRoot(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const urlParams = new URLSearchParams(window.location.search);
		const fromUrl = urlParams.get("project");
		if (fromUrl) return fromUrl;
		return window.localStorage.getItem(PENCIL_PROJECT_ROOT_KEY);
	} catch {
		return null;
	}
}

export function getConfiguredWorkspaceFilename(): string {
	if (typeof window === "undefined") return WORKSPACE_FILENAME;
	try {
		const urlParams = new URLSearchParams(window.location.search);
		const fromUrl = urlParams.get("file");
		if (fromUrl && fromUrl.trim().length > 0) {
			return fromUrl.trim();
		}
	} catch {
		return WORKSPACE_FILENAME;
	}
	return WORKSPACE_FILENAME;
}

export function createEmptyDocument(): PenDocument {
	return { version: 1, children: [] };
}

export function loadStoredDocument(): PenDocument {
	if (typeof window === "undefined") return createEmptyDocument();
	try {
		const persisted = window.localStorage.getItem(LOCAL_DOC_KEY);
		if (persisted) {
			return parsePenDocument(JSON.parse(persisted));
		}
	} catch {
		return createEmptyDocument();
	}
	return createEmptyDocument();
}
