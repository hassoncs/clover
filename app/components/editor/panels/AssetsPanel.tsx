import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { useEditor } from "../EditorProvider";
import type { GameEntity } from "@slopcade/shared";

const CATEGORIES = ["All", "Characters", "Props", "Backgrounds", "Effects"];

const BASIC_SHAPES = [
  { id: "box", icon: "⬜", label: "Box", physicsShape: "box" as const, spriteType: "rect" as const },
  { id: "circle", icon: "⚪", label: "Circle", physicsShape: "circle" as const, spriteType: "circle" as const },
  { id: "triangle", icon: "🔺", label: "Triangle", physicsShape: "polygon" as const, spriteType: "polygon" as const },
];

interface AssetsPanelProps {
  onOpenAIModal?: () => void;
}

export function AssetsPanel({ onOpenAIModal }: AssetsPanelProps) {
  const { document, addEntity, addEntityFromTemplate, setSheetSnapPoint } = useEditor();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const gameAssets = Object.keys(document.templates).map((templateId) => ({
    id: templateId,
    name: templateId,
    template: document.templates[templateId],
  }));

  const filteredAssets = gameAssets.filter((asset) => {
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAddFromTemplate = (templateId: string) => {
    const centerX = 10;
    const centerY = 6;
    addEntityFromTemplate(templateId, centerX, centerY);
    setSheetSnapPoint(0);
  };

  const handleAddBasicShape = (shape: typeof BASIC_SHAPES[number]) => {
    const centerX = 10;
    const centerY = 6;
    const newId = `${shape.id}_${Date.now()}`;
    const color = shape.physicsShape === "circle" ? "#3B82F6" : "#10B981";
    
    let newEntity: GameEntity;
    
    if (shape.physicsShape === "circle") {
      newEntity = {
        id: newId,
        name: shape.label,
        transform: { x: centerX, y: centerY, angle: 0, scaleX: 1, scaleY: 1 },
        sprite: { type: "circle", radius: 0.5, color },
        physics: { shape: "circle", bodyType: "dynamic", radius: 0.5, density: 1, friction: 0.3, restitution: 0.5 },
      };
    } else if (shape.physicsShape === "polygon") {
      const vertices = [{ x: 0, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }];
      newEntity = {
        id: newId,
        name: shape.label,
        transform: { x: centerX, y: centerY, angle: 0, scaleX: 1, scaleY: 1 },
        sprite: { type: "polygon", vertices, color },
        physics: { shape: "polygon", bodyType: "dynamic", vertices, density: 1, friction: 0.3, restitution: 0.5 },
      };
    } else {
      newEntity = {
        id: newId,
        name: shape.label,
        transform: { x: centerX, y: centerY, angle: 0, scaleX: 1, scaleY: 1 },
        sprite: { type: "rect", width: 1, height: 1, color },
        physics: { shape: "box", bodyType: "dynamic", width: 1, height: 1, density: 1, friction: 0.3, restitution: 0.5 },
      };
    }
    
    addEntity(newEntity);
    setSheetSnapPoint(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search assets..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredAssets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FROM THIS GAME</Text>
          <View style={styles.assetGrid}>
            {filteredAssets.map((asset) => (
              <Pressable 
                key={asset.id} 
                style={styles.assetCard}
                onPress={() => handleAddFromTemplate(asset.id)}
              >
                <View style={styles.assetIcon}>
                  <Text style={styles.assetIconText}>
                    {asset.template.physics?.shape === "circle" ? "⚪" : "⬜"}
                  </Text>
                </View>
                <Text style={styles.assetLabel} numberOfLines={1}>
                  {asset.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASIC SHAPES</Text>
        <View style={styles.assetGrid}>
          {BASIC_SHAPES.map((shape) => (
            <Pressable 
              key={shape.id} 
              style={styles.assetCard}
              onPress={() => handleAddBasicShape(shape)}
            >
              <View style={styles.assetIcon}>
                <Text style={styles.assetIconText}>{shape.icon}</Text>
              </View>
              <Text style={styles.assetLabel}>{shape.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.generateButton} onPress={onOpenAIModal}>
        <Text style={styles.generateButtonText}>Generate with AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#374151",
    borderRadius: 8,
    padding: 12,
    color: "#FFFFFF",
    fontSize: 14,
  },
  categories: {
    marginBottom: 16,
    maxHeight: 40,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#374151",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#4F46E5",
  },
  categoryText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  categoryTextActive: {
    color: "#FFFFFF",
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
  assetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  assetCard: {
    width: "25%",
    padding: 6,
    alignItems: "center",
  },
  assetIcon: {
    width: 56,
    height: 56,
    backgroundColor: "#374151",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  assetIconText: {
    fontSize: 28,
  },
  assetLabel: {
    color: "#D1D5DB",
    fontSize: 11,
    textAlign: "center",
  },
  generateButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
