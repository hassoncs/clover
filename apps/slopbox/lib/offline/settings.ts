import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const SETTINGS_KEY = "slopbox:offline-settings";

export interface OfflineSettings {
	offlineMode: boolean;
	autoDownload: boolean;
	wifiOnlyDownload: boolean;
}

const DEFAULT_SETTINGS: OfflineSettings = {
	offlineMode: false,
	autoDownload: true,
	wifiOnlyDownload: true,
};

export function useOfflineMode() {
	const [settings, setSettings] = useState<OfflineSettings>(DEFAULT_SETTINGS);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function loadSettings() {
			try {
				const json = await AsyncStorage.getItem(SETTINGS_KEY);
				if (json) {
					setSettings(JSON.parse(json));
				}
			} catch (error) {
				console.error("Failed to load offline settings:", error);
			} finally {
				setIsLoading(false);
			}
		}
		loadSettings();
	}, []);

	const updateSettings = useCallback(
		async (newSettings: Partial<OfflineSettings>) => {
			try {
				const updated = { ...settings, ...newSettings };
				setSettings(updated);
				await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
			} catch (error) {
				console.error("Failed to save offline settings:", error);
			}
		},
		[settings],
	);

	const toggleOfflineMode = useCallback(
		async (enabled: boolean) => {
			await updateSettings({ offlineMode: enabled });
		},
		[updateSettings],
	);

	return {
		settings,
		isOffline: settings.offlineMode,
		isLoading,
		toggleOfflineMode,
		updateSettings,
	};
}
