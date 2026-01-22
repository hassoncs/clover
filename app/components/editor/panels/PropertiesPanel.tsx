import { View, Text, TextInput, StyleSheet } from "react-native";
import { useState, useCallback } from "react";
import { useEditor } from "../EditorProvider";

function PropertySlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const [inputValue, setInputValue] = useState(value.toFixed(1));

  const handleChangeText = useCallback(
    (text: string) => {
      setInputValue(text);
      const num = parseFloat(text);
      if (!isNaN(num) && num >= min && num <= max) {
        onChange(num);
      }
    },
    [min, max, onChange]
  );

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={handleChangeText}
        keyboardType="numeric"
        selectTextOnFocus
      />
      <Text style={styles.sliderUnit}>{unit}</Text>
    </View>
  );
}

export function PropertiesPanel() {
  const { selectedEntity, selectedEntityId, moveEntity, scaleEntity, rotateEntity, document } =
    useEditor();

  if (!selectedEntity || !selectedEntityId) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Select an entity to edit</Text>
      </View>
    );
  }

  const template = selectedEntity.template ? document.templates[selectedEntity.template] : null;
  const displayName = selectedEntity.name || selectedEntity.template || selectedEntity.id;

  const x = selectedEntity.transform.x;
  const y = selectedEntity.transform.y;
  const scaleX = selectedEntity.transform.scaleX ?? 1;
  const rotation = (selectedEntity.transform.angle ?? 0) * (180 / Math.PI);

  const worldBounds = document.world.bounds ?? { width: 20, height: 12 };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.entityName}>{displayName}</Text>
        {template && (
          <Text style={styles.entityType}>{template.physics?.shape || "entity"}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>POSITION</Text>

        <PropertySlider
          label="X"
          value={x}
          min={0}
          max={worldBounds.width}
          onChange={(newX) => moveEntity(selectedEntityId, newX, y)}
        />

        <PropertySlider
          label="Y"
          value={y}
          min={0}
          max={worldBounds.height}
          onChange={(newY) => moveEntity(selectedEntityId, x, newY)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TRANSFORM</Text>

        <PropertySlider
          label="Scale"
          value={scaleX}
          min={0.25}
          max={4}
          step={0.1}
          unit="x"
          onChange={(newScale) => scaleEntity(selectedEntityId, newScale)}
        />

        <PropertySlider
          label="Rotation"
          value={Math.abs(rotation)}
          min={0}
          max={360}
          step={1}
          unit="deg"
          onChange={(deg) => rotateEntity(selectedEntityId, deg * (Math.PI / 180))}
        />
      </View>

      {template?.physics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PHYSICS</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{template.physics.bodyType}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shape</Text>
            <Text style={styles.infoValue}>{template.physics.shape}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Density</Text>
            <Text style={styles.infoValue}>{template.physics.density}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  entityName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  entityType: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
    textTransform: "capitalize",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderLabel: {
    color: "#D1D5DB",
    fontSize: 14,
    width: 70,
  },
  input: {
    flex: 1,
    backgroundColor: "#374151",
    borderRadius: 6,
    padding: 10,
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
  },
  sliderUnit: {
    color: "#9CA3AF",
    fontSize: 12,
    width: 30,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    textTransform: "capitalize",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
