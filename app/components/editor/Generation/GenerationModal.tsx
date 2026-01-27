import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GenerationProgressTracker } from './GenerationProgressTracker';
import type { EntityTemplate } from '@slopcade/shared';

type GenerationPhase = 'configure' | 'generating' | 'complete';

interface TemplateConfig {
  id: string;
  name: string;
  entityPrompt: string;
  enabled: boolean;
}

interface GenerationModalProps {
  visible: boolean;
  onClose: () => void;
  templates: Record<string, EntityTemplate>;
  packName?: string;
  packStyle?: 'pixel' | 'cartoon' | '3d' | 'flat';
  gameDescription?: string;
  onGenerate: (config: {
    themePrompt: string;
    style: 'pixel' | 'cartoon' | '3d' | 'flat';
    templateOverrides: Record<string, { entityPrompt?: string }>;
    templateIds: string[];
    strength?: number;
    guidance?: number;
    seed?: string;
  }) => void;
  isGenerating: boolean;
  progress: { total: number; completed: number; failed: number };
  generatingTemplates: Set<string>;
  lastGeneration?: {
    compiledPrompt?: string;
    strength?: number;
    guidance?: number;
    seed?: string;
    style?: string;
    silhouetteUrl?: string;
  };
}

const STYLE_OPTIONS: { id: 'pixel' | 'cartoon' | '3d' | 'flat'; label: string }[] = [
  { id: 'pixel', label: 'Pixel Art' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: '3d', label: '3D Render' },
  { id: 'flat', label: 'Flat Design' },
];

export function GenerationModal({
  visible,
  onClose,
  templates,
  packName,
  packStyle,
  gameDescription,
  onGenerate,
  isGenerating,
  progress,
  generatingTemplates,
  lastGeneration,
}: GenerationModalProps) {
  const [themePrompt, setThemePrompt] = useState(gameDescription ?? '');
  const [selectedStyle, setSelectedStyle] = useState<'pixel' | 'cartoon' | '3d' | 'flat'>(
    packStyle ?? 'pixel'
  );
  const [templateConfigs, setTemplateConfigs] = useState<TemplateConfig[]>(() =>
    Object.entries(templates).map(([id, template]) => ({
      id,
      name: id,
      entityPrompt: template.tags?.join(', ') ?? id,
      enabled: true,
    }))
  );
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [strength, setStrength] = useState(0.5);
  const [guidance, setGuidance] = useState(3.5);
  const [seed, setSeed] = useState('');

  const phase: GenerationPhase = useMemo(() => {
    if (isGenerating) return 'generating';
    if (progress.completed > 0 || progress.failed > 0) return 'complete';
    return 'configure';
  }, [isGenerating, progress.completed, progress.failed]);

  const enabledCount = templateConfigs.filter(t => t.enabled).length;

  const handleToggleTemplate = useCallback((id: string) => {
    setTemplateConfigs(prev =>
      prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  const handleUpdatePrompt = useCallback((id: string, prompt: string) => {
    setTemplateConfigs(prev =>
      prev.map(t => (t.id === id ? { ...t, entityPrompt: prompt } : t))
    );
  }, []);

  const handleToggleAll = useCallback((enabled: boolean) => {
    setTemplateConfigs(prev => prev.map(t => ({ ...t, enabled })));
  }, []);

  const handleGenerate = useCallback(() => {
    const enabledTemplates = templateConfigs.filter(t => t.enabled);
    const templateOverrides: Record<string, { entityPrompt?: string }> = {};

    for (const t of enabledTemplates) {
      if (t.entityPrompt !== t.id) {
        templateOverrides[t.id] = { entityPrompt: t.entityPrompt };
      }
    }

    onGenerate({
      themePrompt,
      style: selectedStyle,
      templateOverrides,
      templateIds: enabledTemplates.map(t => t.id),
      strength,
      guidance,
      seed: seed.trim() || undefined,
    });
  }, [templateConfigs, themePrompt, selectedStyle, onGenerate, strength, guidance, seed]);

  const renderConfigurePhase = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>THEME PROMPT</Text>
        <TextInput
          style={styles.themeInput}
          placeholder="Describe the overall theme (e.g., 'medieval fantasy castle')"
          placeholderTextColor="#6B7280"
          value={themePrompt}
          onChangeText={setThemePrompt}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ART STYLE</Text>
        <View style={styles.styleGrid}>
          {STYLE_OPTIONS.map(style => (
            <Pressable
              key={style.id}
              style={[
                styles.styleOption,
                selectedStyle === style.id && styles.styleOptionSelected,
              ]}
              onPress={() => setSelectedStyle(style.id)}
            >
              <Text
                style={[
                  styles.styleOptionText,
                  selectedStyle === style.id && styles.styleOptionTextSelected,
                ]}
              >
                {style.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            TEMPLATES ({enabledCount}/{templateConfigs.length})
          </Text>
          <View style={styles.toggleAllButtons}>
            <Pressable
              style={styles.toggleAllButton}
              onPress={() => handleToggleAll(true)}
            >
              <Text style={styles.toggleAllButtonText}>All</Text>
            </Pressable>
            <Pressable
              style={styles.toggleAllButton}
              onPress={() => handleToggleAll(false)}
            >
              <Text style={styles.toggleAllButtonText}>None</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.templateList} nestedScrollEnabled>
          {templateConfigs.map(config => (
            <View key={config.id} style={styles.templateItem}>
              <Pressable
                style={styles.templateHeader}
                onPress={() => handleToggleTemplate(config.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    config.enabled && styles.checkboxChecked,
                  ]}
                >
                  {config.enabled && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.templateName}>{config.name}</Text>
                <Pressable
                  style={styles.expandButton}
                  onPress={() =>
                    setExpandedTemplate(
                      expandedTemplate === config.id ? null : config.id
                    )
                  }
                >
                  <Text style={styles.expandButtonText}>
                    {expandedTemplate === config.id ? '▲' : '▼'}
                  </Text>
                </Pressable>
              </Pressable>

              {expandedTemplate === config.id && (
                <View style={styles.templateExpanded}>
                  <Text style={styles.promptLabel}>Entity Prompt</Text>
                  <TextInput
                    style={styles.promptInput}
                    value={config.entityPrompt}
                    onChangeText={text => handleUpdatePrompt(config.id, text)}
                    placeholder="Describe this entity..."
                    placeholderTextColor="#6B7280"
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '▼' : '▶'} Advanced
          </Text>
        </Pressable>

        {showAdvanced && (
          <View style={styles.advancedContent}>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Strength</Text>
                <Text style={styles.sliderValue}>{strength.toFixed(2)}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((strength - 0.1) / 0.89) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.sliderRangeLabels}>
                <Text style={styles.sliderRangeText}>0.1</Text>
                <Text style={styles.sliderRangeText}>0.99</Text>
              </View>
              <View style={styles.slider}>
                <Pressable
                  style={[styles.sliderThumb, { left: `${((strength - 0.1) / 0.89) * 100}%` }]}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    e.currentTarget.measure((_x, _y, width) => {
                      const newValue = 0.1 + (locationX / width) * 0.89;
                      setStrength(Math.min(Math.max(newValue, 0.1), 0.99));
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Guidance</Text>
                <Text style={styles.sliderValue}>{guidance.toFixed(1)}</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((guidance - 2) / 10) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.sliderRangeLabels}>
                <Text style={styles.sliderRangeText}>2</Text>
                <Text style={styles.sliderRangeText}>12</Text>
              </View>
              <View style={styles.slider}>
                <Pressable
                  style={[styles.sliderThumb, { left: `${((guidance - 2) / 10) * 100}%` }]}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    e.currentTarget.measure((_x, _y, width) => {
                      const newValue = 2 + (locationX / width) * 10;
                      setGuidance(Math.min(Math.max(newValue, 2), 12));
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.seedContainer}>
              <Text style={styles.sliderLabel}>Seed (optional)</Text>
              <TextInput
                style={styles.seedInput}
                value={seed}
                onChangeText={setSeed}
                placeholder="Leave empty for random"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        )}
      </View>
    </>
  );

  const renderGeneratingPhase = () => (
    <View style={styles.progressContainer}>
      <GenerationProgressTracker
        total={progress.total}
        completed={progress.completed}
        failed={progress.failed}
        templateConfigs={templateConfigs}
        generatingTemplates={generatingTemplates}
      />
    </View>
  );

  const renderCompletePhase = () => (
    <View style={styles.completeContainer}>
      <Text style={styles.completeEmoji}>
        {progress.failed === 0 ? '🎉' : '⚠️'}
      </Text>
      <Text style={styles.completeTitle}>
        {progress.failed === 0 ? 'Generation Complete!' : 'Generation Finished'}
      </Text>
      <Text style={styles.completeStats}>
        {progress.completed} succeeded
        {progress.failed > 0 && `, ${progress.failed} failed`}
      </Text>

      {lastGeneration?.compiledPrompt && (
        <View style={styles.lastPromptContainer}>
          <Text style={styles.lastPromptLabel}>LAST PROMPT</Text>
          <Text style={styles.lastPromptText}>{lastGeneration.compiledPrompt}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Generate Assets</Text>
              {packName && <Text style={styles.subtitle}>{packName}</Text>}
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {phase === 'configure' && renderConfigurePhase()}
            {phase === 'generating' && renderGeneratingPhase()}
            {phase === 'complete' && renderCompletePhase()}
          </ScrollView>

          <View style={styles.footer}>
            {phase === 'configure' && (
              <View style={styles.footerButtons}>
                {lastGeneration && (
                  <Pressable
                    style={styles.remixButton}
                    onPress={() => {
                      if (lastGeneration.strength !== undefined) {
                        setStrength(lastGeneration.strength);
                      }
                      if (lastGeneration.guidance !== undefined) {
                        setGuidance(lastGeneration.guidance);
                      }
                      if (lastGeneration.seed !== undefined) {
                        setSeed(lastGeneration.seed);
                      }
                      if (lastGeneration.style) {
                        setSelectedStyle(lastGeneration.style as 'pixel' | 'cartoon' | '3d' | 'flat');
                      }
                    }}
                  >
                    <Text style={styles.remixButtonText}>Remix</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[
                    styles.generateButton,
                    enabledCount === 0 && styles.generateButtonDisabled,
                    lastGeneration && { flex: 1 },
                  ]}
                  onPress={handleGenerate}
                  disabled={enabledCount === 0}
                >
                  <Text style={styles.generateButtonText}>
                    Generate {enabledCount} Asset{enabledCount !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              </View>
            )}
            {phase === 'generating' && (
              <View style={styles.generatingFooter}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.generatingText}>
                  Generating... {progress.completed}/{progress.total}
                </Text>
              </View>
            )}
            {phase === 'complete' && (
              <Pressable style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#6B7280',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  themeInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  styleOptionSelected: {
    backgroundColor: '#4F46E5',
  },
  styleOptionText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  styleOptionTextSelected: {
    color: '#FFFFFF',
  },
  toggleAllButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  toggleAllButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  templateList: {
    maxHeight: 250,
  },
  templateItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  templateName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  expandButton: {
    padding: 4,
  },
  expandButtonText: {
    color: '#6B7280',
    fontSize: 10,
  },
  templateExpanded: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  promptLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 6,
  },
  promptInput: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  progressContainer: {
    paddingVertical: 24,
  },
  completeContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  completeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  completeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeStats: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  generateButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#6366F1',
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  generatingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generatingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  doneButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  advancedToggle: {
    paddingVertical: 8,
  },
  advancedToggleText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  advancedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  sliderValue: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  sliderRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderRangeText: {
    color: '#6B7280',
    fontSize: 11,
  },
  slider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -7,
    height: 20,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ translateX: -10 }],
  },
  seedContainer: {
    marginTop: 16,
  },
  seedInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
  },
  lastPromptContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  lastPromptLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lastPromptText: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  remixButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  remixButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
