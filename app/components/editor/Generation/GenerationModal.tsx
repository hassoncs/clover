import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { GenerationProgressTracker } from './GenerationProgressTracker';
import type { EntityPrefab } from '@slopcade/shared';
import { STYLE_PRESET_OPTIONS } from '@slopcade/shared/types/style-presets';
import { tokens } from '@slopcade/theme';

type GenerationPhase = 'configure' | 'generating' | 'complete';

interface TemplateConfig {
  id: string;
  name: string;
  entityPrompt: string;
  enabled: boolean;
}

interface ModalLifecycleState {
  ready: boolean;
  phase: 'initializing' | 'downloading_models' | 'creating_symlinks' | 'starting_comfyui' | 'waiting_for_comfyui' | 'ready' | 'unknown';
  etaSeconds: number;
  elapsedSeconds: number;
  activeJobs: number;
}

interface GenerationModalProps {
  visible: boolean;
  onClose: () => void;
  prefabs: Record<string, EntityPrefab>;
  packName?: string;
  packStyle?: string;
  gameDescription?: string;
  onGenerate: (config: {
    themePrompt: string;
    style: string;
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
  coldStartState?: ModalLifecycleState;
}

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
  coldStartState,
}: GenerationModalProps) {
  const [themePrompt, setThemePrompt] = useState(gameDescription ?? '');
  const [selectedStyle, setSelectedStyle] = useState<string>(
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
      <View className="mb-6">
        <Text className="text-theme-text-muted text-xs font-semibold tracking-widest mb-3">THEME PROMPT</Text>
        <TextInput
          className="bg-theme-surface-elevated rounded-lg p-3 text-theme-text text-sm min-h-[80px] text-top"
          placeholder="Describe the overall theme (e.g., 'medieval fantasy castle')"
          placeholderTextColor={tokens.semantic.colors.text.tertiary}
          value={themePrompt}
          onChangeText={setThemePrompt}
          multiline
          numberOfLines={3}
        />
      </View>

      <View className="mb-6">
        <Text className="text-theme-text-muted text-xs font-semibold tracking-widest mb-3">ART STYLE</Text>
        <View className="flex-row flex-wrap gap-2">
          {STYLE_PRESET_OPTIONS.map(style => (
            <Pressable
              key={style.id}
              className={`px-4 py-2.5 rounded-lg ${selectedStyle === style.id ? 'bg-theme-primary' : 'bg-theme-surface-elevated'}`}
              onPress={() => setSelectedStyle(style.id)}
              accessibilityRole="button"
              accessibilityLabel={`Style: ${style.label}`}
              accessibilityState={{ selected: selectedStyle === style.id }}
            >
              <Text
                className={`text-sm font-medium ${selectedStyle === style.id ? 'text-theme-text-inverse' : 'text-theme-text-muted'}`}
              >
                {style.emoji} {style.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            className={`px-4 py-2.5 rounded-lg ${!STYLE_PRESET_OPTIONS.some(s => s.id === selectedStyle) ? 'bg-theme-primary' : 'bg-theme-surface-elevated'}`}
            onPress={() => {
              if (STYLE_PRESET_OPTIONS.some(s => s.id === selectedStyle)) {
                setSelectedStyle('');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Style: Custom"
            accessibilityState={{ selected: !STYLE_PRESET_OPTIONS.some(s => s.id === selectedStyle) }}
          >
            <Text
              className={`text-sm font-medium ${!STYLE_PRESET_OPTIONS.some(s => s.id === selectedStyle) ? 'text-theme-text-inverse' : 'text-theme-text-muted'}`}
            >
              ✨ Custom
            </Text>
          </Pressable>
        </View>
        {!STYLE_PRESET_OPTIONS.some(s => s.id === selectedStyle) && (
          <TextInput
            className="bg-theme-surface-elevated rounded-lg p-3 text-theme-text text-sm mt-3 min-h-[40px]"
            placeholder="Describe the art style (e.g., 'cyberpunk neon', 'oil painting')"
            placeholderTextColor={tokens.semantic.colors.text.tertiary}
            value={selectedStyle}
            onChangeText={setSelectedStyle}
          />
        )}
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-theme-text-muted text-xs font-semibold tracking-widest mb-3">
            TEMPLATES ({enabledCount}/{templateConfigs.length})
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              className="px-3 py-1 bg-theme-surface-elevated rounded"
              onPress={() => handleToggleAll(true)}
              accessibilityRole="button"
              accessibilityLabel="Select all templates"
            >
              <Text className="text-theme-text-muted text-xs">All</Text>
            </Pressable>
            <Pressable
              className="px-3 py-1 bg-theme-surface-elevated rounded"
              onPress={() => handleToggleAll(false)}
              accessibilityRole="button"
              accessibilityLabel="Deselect all templates"
            >
              <Text className="text-theme-text-muted text-xs">None</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView className="max-h-[250px]" nestedScrollEnabled>
          {templateConfigs.map(config => (
            <View key={config.id} className="bg-theme-surface-elevated rounded-lg mb-2 overflow-hidden">
              <Pressable
                className="flex-row items-center p-3"
                onPress={() => handleToggleTemplate(config.id)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle template ${config.name}`}
                accessibilityState={{ checked: config.enabled }}
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${config.enabled ? 'bg-theme-primary border-theme-primary' : 'border-theme-text-muted'}`}
                >
                  {config.enabled && <Text className="text-theme-text-inverse text-xs font-bold">✓</Text>}
                </View>
                <Text className="flex-1 text-theme-text text-sm">{config.name}</Text>
                <Pressable
                  className="p-1"
                  onPress={() =>
                    setExpandedTemplate(
                      expandedTemplate === config.id ? null : config.id
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={expandedTemplate === config.id ? 'Collapse' : 'Expand'}
                >
                  <Text className="text-theme-text-muted text-[10px]">
                    {expandedTemplate === config.id ? '▲' : '▼'}
                  </Text>
                </Pressable>
              </Pressable>

              {expandedTemplate === config.id && (
                <View className="p-3 pt-0 border-t border-theme-border">
                  <Text className="text-theme-text-muted text-[11px] mb-1.5">Entity Prompt</Text>
                  <TextInput
                    className="bg-theme-surface rounded-md p-2.5 text-theme-text text-sm"
                    value={config.entityPrompt}
                    onChangeText={text => handleUpdatePrompt(config.id, text)}
                    placeholder="Describe this entity..."
                    placeholderTextColor={tokens.semantic.colors.text.tertiary}
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="mb-6">
        <Pressable
          className="py-2"
          onPress={() => setShowAdvanced(!showAdvanced)}
          accessibilityRole="button"
          accessibilityLabel={showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        >
          <Text className="text-theme-text-muted text-sm">
            {showAdvanced ? '▼' : '▶'} Advanced
          </Text>
        </Pressable>

        {showAdvanced && (
          <View className="mt-4 pt-4 border-t border-theme-border">
            <View className="mb-5">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-theme-text text-sm font-medium">Strength</Text>
                <Text className="text-theme-primary text-sm font-semibold">{strength.toFixed(2)}</Text>
              </View>
              <View className="h-1.5 bg-theme-surface-elevated rounded-full overflow-hidden">
                <View
                  className="h-full bg-theme-primary rounded-full"
                  style={{ width: `${((strength - 0.1) / 0.89) * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-theme-text-muted text-[11px]">0.1</Text>
                <Text className="text-theme-text-muted text-[11px]">0.99</Text>
              </View>
              <View className="absolute left-0 right-0 -top-[7px] h-5">
                <Pressable
                  className="absolute w-5 h-5 rounded-full bg-theme-surface shadow-sm"
                  style={{ left: `${((strength - 0.1) / 0.89) * 100}%`, transform: [{ translateX: -10 }] }}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    e.currentTarget.measure((_x, _y, width) => {
                      const newValue = 0.1 + (locationX / width) * 0.89;
                      setStrength(Math.min(Math.max(newValue, 0.1), 0.99));
                    });
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Strength slider"
                />
              </View>
            </View>

            <View className="mb-5">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-theme-text text-sm font-medium">Guidance</Text>
                <Text className="text-theme-primary text-sm font-semibold">{guidance.toFixed(1)}</Text>
              </View>
              <View className="h-1.5 bg-theme-surface-elevated rounded-full overflow-hidden">
                <View
                  className="h-full bg-theme-primary rounded-full"
                  style={{ width: `${((guidance - 2) / 10) * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-theme-text-muted text-[11px]">2</Text>
                <Text className="text-theme-text-muted text-[11px]">12</Text>
              </View>
              <View className="absolute left-0 right-0 -top-[7px] h-5">
                <Pressable
                  className="absolute w-5 h-5 rounded-full bg-theme-surface shadow-sm"
                  style={{ left: `${((guidance - 2) / 10) * 100}%`, transform: [{ translateX: -10 }] }}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    e.currentTarget.measure((_x, _y, width) => {
                      const newValue = 2 + (locationX / width) * 10;
                      setGuidance(Math.min(Math.max(newValue, 2), 12));
                    });
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Guidance slider"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-theme-text text-sm font-medium">Seed (optional)</Text>
              <TextInput
                className="bg-theme-surface-elevated rounded-lg p-3 text-theme-text text-sm mt-2"
                value={seed}
                onChangeText={setSeed}
                placeholder="Leave empty for random"
                placeholderTextColor={tokens.semantic.colors.text.tertiary}
              />
            </View>
          </View>
        )}
      </View>
    </>
  );

  const renderGeneratingPhase = () => (
    <View className="py-6">
      <GenerationProgressTracker
        total={progress.total}
        completed={progress.completed}
        failed={progress.failed}
        templateConfigs={templateConfigs}
        generatingTemplates={generatingTemplates}
        coldStartState={coldStartState}
      />
    </View>
  );

  const renderCompletePhase = () => (
    <View className="items-center py-12">
      <Text className="text-5xl mb-4">
        {progress.failed === 0 ? '🎉' : '⚠️'}
      </Text>
      <Text className="text-theme-text text-xl font-bold mb-2">
        {progress.failed === 0 ? 'Generation Complete!' : 'Generation Finished'}
      </Text>
      <Text className="text-theme-text-muted text-sm">
        {progress.completed} succeeded
        {progress.failed > 0 && `, ${progress.failed} failed`}
      </Text>

      {lastGeneration?.compiledPrompt && (
        <View className="bg-theme-surface rounded-lg p-3 mt-4">
          <Text className="text-theme-text-muted text-[11px] font-semibold tracking-widest mb-2">LAST PROMPT</Text>
          <Text className="text-theme-text-secondary text-sm leading-5">{lastGeneration.compiledPrompt}</Text>
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
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/60" onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View className="bg-theme-surface rounded-t-2xl max-h-[90%]">
          <View className="w-10 h-1 bg-theme-text-muted rounded-full self-center mt-3 mb-2" />

          <View className="flex-row justify-between items-start px-6 py-3 border-b border-theme-border">
            <View>
              <Text className="text-theme-text text-lg font-bold">Generate Assets</Text>
              {packName && <Text className="text-theme-text-muted text-xs mt-0.5">{packName}</Text>}
            </View>
            <Pressable className="w-8 h-8 rounded-full bg-theme-surface-elevated items-center justify-center" onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text className="text-theme-text-muted text-base">✕</Text>
            </Pressable>
          </View>

          <ScrollView className="px-6 pt-4" showsVerticalScrollIndicator={false}>
            {phase === 'configure' && renderConfigurePhase()}
            {phase === 'generating' && renderGeneratingPhase()}
            {phase === 'complete' && renderCompletePhase()}
          </ScrollView>

          <View className="p-6 pb-9 border-t border-theme-border">
            {phase === 'configure' && (
              <View className="flex-row gap-3">
                {lastGeneration && (
                  <Pressable
                    className="bg-theme-secondary py-3.5 rounded-lg items-center flex-1"
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
                        setSelectedStyle(lastGeneration.style);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Remix with previous settings"
                  >
                    <Text className="text-theme-text-inverse text-base font-semibold">Remix</Text>
                  </Pressable>
                )}
                <Pressable
                  className={`bg-theme-primary py-3.5 rounded-lg items-center ${enabledCount === 0 ? 'opacity-50' : ''} ${lastGeneration ? 'flex-1' : ''}`}
                  onPress={handleGenerate}
                  disabled={enabledCount === 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Generate ${enabledCount} Asset${enabledCount !== 1 ? 's' : ''}`}
                  accessibilityState={{ disabled: enabledCount === 0 }}
                >
                  <Text className="text-theme-text-inverse text-base font-semibold">
                    Generate {enabledCount} Asset{enabledCount !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              </View>
            )}
            {phase === 'generating' && (
              <View className="flex-row items-center justify-center gap-3">
                <ActivityIndicator size="small" color={tokens.semantic.colors.primary} />
                <Text className="text-theme-text-muted text-sm">
                  Generating... {progress.completed}/{progress.total}
                </Text>
              </View>
            )}
            {phase === 'complete' && (
              <Pressable className="bg-theme-success py-3.5 rounded-lg items-center" onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
                <Text className="text-theme-text-inverse text-base font-semibold">Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

