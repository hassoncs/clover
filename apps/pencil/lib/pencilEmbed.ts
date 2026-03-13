import type { PenDocument, PenNode } from "@pencil/protocol/pen";
import { parsePenDocument } from "@pencil/protocol/pen";

export const LOCAL_DOC_KEY = "pencil:last-document";

const DEFAULT_FILE_PATH = "canvas.pen";

export type PencilEmbedMode = "prism" | "embed";

export interface PencilRuntimeIdentity {
	sessionId: string;
	projectRoot: string;
	filePath: string;
}

export interface PencilRuntimeState {
	mode: PencilEmbedMode | "editor";
	sessionId: string | null;
	projectRoot: string | null;
	filePath: string;
	projectRef: string;
	fileRef: string;
	targetId: string | null;
	targetPath: string[] | null;
	designStateRef: string;
	readOnly?: boolean;
}

export interface PencilRuntimeBinding {
	source: "canonical" | "legacy-workspace" | "local-storage";
	identity: PencilRuntimeIdentity | null;
	legacyWorkspaceId: string | null;
	filename: string;
	projectRef: string;
	fileRef: string;
}

export interface EmbedDocumentResult {
	document: PenDocument;
	targetPath: string[];
}

interface ResolvePencilRuntimeBindingInput {
	sessionId?: string | null;
	projectRoot?: string | null;
	filePath?: string | null;
	legacyWorkspaceId?: string | null;
}

type PencilRuntimeParamSource = Record<string, string | null | undefined>;

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) return trimmed;
	}
	return null;
}

function readQueryParam(name: string): string | null {
	if (typeof window === "undefined") return null;
	const value = new URLSearchParams(window.location.search).get(name)?.trim();
	return value ? value : null;
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

function createCanonicalBinding(identity: PencilRuntimeIdentity): PencilRuntimeBinding {
	const projectRef = `project:${identity.projectRoot}`;
	return {
		source: "canonical",
		identity,
		legacyWorkspaceId: null,
		filename: identity.filePath,
		projectRef,
		fileRef: `${projectRef}:${identity.filePath}`,
	};
}

export function translateLegacyWorkspaceIdentity(
	legacyWorkspaceId: string | null | undefined,
	filePath: string | null | undefined,
): (PencilRuntimeIdentity & { legacyWorkspaceId: string }) | null {
	const resolvedLegacyWorkspaceId = firstNonEmpty(legacyWorkspaceId);
	const resolvedFilePath = firstNonEmpty(filePath) ?? DEFAULT_FILE_PATH;
	if (!resolvedLegacyWorkspaceId) {
		return null;
	}
	return {
		sessionId: `session:${resolvedLegacyWorkspaceId}`,
		projectRoot: `workspace:${resolvedLegacyWorkspaceId}`,
		filePath: resolvedFilePath,
		legacyWorkspaceId: resolvedLegacyWorkspaceId,
	};
}

export function resolvePencilRuntimeBinding({
	sessionId,
	projectRoot,
	filePath,
	legacyWorkspaceId,
}: ResolvePencilRuntimeBindingInput): PencilRuntimeBinding {
	const resolvedFilePath = firstNonEmpty(filePath) ?? DEFAULT_FILE_PATH;
	const resolvedSessionId = firstNonEmpty(sessionId);
	const resolvedProjectRoot = firstNonEmpty(projectRoot);

	if (resolvedSessionId && resolvedProjectRoot) {
		return createCanonicalBinding({
			sessionId: resolvedSessionId,
			projectRoot: resolvedProjectRoot,
			filePath: resolvedFilePath,
		});
	}

	const legacyIdentity = translateLegacyWorkspaceIdentity(
		legacyWorkspaceId,
		resolvedFilePath,
	);
	if (legacyIdentity) {
		return {
			source: "legacy-workspace",
			identity: {
				sessionId: legacyIdentity.sessionId,
				projectRoot: legacyIdentity.projectRoot,
				filePath: legacyIdentity.filePath,
			},
			legacyWorkspaceId: legacyIdentity.legacyWorkspaceId,
			filename: legacyIdentity.filePath,
			projectRef: legacyIdentity.projectRoot,
			fileRef: `${legacyIdentity.projectRoot}:${legacyIdentity.filePath}`,
		};
	}

	return {
		source: "local-storage",
		identity: null,
		legacyWorkspaceId: null,
		filename: resolvedFilePath,
		projectRef: "local-storage",
		fileRef: `local-storage:${LOCAL_DOC_KEY}`,
	};
}

export function resolvePencilRuntimeBindingFromParams(
	params: PencilRuntimeParamSource,
): PencilRuntimeBinding {
	return resolvePencilRuntimeBinding({
		sessionId: firstNonEmpty(params.sessionId, params.session),
		projectRoot: firstNonEmpty(params.projectRoot, params.project),
		filePath: firstNonEmpty(params.filePath, params.filename, params.file),
		legacyWorkspaceId: firstNonEmpty(params["gameId"]),
	});
}

export function getConfiguredPencilRuntimeBinding(): PencilRuntimeBinding {
	return resolvePencilRuntimeBindingFromParams({
		sessionId: readQueryParam("sessionId"),
		session: readQueryParam("session"),
		projectRoot: readQueryParam("projectRoot"),
		project: readQueryParam("project"),
		filePath: readQueryParam("filePath"),
		filename: readQueryParam("filename"),
		file: readQueryParam("file"),
		gameId: readQueryParam("gameId"),
	});
}

export function getConfiguredSessionId(): string | null {
	return getConfiguredPencilRuntimeBinding().identity?.sessionId ?? null;
}

export function getConfiguredProjectRoot(): string | null {
	return getConfiguredPencilRuntimeBinding().identity?.projectRoot ?? null;
}

export function getConfiguredWorkspaceFilename(): string {
	return getConfiguredPencilRuntimeBinding().filename;
}

export function getConfiguredLegacyWorkspaceId(): string | null {
	return getConfiguredPencilRuntimeBinding().legacyWorkspaceId;
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
	sessionId,
	projectRoot,
	filePath,
	legacyWorkspaceId,
	targetId,
	targetPath,
	mode,
	readOnly,
}: {
	document: PenDocument;
	sessionId?: string | null;
	projectRoot?: string | null;
	filePath?: string | null;
	legacyWorkspaceId?: string | null;
	targetId: string | null;
	targetPath: string[] | null;
	mode: PencilRuntimeState["mode"];
	readOnly?: boolean;
}): PencilRuntimeState {
	const binding = resolvePencilRuntimeBinding({
		sessionId,
		projectRoot,
		filePath,
		legacyWorkspaceId,
	});

	return {
		mode,
		sessionId: binding.identity?.sessionId ?? null,
		projectRoot: binding.identity?.projectRoot ?? null,
		filePath: binding.identity?.filePath ?? binding.filename,
		projectRef: binding.projectRef,
		fileRef: binding.fileRef,
		targetId,
		targetPath,
		designStateRef: createDesignStateRef(document),
		readOnly,
	};
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
