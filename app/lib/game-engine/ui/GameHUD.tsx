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
        {definition.ui?.variableDisplays?.filter(d => d.position === 'top-left' || !d.position).map((display) => {
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

      <View style={styles.centerSection}>
        {definition.ui?.variableDisplays?.filter(d => d.position === 'top-center').map((display) => {
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
        {definition.ui?.variableDisplays?.filter(d => d.position === 'top-right').map((display) => {
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
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
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontVariant: ['tabular-nums'],
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
