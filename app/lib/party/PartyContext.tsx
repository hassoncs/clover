import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { PartyInputRequest, PartyPlayer, PartyRoomState } from "./types";
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
	sendInput: (value: unknown) => void;
	sendStartGame: () => void;
}

const PartyContext = createContext<PartyContextValue | null>(null);

export interface PartyProviderProps {
	code: string;
	role: "host" | "player";
	name?: string;
	hostToken?: string;
	children: React.ReactNode;
}

export function PartyProvider({
	code,
	role,
	name,
	hostToken,
	children,
}: PartyProviderProps) {
	const connection = usePartyConnection({ code, role, name, hostToken });

	const value = useMemo<PartyContextValue>(
		() => ({
			role,
			...connection,
		}),
		[role, connection],
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
