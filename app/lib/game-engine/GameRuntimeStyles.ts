import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewportContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  godotView: {
    flex: 1,
  },
  hud: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  variableText: {
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
