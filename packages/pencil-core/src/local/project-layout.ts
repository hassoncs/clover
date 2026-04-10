import { resolve } from "node:path";

export const PENCIL_PROJECT_DIRNAME = ".pencil";
export const PENCIL_DOCUMENTS_DIRNAME = "documents";
export const PENCIL_ASSETS_DIRNAME = "assets";
export const PENCIL_EXPORTS_DIRNAME = "exports";
export const PENCIL_CACHE_DIRNAME = "cache";
export const PENCIL_PROJECT_METADATA_FILE = "project.json";
export const PENCIL_PROJECT_STATE_FILE = "state.json";

export interface PencilProjectLayout {
	readonly root: string;
	readonly pencilDir: string;
	readonly documentsDir: string;
	readonly assetsDir: string;
	readonly exportsDir: string;
	readonly cacheDir: string;
	readonly projectMetadataFile: string;
	readonly stateFile: string;
}

export function getPencilProjectLayout(
	projectRoot: string,
): PencilProjectLayout {
	const root = resolve(projectRoot);
	const pencilDir = resolve(root, PENCIL_PROJECT_DIRNAME);
	return {
		root,
		pencilDir,
		documentsDir: resolve(root, PENCIL_DOCUMENTS_DIRNAME),
		assetsDir: resolve(root, PENCIL_ASSETS_DIRNAME),
		exportsDir: resolve(root, PENCIL_EXPORTS_DIRNAME),
		cacheDir: resolve(pencilDir, PENCIL_CACHE_DIRNAME),
		projectMetadataFile: resolve(pencilDir, PENCIL_PROJECT_METADATA_FILE),
		stateFile: resolve(pencilDir, PENCIL_PROJECT_STATE_FILE),
	};
}
