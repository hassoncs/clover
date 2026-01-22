import { View, Text, Switch, StyleSheet } from "react-native";
import { useState } from "react";

export function DebugPanel() {
  const [showPhysicsBounds, setShowPhysicsBounds] = useState(true);
  const [showSpriteBounds, setShowSpriteBounds] = useState(true);
  const [showEntityIds, setShowEntityIds] = useState(false);
  const [showFps, setShowFps] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DEBUG OPTIONS</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show Physics Bounds</Text>
          <Switch
            value={showPhysicsBounds}
            onValueChange={setShowPhysicsBounds}
            trackColor={{ false: "#374151", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show Sprite Bounds</Text>
          <Switch
            value={showSpriteBounds}
            onValueChange={setShowSpriteBounds}
            trackColor={{ false: "#374151", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show Entity IDs</Text>
          <Switch
            value={showEntityIds}
            onValueChange={setShowEntityIds}
            trackColor={{ false: "#374151", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show FPS Counter</Text>
          <Switch
            value={showFps}
            onValueChange={setShowFps}
            trackColor={{ false: "#374151", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFO</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Active Bodies</Text>
          <Text style={styles.infoValue}>--</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contacts</Text>
          <Text style={styles.infoValue}>--</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Frame Time</Text>
          <Text style={styles.infoValue}>--</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  toggleLabel: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
  },
});
