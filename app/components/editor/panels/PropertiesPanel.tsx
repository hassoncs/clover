import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useEditor } from "../EditorProvider";
import type { PhysicsBodyType } from "@slopcade/shared";

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
  const [inputValue, setInputValue] = useState(value.toFixed(step < 1 ? 1 : 0));

  useEffect(() => {
    setInputValue(value.toFixed(step < 1 ? 1 : 0));
  }, [value, step]);

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

function PropertySegment({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmentContainer}>
      <Text style={styles.segmentLabel}>{label}</Text>
      <View style={styles.segmentButtons}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.segmentButton,
              value === option.value && styles.segmentButtonActive,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.segmentButtonText,
                value === option.value && styles.segmentButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const BODY_TYPE_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Dynamic" },
  { value: "kinematic", label: "Kinematic" },
];

const COLOR_PRESETS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export function PropertiesPanel() {
  const {
    selectedEntity,
    selectedEntityId,
    moveEntity,
    scaleEntity,
    rotateEntity,
    deleteEntity,
    duplicateEntity,
    updateEntityProperty,
    document,
  } = useEditor();

  if (!selectedEntity || !selectedEntityId) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Select an entity to edit</Text>
      </View>
    );
  }

  const displayName = selectedEntity.name || selectedEntity.template || selectedEntity.id;
  const physics = selectedEntity.physics;
  const sprite = selectedEntity.sprite;

  const x = selectedEntity.transform.x;
  const y = selectedEntity.transform.y;
  const scaleX = selectedEntity.transform.scaleX ?? 1;
  const rotation = (selectedEntity.transform.angle ?? 0) * (180 / Math.PI);

  const worldBounds = document.world.bounds ?? { width: 20, height: 12 };

  const handlePhysicsChange = (property: string, value: unknown) => {
    updateEntityProperty(selectedEntityId, `physics.${property}`, value);
  };

  const handleSpriteChange = (property: string, value: unknown) => {
    updateEntityProperty(selectedEntityId, `sprite.${property}`, value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.entityName}>{displayName}</Text>
          {physics && (
            <Text style={styles.entityType}>{physics.shape}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => duplicateEntity(selectedEntityId)}
          >
            <Text style={styles.iconButtonText}>📋</Text>
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.deleteButton]}
            onPress={() => deleteEntity(selectedEntityId)}
          >
            <Text style={styles.iconButtonText}>🗑️</Text>
          </Pressable>
        </View>
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
          unit="°"
          onChange={(deg) => rotateEntity(selectedEntityId, deg * (Math.PI / 180))}
        />
      </View>

      {sprite && "color" in sprite && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <Text style={styles.colorLabel}>Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  sprite.color === color && styles.colorSwatchActive,
                ]}
                onPress={() => handleSpriteChange("color", color)}
              />
            ))}
          </View>
        </View>
      )}

      {physics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PHYSICS</Text>
          
          <PropertySegment
            label="Body Type"
            options={BODY_TYPE_OPTIONS}
            value={physics.bodyType}
            onChange={(value) => handlePhysicsChange("bodyType", value as PhysicsBodyType)}
          />

          <PropertySlider
            label="Density"
            value={physics.density}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(value) => handlePhysicsChange("density", value)}
          />

          <PropertySlider
            label="Friction"
            value={physics.friction}
            min={0}
            max={1}
            step={0.1}
            onChange={(value) => handlePhysicsChange("friction", value)}
          />

          <PropertySlider
            label="Bounce"
            value={physics.restitution}
            min={0}
            max={1}
            step={0.1}
            onChange={(value) => handlePhysicsChange("restitution", value)}
          />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#7F1D1D",
  },
  iconButtonText: {
    fontSize: 16,
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
  segmentContainer: {
    marginBottom: 12,
  },
  segmentLabel: {
    color: "#D1D5DB",
    fontSize: 14,
    marginBottom: 8,
  },
  segmentButtons: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#374151",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#1F2937",
  },
  segmentButtonActive: {
    backgroundColor: "#4F46E5",
  },
  segmentButtonText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  colorLabel: {
    color: "#D1D5DB",
    fontSize: 14,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#FFFFFF",
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
