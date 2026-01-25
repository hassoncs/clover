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
        left: viewportRect.x + 20,
        top: viewportRect.y + 40,
        right: screenSize.width - viewportRect.x - viewportRect.width + 20,
      }
    ]}>
      {definition.ui?.showScore !== false && (
        <Text style={styles.scoreText}>Score: {gameState.score}</Text>
      )}
      {definition.ui?.showTimer && (
        <Text style={styles.timerText}>
          Time: {Math.floor(gameState.time)}s
        </Text>
      )}
      {definition.ui?.showLives && (
        <Text style={styles.livesText}>{definition.ui?.livesLabel ?? 'Lives'}: {gameState.lives}</Text>
      )}
      {definition.ui?.entityCountDisplays?.map((display) => {
        const count = getEntitiesByTag(display.tag).length;
        return (
          <Text
            key={display.tag}
            style={[styles.livesText, display.color ? { color: display.color } : undefined]}
          >
            {display.label}: {count}
          </Text>
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
          <Text
            key={display.name}
            style={[styles.livesText, display.color ? { color: display.color } : undefined]}
          >
            {display.label}: {formattedValue}
          </Text>
        );
      })}
      {gameState.state === "playing" && (
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={onPause}
        >
          <Text style={styles.pauseButtonText}>⏸</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  livesText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pauseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 20,
  },
});
