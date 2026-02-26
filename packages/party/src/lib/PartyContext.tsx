import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import type {
	GameConfig,
	PartyInputRequest,
	PartyPlayer,
	PartyRoomState,
} from "./types";
import type {
	ActiveInputRequest,
	ConnectionStatus,
} from "./usePartyConnection";
import { usePartyConnection } from "./usePartyConnection";

export interface PartyContextValue {
	role: "host" | "player";
	roomState: PartyRoomState | null;
	privateState: unknown | null;
	connectionStatus: ConnectionStatus;
	players: PartyPlayer[];
	activeInputRequest: ActiveInputRequest | null;
	gameConfig: GameConfig;
	setGameConfig: (config: GameConfig) => void;
	sendInput: (value: unknown) => void;
	sendStartGame: () => void;
}

const DEFAULT_GAME_CONFIG: GameConfig = {
	rounds: 5,
	contentPack: "full-bible",
	difficulty: "disciple",
	timerMode: "standard",
	audienceVoting: true,
};

const PartyContext = createContext<PartyContextValue | null>(null);

export interface PartyProviderProps {
	code: string;
	role: "host" | "player";
	name?: string;
	avatar?: string;
	hostToken?: string;
	children: React.ReactNode;
}

export function PartyProvider({
	code,
	role,
	name,
	avatar,
	hostToken,
	children,
}: PartyProviderProps) {
	const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
	const connection = usePartyConnection({
		code,
		role,
		name,
		avatar,
		hostToken,
	});

	const value = useMemo<PartyContextValue>(
		() => ({
			role,
			...connection,
			gameConfig,
			setGameConfig,
			sendStartGame: () => connection.sendStartGame(gameConfig),
		}),
		[role, connection, gameConfig],
	);

	return (
		<PartyContext.Provider value={value}>{children}</PartyContext.Provider>
	);
}

export function useParty(): PartyContextValue {
	const context = useContext(PartyContext);
	if (!context) {
		throw new Error("useParty must be used within PartyProvider");
	}
	return context;
}
