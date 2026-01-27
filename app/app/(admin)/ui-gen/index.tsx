import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, PanResponder, Image } from "react-native";
import { trpcReact } from "@/lib/trpc/react";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";

type ControlType = 'button' | 'checkbox' | 'radio' | 'slider' | 'panel' | 'progress_bar' | 'scroll_bar_h' | 'scroll_bar_v' | 'tab_bar' | 'list_item' | 'dropdown' | 'toggle_switch';

const SIDEBAR_WIDTH_KEY = "ui-gen-sidebar-width";
const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 200;

interface UIGenResult {
  id: string;
  timestamp: string;
  params: {
    controlType: string;
    theme: string;
    strength: number;
    state: string;
    promptModifier: string;
  };
  files: {
    silhouette: string;
    generated: string;
  };
  prompts: {
    positive: string;
    negative: string;
  };
  timing: {
    silhouetteMs: number;
    generationMs: number;
    totalMs: number;
  };
}

function ResultCard({ result, onDelete, isDeleting }: { result: UIGenResult; onDelete: () => void; isDeleting: boolean }) {
  const [showGenerated, setShowGenerated] = useState(true);
  const hasImages = result.files.silhouette && result.files.generated;
  const currentImage = showGenerated ? result.files.generated : result.files.silhouette;

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultImageContainer}>
        <Pressable
          onPressIn={() => setShowGenerated(false)}
          onPressOut={() => setShowGenerated(true)}
          style={styles.resultImageWrapper}
        >
          {hasImages && currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={styles.resultImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.resultImagePlaceholder}>
              {showGenerated ? "Generated" : "Input"}
            </Text>
          )}
        </Pressable>
        <View style={styles.resultImageLabel}>
          <Text style={styles.resultImageLabelText}>
            {showGenerated ? "OUT" : "IN"}
          </Text>
        </View>
        <Pressable 
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]} 
          onPress={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#71717a" />
          ) : (
            <Text style={styles.deleteButtonText}>×</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.resultMeta}>
        <View style={styles.resultMetaRow}>
          <View style={styles.stateBadge}>
            <Text style={styles.stateBadgeText}>{result.params.state}</Text>
          </View>
          <Text style={styles.resultStrength}>{result.params.strength}</Text>
        </View>
        <Text style={styles.resultTheme} numberOfLines={1}>
          {result.params.theme}
        </Text>
        <View style={styles.resultMetaRow}>
          <Text style={styles.resultType}>{result.params.controlType}</Text>
          {result.timing.totalMs > 0 && (
            <Text style={styles.resultTiming}>{(result.timing.totalMs / 1000).toFixed(1)}s</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function Spinner() {
  return <ActivityIndicator size="small" color="#ffffff" />;
}

function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        onDrag(gestureState.dx);
      },
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.resizeHandle}>
      <View style={styles.resizeHandleBar} />
    </View>
  );
}

export default function UIGenViewer() {
  const [controlType, setControlType] = useState<ControlType>("button");
  const [theme, setTheme] = useState("cyberpunk neon");
  const [strength, setStrength] = useState(0.85);
  const [selectedStates, setSelectedStates] = useState<string[]>(["normal"]);
  const [promptModifier, setPromptModifier] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const baseWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    getStorageItem<number>(SIDEBAR_WIDTH_KEY, DEFAULT_SIDEBAR_WIDTH).then((w) => {
      setSidebarWidth(w);
      baseWidthRef.current = w;
    });
  }, []);

  const handleResize = useCallback((delta: number) => {
    const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, baseWidthRef.current + delta));
    setSidebarWidth(newWidth);
  }, []);

  const handleResizeEnd = useCallback(() => {
    baseWidthRef.current = sidebarWidth;
    setStorageItem(SIDEBAR_WIDTH_KEY, sidebarWidth);
  }, [sidebarWidth]);

  const controlTypesQuery = trpcReact.uiGenAdmin.getControlTypes.useQuery();
  const statesQuery = trpcReact.uiGenAdmin.getStates.useQuery(
    { controlType },
    { enabled: !!controlType }
  );

  const utils = trpcReact.useUtils();
  const resultsQuery = trpcReact.uiGenAdmin.listResults.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const generateMutation = trpcReact.uiGenAdmin.generate.useMutation({
    onSuccess: (data) => {
      console.log('[UI-GEN] Response:', data);
      if (data.success && data.result) {
        utils.uiGenAdmin.listResults.invalidate();
      } else {
        console.error('[UI-GEN] Generation failed:', data.message);
        alert(`Generation failed: ${data.message}`);
      }
    },
    onError: (error) => {
      console.error('[UI-GEN] Mutation error:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpcReact.uiGenAdmin.deleteResult.useMutation({
    onSuccess: (data, variables) => {
      if (data.success) {
        utils.uiGenAdmin.listResults.invalidate();
      } else {
        alert(`Delete failed: ${data.message}`);
      }
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
    },
    onError: (error, variables) => {
      console.error('[UI-GEN] Delete error:', error);
      alert(`Delete error: ${error.message}`);
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
    },
  });

  useEffect(() => {
    if (statesQuery.data) {
      setSelectedStates(statesQuery.data.length > 0 ? [statesQuery.data[0]] : []);
    }
  }, [statesQuery.data]);

  const results = resultsQuery.data || [];
  const availableStates = statesQuery.data || ["normal"];
  const controlTypes = controlTypesQuery.data || [];

  const toggleState = useCallback((state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state)
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedStates.length === 0 || isGenerating) return;

    setIsGenerating(true);
    const total = selectedStates.length;
    
    for (let i = 0; i < selectedStates.length; i++) {
      const state = selectedStates[i];
      setGenerationProgress(`${i + 1}/${total}`);
      
      try {
        await generateMutation.mutateAsync({
          controlType,
          theme,
          strength,
          state,
          promptModifier: promptModifier || undefined,
        });
      } catch (err) {
        console.error("Generation failed:", err);
      }
    }
    
    setIsGenerating(false);
    setGenerationProgress("");
  }, [controlType, theme, strength, selectedStates, promptModifier, isGenerating, generateMutation]);

  const handleDelete = useCallback((id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    deleteMutation.mutate({ id });
  }, [deleteMutation]);

  const handleClearAll = useCallback(async () => {
    if (!results.length) return;
    
    const confirmed = window.confirm(`Delete all ${results.length} results? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingIds(new Set(results.map(r => r.id)));
    
    for (const result of results) {
      try {
        await deleteMutation.mutateAsync({ id: result.id });
      } catch (err) {
        console.error(`Failed to delete ${result.id}:`, err);
      }
    }
    
    setDeletingIds(new Set());
  }, [results, deleteMutation]);

  const batchCount = selectedStates.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UI Gen</Text>
        <View style={styles.headerRight}>
          {resultsQuery.isLoading && (
            <ActivityIndicator size="small" color="#52525b" />
          )}
          {results.length > 0 && (
            <Pressable style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All ({results.length})</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <ScrollView contentContainerStyle={styles.sidebarContent}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeContainer}>
                  {controlTypes.map((type) => (
                    <Pressable
                      key={type.id}
                      style={[styles.typeChip, controlType === type.id && styles.typeChipSelected]}
                      onPress={() => setControlType(type.id as ControlType)}
                    >
                      <Text style={[styles.typeChipText, controlType === type.id && styles.typeChipTextSelected]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Theme</Text>
              <TextInput
                style={styles.textInput}
                value={theme}
                onChangeText={setTheme}
                placeholder="e.g., cyberpunk neon"
                placeholderTextColor="#52525b"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Strength</Text>
                <Text style={styles.strengthValue}>{strength}</Text>
              </View>
              <View style={styles.sliderContainer}>
                {[0.5, 0.7, 0.85, 0.95].map((val) => (
                  <Pressable
                    key={val}
                    style={[styles.sliderOption, Math.abs(strength - val) < 0.01 && styles.sliderOptionSelected]}
                    onPress={() => setStrength(val)}
                  >
                    <Text style={[styles.sliderOptionText, Math.abs(strength - val) < 0.01 && styles.sliderOptionTextSelected]}>
                      {val}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>States</Text>
                <Text style={styles.sectionCount}>{selectedStates.length}</Text>
              </View>
              <View style={styles.statesContainer}>
                {availableStates.map((state) => {
                  const isSelected = selectedStates.includes(state);
                  return (
                    <Pressable
                      key={state}
                      style={[styles.stateChip, isSelected && styles.stateChipSelected]}
                      onPress={() => toggleState(state)}
                    >
                      <Text style={[styles.stateChipText, isSelected && styles.stateChipTextSelected]}>
                        {state}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Extra</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={promptModifier}
                onChangeText={setPromptModifier}
                placeholder="Extra prompt..."
                placeholderTextColor="#52525b"
                multiline
              />
            </View>

            <Pressable
              style={[styles.generateButton, (isGenerating || batchCount === 0) && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating || batchCount === 0}
            >
              {isGenerating ? (
                <View style={styles.generateButtonContent}>
                  <Spinner />
                  <Text style={styles.generateButtonText}>{generationProgress}</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate{batchCount > 0 ? ` (${batchCount})` : ""}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>

        <ResizeHandle onDrag={handleResize} />

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} onTouchEnd={handleResizeEnd}>
          {resultsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#3f3f46" />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No results</Text>
            </View>
          ) : (
            <View style={styles.resultsGrid}>
              {results.map((result) => (
                <ResultCard 
                  key={result.id} 
                  result={result} 
                  onDelete={() => handleDelete(result.id)}
                  isDeleting={deletingIds.has(result.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f23",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#27272a",
  },
  clearButtonText: {
    fontSize: 10,
    color: "#a1a1aa",
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    borderRightWidth: 0,
    borderRightColor: "#1f1f23",
  },
  sidebarContent: {
    padding: 10,
    gap: 12,
  },
  section: {
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 9,
    color: "#52525b",
  },
  typeContainer: {
    flexDirection: "row",
    gap: 3,
  },
  typeChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    backgroundColor: "#18181b",
  },
  typeChipSelected: {
    backgroundColor: "#2563eb",
  },
  typeChipText: {
    fontSize: 10,
    color: "#71717a",
  },
  typeChipTextSelected: {
    color: "#ffffff",
  },
  textInput: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 11,
    color: "#ffffff",
  },
  textArea: {
    minHeight: 36,
    textAlignVertical: "top",
  },
  strengthValue: {
    fontSize: 9,
    color: "#60a5fa",
  },
  sliderContainer: {
    flexDirection: "row",
    gap: 3,
  },
  sliderOption: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: "#18181b",
    alignItems: "center",
  },
  sliderOptionSelected: {
    backgroundColor: "#2563eb",
  },
  sliderOptionText: {
    fontSize: 9,
    color: "#71717a",
  },
  sliderOptionTextSelected: {
    color: "#ffffff",
  },
  statesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  stateChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    backgroundColor: "#18181b",
  },
  stateChipSelected: {
    backgroundColor: "#2563eb",
  },
  stateChipText: {
    fontSize: 10,
    color: "#71717a",
  },
  stateChipTextSelected: {
    color: "#ffffff",
  },
  generateButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  generateButtonDisabled: {
    backgroundColor: "#27272a",
  },
  generateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  generateButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  resizeHandle: {
    width: 8,
    backgroundColor: "#18181b",
    justifyContent: "center",
    alignItems: "center",
  },
  resizeHandleBar: {
    width: 2,
    height: 32,
    backgroundColor: "#3f3f46",
    borderRadius: 1,
  },
  main: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  mainContent: {
    padding: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 11,
    color: "#3f3f46",
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resultCard: {
    width: 200,
    backgroundColor: "#18181b",
    borderRadius: 4,
    overflow: "hidden",
  },
  resultImageContainer: {
    aspectRatio: 1,
    backgroundColor: "#09090b",
    position: "relative",
  },
  resultImageWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultImagePlaceholder: {
    fontSize: 11,
    color: "#27272a",
  },
  resultImageLabel: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  resultImageLabelText: {
    fontSize: 8,
    fontWeight: "600",
    color: "#71717a",
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 14,
    color: "#71717a",
    lineHeight: 16,
  },
  resultMeta: {
    padding: 6,
    gap: 2,
  },
  resultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: "#27272a",
  },
  stateBadgeText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#d4d4d8",
  },
  resultStrength: {
    fontSize: 9,
    color: "#52525b",
  },
  resultTheme: {
    fontSize: 10,
    color: "#71717a",
  },
  resultType: {
    fontSize: 9,
    color: "#3f3f46",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultTiming: {
    fontSize: 9,
    color: "#52525b",
  },
});
