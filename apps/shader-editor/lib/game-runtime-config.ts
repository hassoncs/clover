import { configureGameRuntime } from "@slopcade/game-runtime";

configureGameRuntime({
	apiUrl: "",
	getAuthToken: async () => null,
	getStorageItem: async <T>(_key: string, defaultValue: T) => defaultValue,
	setStorageItem: async () => {},
});
