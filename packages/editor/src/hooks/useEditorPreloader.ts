import { useCallback, useState } from "react";

/**
 * Editor component modules to preload.
 * These are the heavy chunks that get lazy-loaded when navigating to the editor.
 */
const EDITOR_MODULES = [
	{
		id: "panels/explorer",
		import: () => import("../panels/ExplorerPanel"),
	},
	{
		id: "panels/hierarchy",
		import: () => import("../panels/HierarchyPanel"),
	},
	{
		id: "panels/properties",
		import: () => import("../panels/PropertiesPanel"),
	},
	{
		id: "panels/assets",
		import: () => import("../panels/AssetsPanel"),
	},
	{
		id: "panels/layers",
		import: () => import("../panels/LayersPanel"),
	},
	{
		id: "panels/chat",
		import: () => import("../ChatSidebar"),
	},
	{
		id: "code-editor",
		import: () => import("../code-editor"),
	},
	{
		id: "stage-container",
		import: () => import("../StageContainer"),
	},
] as const;

export interface EditorPreloadState {
	/** Whether preloading has started */
	isPreloading: boolean;
	/** Whether all modules are loaded */
	isReady: boolean;
	/** Number of modules loaded */
	loadedCount: number;
	/** Total number of modules to load */
	totalCount: number;
	/** Progress as a percentage (0-100) */
	progress: number;
	/** IDs of modules that have been loaded */
	loadedModules: string[];
	/** Any error that occurred during preloading */
	error: Error | null;
}

/**
 * Hook to preload editor components in the background.
 *
 * Usage:
 * ```tsx
 * const { startPreload, isReady, progress } = useEditorPreloader();
 *
 * // Start preloading after app is ready
 * useEffect(() => {
 *   if (isAppReady) {
 *     startPreload();
 *   }
 * }, [isAppReady]);
 * ```
 */
export function useEditorPreloader() {
	const [state, setState] = useState<EditorPreloadState>({
		isPreloading: false,
		isReady: false,
		loadedCount: 0,
		totalCount: EDITOR_MODULES.length,
		progress: 0,
		loadedModules: [],
		error: null,
	});

	const startPreload = useCallback(() => {
		if (state.isPreloading || state.isReady) return;

		setState((prev) => ({ ...prev, isPreloading: true, error: null }));

		// Load modules sequentially to avoid overwhelming the bundler
		const loadModules = async () => {
			for (const module of EDITOR_MODULES) {
				try {
					await module.import();
					setState((prev) => {
						const newLoadedCount = prev.loadedCount + 1;
						const progress = Math.round(
							(newLoadedCount / prev.totalCount) * 100,
						);
						return {
							...prev,
							loadedCount: newLoadedCount,
							progress,
							loadedModules: [...prev.loadedModules, module.id],
							isReady: newLoadedCount === prev.totalCount,
							isPreloading: newLoadedCount !== prev.totalCount,
						};
					});
				} catch (err) {
					// Log but continue - don't block other modules
					console.warn(
						`[EditorPreloader] Failed to preload ${module.id}:`,
						err,
					);
				}
			}
		};

		loadModules().catch((err) => {
			setState((prev) => ({
				...prev,
				isPreloading: false,
				error: err instanceof Error ? err : new Error(String(err)),
			}));
		});
	}, [state.isPreloading, state.isReady]);

	return {
		...state,
		startPreload,
	};
}

/**
 * Global singleton to track editor preload state across components.
 * Useful for showing preload status in the UI.
 */
let globalPreloadState: EditorPreloadState = {
	isPreloading: false,
	isReady: false,
	loadedCount: 0,
	totalCount: EDITOR_MODULES.length,
	progress: 0,
	loadedModules: [],
	error: null,
};

const listeners = new Set<() => void>();

export function getEditorPreloadState() {
	return globalPreloadState;
}

export function subscribeToEditorPreload(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function preloadEditorModules(): Promise<void> {
	if (globalPreloadState.isPreloading || globalPreloadState.isReady) {
		return Promise.resolve();
	}

	globalPreloadState = { ...globalPreloadState, isPreloading: true };
	notifyListeners();

	return new Promise((resolve, reject) => {
		const loadModules = async () => {
			for (const module of EDITOR_MODULES) {
				try {
					await module.import();
					globalPreloadState = {
						...globalPreloadState,
						loadedCount: globalPreloadState.loadedCount + 1,
						progress: Math.round(
							((globalPreloadState.loadedCount + 1) /
								globalPreloadState.totalCount) *
								100,
						),
						loadedModules: [...globalPreloadState.loadedModules, module.id],
					};
					notifyListeners();
				} catch (err) {
					console.warn(
						`[EditorPreloader] Failed to preload ${module.id}:`,
						err,
					);
				}
			}

			globalPreloadState = {
				...globalPreloadState,
				isReady: true,
				isPreloading: false,
			};
			notifyListeners();
			resolve();
		};

		loadModules().catch((err) => {
			globalPreloadState = {
				...globalPreloadState,
				isPreloading: false,
				error: err instanceof Error ? err : new Error(String(err)),
			};
			notifyListeners();
			reject(err);
		});
	});
}

function notifyListeners() {
	listeners.forEach((listener) => {
		listener();
	});
}
