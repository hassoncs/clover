import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ConnectionState } from '../types';

export interface ConnectionStatusOverlayProps {
  connectionState: ConnectionState;
  playerCount: number;
  ping?: number;
  isHost: boolean;
  onDisconnect?: () => void;
  compact?: boolean;
}

const CONNECTION_COLORS: Record<ConnectionState, string> = {
  [ConnectionState.DISCONNECTED]: '#666',
  [ConnectionState.CONNECTING]: '#FFA000',
  [ConnectionState.ADVERTISING]: '#2196F3',
  [ConnectionState.SCANNING]: '#2196F3',
  [ConnectionState.CONNECTED]: '#4CAF50',
  [ConnectionState.RECONNECTING]: '#FFA000',
  [ConnectionState.ERROR]: '#f44336',
};

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  [ConnectionState.DISCONNECTED]: 'Offline',
  [ConnectionState.CONNECTING]: 'Connecting...',
  [ConnectionState.ADVERTISING]: 'Hosting...',
  [ConnectionState.SCANNING]: 'Searching...',
  [ConnectionState.CONNECTED]: 'Connected',
  [ConnectionState.RECONNECTING]: 'Reconnecting...',
  [ConnectionState.ERROR]: 'Connection Lost',
};

export function ConnectionStatusOverlay({
  connectionState,
  playerCount,
  ping,
  isHost,
  onDisconnect,
  compact = false,
}: ConnectionStatusOverlayProps) {
  const color = CONNECTION_COLORS[connectionState];
  const label = CONNECTION_LABELS[connectionState];
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const showWarning = connectionState === ConnectionState.RECONNECTING || connectionState === ConnectionState.ERROR;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={styles.compactText}>
          {playerCount}P{ping !== undefined && ` · ${ping}ms`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, showWarning && styles.containerWarning]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
        {isHost && <Text style={styles.hostBadge}>HOST</Text>}
      </View>

      {isConnected && (
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{playerCount} Players</Text>
          {ping !== undefined && (
            <>
              <Text style={styles.statDivider}>·</Text>
              <Text style={[styles.statText, ping > 100 && styles.highPing]}>
                {ping}ms
              </Text>
            </>
          )}
        </View>
      )}

      {showWarning && (
        <Text style={styles.warningText}>
          {connectionState === 'reconnecting'
            ? 'Attempting to reconnect...'
            : 'Tap to retry connection'}
        </Text>
      )}

      {connectionState === ConnectionState.ERROR && onDisconnect && (
        <TouchableOpacity style={styles.retryButton} onPress={onDisconnect}>
          <Text style={styles.retryButtonText}>Leave Game</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function MinimalConnectionIndicator({
  connectionState,
  ping,
}: {
  connectionState: ConnectionState;
  ping?: number;
}) {
  const color = CONNECTION_COLORS[connectionState];
  const isConnected = connectionState === 'connected';

  return (
    <View style={styles.minimalContainer}>
      <View style={[styles.minimalDot, { backgroundColor: color }]} />
      {isConnected && ping !== undefined && (
        <Text style={[styles.minimalPing, ping > 100 && styles.highPing]}>
          {ping}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
  },
  containerWarning: {
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hostBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statText: {
    color: '#aaa',
    fontSize: 12,
  },
  statDivider: {
    color: '#666',
  },
  highPing: {
    color: '#FFA000',
  },
  warningText: {
    color: '#FFA000',
    fontSize: 12,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  compactText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  minimalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  minimalPing: {
    color: '#888',
    fontSize: 10,
  },
});
