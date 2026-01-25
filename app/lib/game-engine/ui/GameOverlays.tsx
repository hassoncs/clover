import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { GameDefinition, GameState } from '@slopcade/shared';

interface GameOverlaysProps {
  definition: GameDefinition;
  gameState: GameState;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onBackToMenu?: () => void;
}

export function GameOverlays({
  definition,
  gameState,
  onStart,
  onResume,
  onRestart,
  onBackToMenu,
}: GameOverlaysProps) {
  if (gameState.state === "paused") {
    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Paused</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onResume}
        >
          <Text style={styles.buttonText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#888", marginTop: 12 }]}
          onPress={onRestart}
        >
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gameState.state === "ready") {
    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>{definition.metadata.title}</Text>
        {definition.metadata.instructions && (
          <Text style={styles.instructions}>
            {definition.metadata.instructions}
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={onStart}>
          <Text style={styles.buttonText}>Play</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gameState.state === "won" || gameState.state === "lost") {
    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>
          {gameState.state === "won" ? "🎉 You Win!" : "💀 Game Over"}
        </Text>
        <Text style={styles.finalScore}>Final Score: {gameState.score}</Text>
        <TouchableOpacity style={styles.button} onPress={onRestart}>
          <Text style={styles.buttonText}>Play Again</Text>
        </TouchableOpacity>
        {onBackToMenu && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBackToMenu}
          >
            <Text style={styles.buttonText}>Back to Menu</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructions: {
    color: '#ccc',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 30,
    lineHeight: 24,
  },
  finalScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: '#666',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
