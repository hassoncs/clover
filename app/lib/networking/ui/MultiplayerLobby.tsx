import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { TransportType } from '../GameSession';
import type { MultiplayerState } from '../hooks/useMultiplayer';

export interface MultiplayerLobbyProps {
  state: MultiplayerState;
  onHost: (transport: TransportType) => Promise<string | null>;
  onJoin: (transport: TransportType, roomCode?: string) => Promise<boolean>;
  onDisconnect: () => Promise<void>;
  onStartGame?: () => void;
  gameTitle?: string;
}

type LobbyScreen = 'menu' | 'host' | 'join' | 'waiting';

export function MultiplayerLobby({
  state,
  onHost,
  onJoin,
  onDisconnect,
  onStartGame,
  gameTitle = 'Multiplayer',
}: MultiplayerLobbyProps) {
  const [screen, setScreen] = useState<LobbyScreen>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportType>('ble');

  const handleHost = async () => {
    setIsLoading(true);
    const code = await onHost(selectedTransport);
    setIsLoading(false);
    if (code) {
      setScreen('waiting');
    }
  };

  const handleJoin = async () => {
    setIsLoading(true);
    const success = await onJoin(selectedTransport, roomCode || undefined);
    setIsLoading(false);
    if (success) {
      setScreen('waiting');
    }
  };

  const handleBack = async () => {
    if (state.isConnected) {
      await onDisconnect();
    }
    setScreen('menu');
    setRoomCode('');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {screen === 'host' ? 'Starting game...' : 'Joining game...'}
        </Text>
      </View>
    );
  }

  if (screen === 'menu') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{gameTitle}</Text>
        <Text style={styles.subtitle}>Multiplayer</Text>

        <View style={styles.transportSelector}>
          <TouchableOpacity
            style={[
              styles.transportOption,
              selectedTransport === 'ble' && styles.transportSelected,
            ]}
            onPress={() => setSelectedTransport('ble')}
          >
            <Text style={styles.transportIcon}>📶</Text>
            <Text style={styles.transportLabel}>Bluetooth</Text>
            <Text style={styles.transportDesc}>Nearby players</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportOption,
              selectedTransport === 'websocket' && styles.transportSelected,
            ]}
            onPress={() => setSelectedTransport('websocket')}
          >
            <Text style={styles.transportIcon}>🌐</Text>
            <Text style={styles.transportLabel}>Online</Text>
            <Text style={styles.transportDesc}>Play anywhere</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setScreen('host')}
        >
          <Text style={styles.buttonText}>Host Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen('join')}
        >
          <Text style={styles.buttonText}>Join Game</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'host') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Host Game</Text>
        <Text style={styles.description}>
          {selectedTransport === 'ble'
            ? 'Other players will find your game via Bluetooth'
            : 'Share your room code with friends'}
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleHost}>
          <Text style={styles.buttonText}>Start Hosting</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'join') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Join Game</Text>

        {selectedTransport === 'websocket' && (
          <View style={styles.codeInputContainer}>
            <Text style={styles.label}>Enter Room Code</Text>
            <TextInput
              style={styles.codeInput}
              value={roomCode}
              onChangeText={(text) => setRoomCode(text.toUpperCase())}
              placeholder="ABCDEF"
              placeholderTextColor="#666"
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
        )}

        {selectedTransport === 'ble' && (
          <Text style={styles.description}>
            Searching for nearby games...
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            selectedTransport === 'websocket' && roomCode.length < 4 && styles.buttonDisabled,
          ]}
          onPress={handleJoin}
          disabled={selectedTransport === 'websocket' && roomCode.length < 4}
        >
          <Text style={styles.buttonText}>
            {selectedTransport === 'ble' ? 'Search & Join' : 'Join'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'waiting') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {state.isHost ? 'Waiting for Players' : 'Connected'}
        </Text>

        {state.roomCode && (
          <View style={styles.roomCodeDisplay}>
            <Text style={styles.roomCodeLabel}>Room Code</Text>
            <Text style={styles.roomCode}>{state.roomCode}</Text>
          </View>
        )}

        <View style={styles.playerList}>
          <Text style={styles.playerListTitle}>
            Players ({state.players.length})
          </Text>
          {state.players.map((player) => (
            <View key={player.id} style={styles.playerItem}>
              <Text style={styles.playerName}>
                {player.name}
                {player.isLocal && ' (You)'}
              </Text>
              {state.isHost && player.isLocal && (
                <Text style={styles.hostBadge}>HOST</Text>
              )}
            </View>
          ))}
        </View>

        {state.isHost && state.players.length >= 2 && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onStartGame}
          >
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        )}

        {state.isHost && state.players.length < 2 && (
          <Text style={styles.waitingText}>
            Waiting for at least one more player...
          </Text>
        )}

        {state.error && (
          <Text style={styles.errorText}>{state.error}</Text>
        )}

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Leave Game</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  transportSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  transportOption: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: 140,
    borderWidth: 2,
    borderColor: '#333',
  },
  transportSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a3a1a',
  },
  transportIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  transportLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  transportDesc: {
    fontSize: 12,
    color: '#888',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
  codeInputContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  codeInput: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#333',
  },
  roomCodeDisplay: {
    backgroundColor: '#1a3a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  roomCodeLabel: {
    color: '#4CAF50',
    fontSize: 14,
    marginBottom: 8,
  },
  roomCode: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 8,
  },
  playerList: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
  },
  playerListTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
  },
  hostBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waitingText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 20,
  },
});
