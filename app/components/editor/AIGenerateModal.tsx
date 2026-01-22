import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import type { GameEntity } from "@slopcade/shared";

interface AIGenerateModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_PROMPTS = [
  { label: "Player character", prompt: "A cute cartoon player character" },
  { label: "Enemy", prompt: "A simple enemy sprite" },
  { label: "Platform", prompt: "A wooden platform" },
  { label: "Collectible", prompt: "A shiny gold coin" },
  { label: "Obstacle", prompt: "A spike trap" },
  { label: "Background element", prompt: "Decorative clouds" },
];

type GenerationStatus = "idle" | "generating" | "success" | "error";

export function AIGenerateModal({ visible, onClose }: AIGenerateModalProps) {
  const { addEntity, setSheetSnapPoint } = useEditor();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus("generating");
    setErrorMessage("");

    try {
      // TODO: Replace with actual AI generation API call
      // For now, simulate generation with a placeholder entity
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newId = `ai_generated_${Date.now()}`;
      const newEntity: GameEntity = {
        id: newId,
        name: prompt.slice(0, 20) + (prompt.length > 20 ? "..." : ""),
        transform: {
          x: 10,
          y: 6,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
        sprite: {
          type: "rect",
          width: 1,
          height: 1,
          color: "#8B5CF6",
        },
        physics: {
          shape: "box",
          bodyType: "dynamic",
          width: 1,
          height: 1,
          density: 1,
          friction: 0.3,
          restitution: 0.3,
        },
        tags: ["ai-generated"],
      };

      addEntity(newEntity);
      setStatus("success");
      
      setTimeout(() => {
        setPrompt("");
        setStatus("idle");
        setSheetSnapPoint(0);
        onClose();
      }, 500);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Generation failed");
    }
  };

  const handlePresetSelect = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  const handleClose = () => {
    if (status !== "generating") {
      setPrompt("");
      setStatus("idle");
      setErrorMessage("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Generate with AI</Text>
            <Pressable 
              style={styles.closeButton} 
              onPress={handleClose}
              disabled={status === "generating"}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Describe what you want to create:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., A bouncy red ball with eyes"
              placeholderTextColor="#6B7280"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={3}
              editable={status !== "generating"}
            />

            <Text style={styles.label}>Quick presets:</Text>
            <View style={styles.presets}>
              {PRESET_PROMPTS.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={[
                    styles.presetChip,
                    prompt === preset.prompt && styles.presetChipActive,
                  ]}
                  onPress={() => handlePresetSelect(preset.prompt)}
                  disabled={status === "generating"}
                >
                  <Text
                    style={[
                      styles.presetText,
                      prompt === preset.prompt && styles.presetTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {status === "error" && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {status === "success" && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>Asset generated!</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.generateButton,
                (!prompt.trim() || status === "generating") && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!prompt.trim() || status === "generating"}
            >
              {status === "generating" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.generateButtonText}>Generate</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#374151",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginHorizontal: -4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#374151",
    margin: 4,
  },
  presetChipActive: {
    backgroundColor: "#4F46E5",
  },
  presetText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  presetTextActive: {
    color: "#FFFFFF",
  },
  errorContainer: {
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
  },
  successContainer: {
    backgroundColor: "#14532D",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  successText: {
    color: "#86EFAC",
    fontSize: 13,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  generateButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  generateButtonDisabled: {
    backgroundColor: "#374151",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
