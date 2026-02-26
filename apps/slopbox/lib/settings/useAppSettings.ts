import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AppSettings {
	musicVolume: number;
	sfxVolume: number;
	narrationVolume: number;
	captionsEnabled: boolean;
	fontSize: "small" | "medium" | "large";
	denominationMode: "all" | "protestant" | "catholic" | "orthodox";
	defaultRounds: 3 | 5 | 7;
	audienceMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
	musicVolume: 0.8,
	sfxVolume: 1.0,
	narrationVolume: 1.0,
	captionsEnabled: false,
	fontSize: "medium",
	denominationMode: "all",
	defaultRounds: 5,
	audienceMode: false,
};

interface AppSettingsStore {
	settings: AppSettings;
	updateSetting: <K extends keyof AppSettings>(
		key: K,
		value: AppSettings[K],
	) => void;
	resetSettings: () => void;
}

export const useAppSettings = create<AppSettingsStore>()(
	persist(
		(set) => ({
			settings: DEFAULT_SETTINGS,
			updateSetting: (key, value) =>
				set((state) => ({
					settings: { ...state.settings, [key]: value },
				})),
			resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
		}),
		{
			name: "@slopbox/app-settings",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
