export type PencilRuntimeMode = "editor" | "embed" | "prism";

export interface BuildPencilRuntimeRouteInput {
	readonly baseUrl: string;
	readonly sessionId: string;
	readonly projectRoot: string;
	readonly filePath: string;
	readonly mode?: PencilRuntimeMode;
	readonly targetId?: string | null;
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildPencilRuntimeRoute({
	baseUrl,
	sessionId,
	projectRoot,
	filePath,
	mode = "editor",
	targetId,
}: BuildPencilRuntimeRouteInput): string {
	const pathname = mode === "editor" ? "" : "/embed";
	const url = new URL(`${normalizeBaseUrl(baseUrl)}${pathname}`);
	url.searchParams.set("session", sessionId);
	url.searchParams.set("project", projectRoot);
	url.searchParams.set("file", filePath);
	if (mode !== "editor") {
		url.searchParams.set("mode", mode);
	}
	if (targetId) {
		url.searchParams.set("target", targetId);
	}
	return url.toString();
}
