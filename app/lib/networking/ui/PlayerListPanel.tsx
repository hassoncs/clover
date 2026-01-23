import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface Player {
  id: string;
  name: string;
  isLocal: boolean;
  isHost?: boolean;
  ping?: number;
  score?: number;
  status?: 'ready' | 'playing' | 'disconnected';
}

export interface PlayerListPanelProps {
  players: Player[];
  localPlayerId?: string | null;
  showScores?: boolean;
  showPing?: boolean;
  maxHeight?: number;
  title?: string;
}

const STATUS_COLORS = {
  ready: '#4CAF50',
  playing: '#2196F3',
  disconnected: '#666',
};

export function PlayerListPanel({
  players,
  localPlayerId,
  showScores = false,
  showPing = false,
  maxHeight = 200,
  title = 'Players',
}: PlayerListPanelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} ({players.length})
      </Text>
      <ScrollView style={[styles.list, { maxHeight }]} showsVerticalScrollIndicator={false}>
        {players.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            isLocal={player.id === localPlayerId || player.isLocal}
            showScore={showScores}
            showPing={showPing}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function PlayerRow({
  player,
  isLocal,
  showScore,
  showPing,
}: {
  player: Player;
  isLocal: boolean;
  showScore: boolean;
  showPing: boolean;
}) {
  const statusColor = player.status ? STATUS_COLORS[player.status] : STATUS_COLORS.ready;

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerInfo}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <Text style={[styles.playerName, isLocal && styles.localPlayer]}>
          {player.name}
          {isLocal && ' (You)'}
        </Text>
        {player.isHost && <Text style={styles.hostBadge}>HOST</Text>}
      </View>

      <View style={styles.playerStats}>
        {showPing && player.ping !== undefined && (
          <Text style={[styles.pingText, player.ping > 100 && styles.highPing]}>
            {player.ping}ms
          </Text>
        )}
        {showScore && player.score !== undefined && (
          <Text style={styles.scoreText}>{player.score}</Text>
        )}
      </View>
    </View>
  );
}

export function CompactPlayerList({
  players,
  localPlayerId,
}: {
  players: Player[];
  localPlayerId?: string | null;
}) {
  return (
    <View style={styles.compactContainer}>
      {players.slice(0, 4).map((player, index) => (
        <View
          key={player.id}
          style={[
            styles.compactAvatar,
            player.id === localPlayerId && styles.compactAvatarLocal,
          ]}
        >
          <Text style={styles.compactAvatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {players.length > 4 && (
        <View style={styles.compactMore}>
          <Text style={styles.compactMoreText}>+{players.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 12,
  },
  title: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    flexGrow: 0,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  localPlayer: {
    fontWeight: '600',
  },
  hostBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pingText: {
    color: '#888',
    fontSize: 11,
  },
  highPing: {
    color: '#FFA000',
  },
  scoreText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  compactContainer: {
    flexDirection: 'row',
    gap: -8,
  },
  compactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  compactAvatarLocal: {
    borderColor: '#4CAF50',
  },
  compactAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  compactMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  compactMoreText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
});
