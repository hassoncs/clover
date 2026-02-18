import { useCallback, useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "../utils/storage";

const STORAGE_KEY = "@amen_dev_tools";

export interface DevToolsState {
	showInputDebug: boolean;
	showPhysicsShapes: boolean;
	showZones: boolean;
	showFPS: boolean;
	isExpanded: boolean;
}

const DEFAULT_STATE: DevToolsState = {
	showInputDebug: false,
	showPhysicsShapes: false,
	showZones: false,
	showFPS: false,
	isExpanded: false,
};

export function useDevTools() {
	const [state, setState] = useState<DevToolsState>(DEFAULT_STATE);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadSettings = async () => {
			try {
				const stored = await getStorageItem<DevToolsState>(
					STORAGE_KEY,
					DEFAULT_STATE,
				);
				setState(stored);
			} catch (error) {
				console.warn("Failed to load dev tools settings:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadSettings();
	}, []);

	const saveSettings = useCallback(async (newState: DevToolsState) => {
		await setStorageItem(STORAGE_KEY, newState);
	}, []);

	const updateState = useCallback(
		(updates: Partial<DevToolsState>) => {
			setState((prev) => {
				const next = { ...prev, ...updates };
				saveSettings(next);
				return next;
			});
		},
		[saveSettings],
	);

	const toggleInputDebug = useCallback(() => {
		setState((prev) => {
			const next = { ...prev, showInputDebug: !prev.showInputDebug };
			saveSettings(next);
			return next;
		});
	}, [saveSettings]);

	const togglePhysicsShapes = useCallback(() => {
		setState((prev) => {
			const next = { ...prev, showPhysicsShapes: !prev.showPhysicsShapes };
			saveSettings(next);
			return next;
		});
	}, [saveSettings]);

	const toggleZones = useCallback(() => {
		setState((prev) => {
			const next = { ...prev, showZones: !prev.showZones };
			saveSettings(next);
			return next;
		});
	}, [saveSettings]);

	const toggleFPS = useCallback(() => {
		setState((prev) => {
			const next = { ...prev, showFPS: !prev.showFPS };
			saveSettings(next);
			return next;
		});
	}, [saveSettings]);

	const toggleExpanded = useCallback(() => {
		setState((prev) => {
			const next = { ...prev, isExpanded: !prev.isExpanded };
			saveSettings(next);
			return next;
		});
	}, [saveSettings]);

	const returnValue = {
		state,
		isLoading,
		toggleInputDebug,
		togglePhysicsShapes,
		toggleZones,
		toggleFPS,
		toggleExpanded,
	};

	return returnValue;
}
