import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import type { GameState } from "../BehaviorContext";

interface GameHUDProps {
  showScore?: boolean;
  score: number;
  showTimer?: boolean;
  time: number;
  showLives?: boolean;
  lives: number;
  gameState: GameState["state"];
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  showScore,
  score,
  showTimer,
  time,
  showLives,
  lives,
  gameState,
  onPause,
}) => {
  return (
    <View style={styles.hud}>
      {showScore !== false && (
        <Text style={styles.scoreText}>Score: {score}</Text>
      )}
      {showTimer && (
        <Text style={styles.timerText}>Time: {Math.floor(time)}s</Text>
      )}
      {showLives && (
        <Text style={styles.livesText}>Lives: {lives}</Text>
      )}
      {gameState === "playing" && (
        <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
          <Text style={styles.pauseButtonText}>⏸</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hud: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  livesText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pauseButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseButtonText: {
    color: "#fff",
    fontSize: 20,
  },
});
