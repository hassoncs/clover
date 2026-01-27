import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { GameDefinition } from '@slopcade/shared';
import type { ViewportRect } from '../ViewportSystem';
import type { GameState } from '../BehaviorContext';

interface GameHUDProps {
  definition: GameDefinition;
  gameState: GameState;
  viewportRect: ViewportRect;
  screenSize: { width: number; height: number };
  showHUD: boolean;
  onPause: () => void;
  getEntitiesByTag: (tag: string) => Array<{ id: string }>;
}

export function GameHUD({
  definition,
  gameState,
  viewportRect,
  screenSize,
  showHUD,
  onPause,
  getEntitiesByTag,
}: GameHUDProps) {
  if (!showHUD || viewportRect.width === 0 || viewportRect.height === 0) {
    return null;
  }

  return (
    <View style={[
      styles.hud,
      {
        left: viewportRect.x + 12,
        top: viewportRect.y + 50,
        right: screenSize.width - viewportRect.x - viewportRect.width + 12,
      }
    ]}>
      <View style={styles.leftSection}>
        {definition.ui?.showScore !== false && (
          <View style={styles.statContainer}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{gameState.score.toLocaleString()}</Text>
          </View>
        )}
        
        {definition.ui?.showLives && (
          <View style={styles.statContainer}>
            <Text style={styles.statLabel}>{(definition.ui?.livesLabel ?? 'LIVES').toUpperCase()}</Text>
            <Text style={styles.livesValue}>
              {Array.from({ length: gameState.lives }).map(() => '♥').join('')}
            </Text>
          </View>
        )}
        
        {definition.ui?.showTimer && (
          <View style={styles.statContainer}>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.timerValue}>{Math.floor(gameState.time)}s</Text>
          </View>
        )}
      </View>

      <View style={styles.centerSection}>
        {definition.ui?.entityCountDisplays?.map((display) => {
          const count = getEntitiesByTag(display.tag).length;
          return (
            <View key={display.tag} style={styles.statContainer}>
              <Text style={styles.statLabel}>{display.label.toUpperCase()}</Text>
              <Text style={[styles.statValue, display.color ? { color: display.color } : undefined]}>
                {count}
              </Text>
            </View>
          );
        })}
        {definition.ui?.variableDisplays?.map((display) => {
          const value = gameState.variables[display.name];
          const shouldShow = display.showWhen !== 'not_default' || value !== display.defaultValue;
          if (!shouldShow) return null;
          const formattedValue = display.format
            ? display.format.replace('{value}', String(value))
            : String(value);
          return (
            <View key={display.name} style={styles.statContainer}>
              <Text style={styles.statLabel}>{display.label.toUpperCase()}</Text>
              <Text style={[styles.statValue, display.color ? { color: display.color } : undefined]}>
                {formattedValue}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.rightSection}>
        {gameState.state === "playing" && (
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={onPause}
          >
            <Text style={styles.pauseButtonText}>II</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreValue: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontVariant: ['tabular-nums'],
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontVariant: ['tabular-nums'],
  },
  timerValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontVariant: ['tabular-nums'],
  },

  livesValue: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 2,
  },
  pauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
