import type React from "react";
import { createContext, useContext, useMemo } from "react";

export interface GameRuntimeConfig {
	apiUrl: string;
	getAuthToken: () => Promise<string | null>;
	getStorageItem: <T>(key: string, defaultValue: T) => Promise<T>;
	setStorageItem: <T>(key: string, value: T) => Promise<void>;
	/** Optional UI components — dev-only, safe to omit in production apps */
	DevToolbar?: React.ComponentType;
	// biome-ignore lint/suspicious/noExplicitAny: Props vary by app — type safety enforced at call site
	GameDialog?: React.ComponentType<any>;
	// biome-ignore lint/suspicious/noExplicitAny: Props vary by app — type safety enforced at call site
	TuningPanel?: React.ComponentType<any>;
	// biome-ignore lint/suspicious/noExplicitAny: Props vary by app — type safety enforced at call site
	hasTunables?: (variables: any) => boolean;
}

const defaultConfig: GameRuntimeConfig = {
	apiUrl: "",
	getAuthToken: async () => null,
	getStorageItem: async <T,>(_key: string, defaultValue: T) => defaultValue,
	setStorageItem: async () => {},
};

let staticConfig: GameRuntimeConfig = defaultConfig;

export function configureGameRuntime(config: GameRuntimeConfig): void {
	staticConfig = config;
}

export function getGameRuntimeConfig(): GameRuntimeConfig {
	return staticConfig;
}

const GameRuntimeConfigContext = createContext<GameRuntimeConfig | null>(null);

export function GameRuntimeConfigProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const config = useMemo(() => staticConfig, []);
	return (
		<GameRuntimeConfigContext.Provider value={config}>
			{children}
		</GameRuntimeConfigContext.Provider>
	);
}

export function useGameRuntimeConfig(): GameRuntimeConfig {
	const contextConfig = useContext(GameRuntimeConfigContext);
	return contextConfig ?? staticConfig;
}
