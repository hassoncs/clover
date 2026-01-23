import { useState, useCallback, useRef, useEffect } from 'react';
import { GameSession, type GameSessionConfig, type TransportType } from '../GameSession';
import type { Box2DWorldAdapter } from '../sync/Box2DSynchronizer';
import type { ConnectionState, PeerId, PlayerInput, GameSyncState } from '../types';

export interface MultiplayerState {
  isConnected: boolean;
  isHost: boolean;
  connectionState: ConnectionState;
  roomCode: string | null;
  localPlayerId: string | null;
  players: Array<{ id: string; name: string; isLocal: boolean }>;
  error: string | null;
}

export interface UseMultiplayerOptions {
  gameId: string;
  deviceName: string;
  serverUrl?: string;
  onGameStateUpdate?: (state: GameSyncState) => void;
}

export interface UseMultiplayerReturn {
  state: MultiplayerState;
  hostGame: (transport: TransportType) => Promise<string | null>;
  joinGame: (transport: TransportType, roomCode?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  update: (input: PlayerInput) => void;
  setGameState: (state: Partial<GameSyncState>) => void;
  getGameState: () => GameSyncState;
  setWorldAdapter: (adapter: Box2DWorldAdapter) => void;
}

const initialState: MultiplayerState = {
  isConnected: false,
  isHost: false,
  connectionState: 'disconnected' as ConnectionState,
  roomCode: null,
  localPlayerId: null,
  players: [],
  error: null,
};

export function useMultiplayer(options: UseMultiplayerOptions): UseMultiplayerReturn {
  const [state, setState] = useState<MultiplayerState>(initialState);
  const sessionRef = useRef<GameSession | null>(null);
  const worldAdapterRef = useRef<Box2DWorldAdapter | null>(null);

  const updateState = useCallback((updates: Partial<MultiplayerState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const createSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.disconnect();
    }

    const session = new GameSession({
      onStateChange: (connectionState) => {
        updateState({
          connectionState,
          isConnected: connectionState === 'connected',
        });
      },
      onPlayerJoined: (playerId, playerName) => {
        setState((prev) => ({
          ...prev,
          players: [
            ...prev.players,
            { id: playerId, name: playerName, isLocal: playerId === prev.localPlayerId },
          ],
        }));
      },
      onPlayerLeft: (playerId) => {
        setState((prev) => ({
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        }));
      },
      onGameStateUpdate: (gameState) => {
        options.onGameStateUpdate?.(gameState);
      },
      onError: (error) => {
        updateState({ error: error.message });
      },
    });

    sessionRef.current = session;
    return session;
  }, [options, updateState]);

  const hostGame = useCallback(
    async (transport: TransportType): Promise<string | null> => {
      try {
        updateState({ error: null });

        if (!worldAdapterRef.current) {
          throw new Error('World adapter not set. Call setWorldAdapter first.');
        }

        const session = createSession();

        const config: GameSessionConfig = {
          transportType: transport,
          deviceName: options.deviceName,
          gameId: options.gameId,
          serverUrl: options.serverUrl,
        };

        await session.host(config, worldAdapterRef.current);

        const roomCode = session.roomCode;
        const localPlayerId = session.localPeerId;

        updateState({
          isHost: true,
          roomCode,
          localPlayerId,
          players: [{ id: localPlayerId!, name: options.deviceName, isLocal: true }],
        });

        return roomCode;
      } catch (error) {
        updateState({ error: (error as Error).message });
        return null;
      }
    },
    [createSession, options, updateState]
  );

  const joinGame = useCallback(
    async (transport: TransportType, roomCode?: string): Promise<boolean> => {
      try {
        updateState({ error: null });

        if (!worldAdapterRef.current) {
          throw new Error('World adapter not set. Call setWorldAdapter first.');
        }

        const session = createSession();

        const config: GameSessionConfig = {
          transportType: transport,
          deviceName: options.deviceName,
          gameId: options.gameId,
          sessionId: roomCode,
          serverUrl: options.serverUrl,
        };

        await session.join(config, worldAdapterRef.current);

        const localPlayerId = session.localPeerId;

        updateState({
          isHost: false,
          roomCode: roomCode ?? null,
          localPlayerId,
          players: session.connectedPlayers.map((p) => ({
            ...p,
            isLocal: p.id === localPlayerId,
          })),
        });

        return true;
      } catch (error) {
        updateState({ error: (error as Error).message });
        return false;
      }
    },
    [createSession, options, updateState]
  );

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    setState(initialState);
  }, []);

  const update = useCallback((input: PlayerInput) => {
    sessionRef.current?.update(input);
  }, []);

  const setGameState = useCallback((gameState: Partial<GameSyncState>) => {
    sessionRef.current?.setGameState(gameState);
  }, []);

  const getGameState = useCallback((): GameSyncState => {
    return (
      sessionRef.current?.getGameState() ?? {
        score: 0,
        lives: 3,
        time: 0,
        state: 'ready',
      }
    );
  }, []);

  const setWorldAdapter = useCallback((adapter: Box2DWorldAdapter) => {
    worldAdapterRef.current = adapter;
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  return {
    state,
    hostGame,
    joinGame,
    disconnect,
    update,
    setGameState,
    getGameState,
    setWorldAdapter,
  };
}
