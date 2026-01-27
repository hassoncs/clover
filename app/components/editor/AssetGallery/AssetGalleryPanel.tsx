import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { AssetPackSelector } from './AssetPackSelector';
import { AssetAlignmentEditor } from '../AssetAlignment/AssetAlignmentEditor';
import { QuickGenerationForm } from './QuickGenerationForm';
import { TemplateGrid } from './TemplateGrid';
import { useAssetGeneration, useCreateAssetPack, useAssetPacks, useAssetPackWithEntries, useUpdatePlacement, useDeleteAssetPack } from './useAssetGeneration';
import { useEditor, type ResolvedPackEntry } from '../EditorProvider';
import type { AssetPlacement, EntityTemplate } from '@slopcade/shared';
import { trpcReact } from '@/lib/trpc/react';

interface AssetGalleryPanelProps {
  onTemplatePress?: (templateId: string) => void;
}

interface AlignmentEditorState {
  visible: boolean;
  templateId: string;
  template: EntityTemplate | null;
  imageUrl?: string;
  placement?: AssetPlacement;
}

type Mode = 'entities' | 'ui-components';

type ComponentType = 'button' | 'checkbox' | 'radio' | 'slider' | 'panel' | 
  'progress_bar' | 'scroll_bar_h' | 'scroll_bar_v' | 'tab_bar' | 
  'list_item' | 'dropdown' | 'toggle_switch';

type UIState = 'normal' | 'hover' | 'pressed' | 'disabled' | 'focus' | 
  'selected' | 'unselected';

const COMPONENT_TYPES: { id: ComponentType; label: string }[] = [
  { id: 'button', label: 'Button' },
  { id: 'checkbox', label: 'Checkbox' },
  { id: 'radio', label: 'Radio' },
  { id: 'slider', label: 'Slider' },
  { id: 'panel', label: 'Panel' },
  { id: 'progress_bar', label: 'Progress Bar' },
  { id: 'scroll_bar_h', label: 'Scroll Bar (H)' },
  { id: 'scroll_bar_v', label: 'Scroll Bar (V)' },
  { id: 'tab_bar', label: 'Tab Bar' },
  { id: 'list_item', label: 'List Item' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'toggle_switch', label: 'Toggle Switch' },
];

const UI_STATES: { id: UIState; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'hover', label: 'Hover' },
  { id: 'pressed', label: 'Pressed' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'focus', label: 'Focus' },
  { id: 'selected', label: 'Selected' },
  { id: 'unselected', label: 'Unselected' },
];

const STYLE_OPTIONS = [
  { id: 'pixel' as const, label: 'Pixel', emoji: '🎮' },
  { id: 'cartoon' as const, label: 'Cartoon', emoji: '🎨' },
  { id: '3d' as const, label: '3D', emoji: '🧊' },
  { id: 'flat' as const, label: 'Flat', emoji: '📐' },
];

export function AssetGalleryPanel({
  onTemplatePress,
}: AssetGalleryPanelProps) {
  const { gameId, document, setActiveAssetPack } = useEditor();
  const isPreviewMode = gameId === 'preview';
  
  const [mode, setMode] = useState<Mode>('entities');
  const [selectedPackId, setSelectedPackId] = useState<string | undefined>(
    document.assetSystem?.activeAssetPackId
  );
  const [packSelectorVisible, setPackSelectorVisible] = useState(false);
  const [alignmentEditor, setAlignmentEditor] = useState<AlignmentEditorState>({
    visible: false,
    templateId: '',
    template: null,
  });

  const [quickCreateTheme, setQuickCreateTheme] = useState('');
  const [quickCreateStyle, setQuickCreateStyle] = useState<'pixel' | 'cartoon' | '3d' | 'flat'>('pixel');
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  // UI Component mode state
  const [selectedUIPackId, setSelectedUIPackId] = useState<string | undefined>();
  const [uiComponentType, setUiComponentType] = useState<ComponentType>('button');
  const [selectedStates, setSelectedStates] = useState<UIState[]>(['normal', 'pressed']);
  const [uiTheme, setUiTheme] = useState('');
  const [isGeneratingUI, setIsGeneratingUI] = useState(false);

  const templates = useMemo(() => {
    return Object.entries(document.templates).map(([id, template]) => ({
      id,
      template,
    }));
  }, [document.templates]);

  const { data: assetPacks, isLoading: isLoadingPacks } = useAssetPacks(gameId);
  const { data: activePack, isLoading: isLoadingActivePack } = useAssetPackWithEntries(selectedPackId);

  // UI Component packs query
  const { data: uiPacks, isLoading: isLoadingUIPacks } = trpcReact.uiComponents.listUIComponentPacks.useQuery(
    { gameId },
    { enabled: !isPreviewMode && mode === 'ui-components' }
  );

  // Generate UI component mutation
  const generateUIComponent = trpcReact.uiComponents.generateUIComponent.useMutation();

  // Asset system job mutations
  const createJobMutation = trpcReact.assetSystem.createGenerationJob.useMutation();
  const processJobMutation = trpcReact.assetSystem.processGenerationJob.useMutation();

  const entriesByTemplateId = useMemo(() => {
    if (!activePack?.entries) return new Map<string, { imageUrl?: string; placement?: AssetPlacement; lastGeneration?: { compiledPrompt?: string; backgroundRemoved?: boolean; createdAt?: number } }>();
    const map = new Map<string, { imageUrl?: string; placement?: AssetPlacement; lastGeneration?: { compiledPrompt?: string; backgroundRemoved?: boolean; createdAt?: number } }>();
    for (const entry of activePack.entries) {
      map.set(entry.templateId, {
        imageUrl: entry.imageUrl ?? undefined,
        placement: entry.placement,
        lastGeneration: entry.lastGeneration,
      });
    }
    return map;
  }, [activePack?.entries]);

  useEffect(() => {
    console.log('[AssetGalleryPanel] Pack selection effect triggered', {
      selectedPackId,
      isLoadingActivePack,
      hasEntries: !!activePack?.entries,
      entryCount: activePack?.entries?.length ?? 0,
    });

    if (!selectedPackId) {
      console.log('[AssetGalleryPanel] No pack selected, clearing active pack');
      setActiveAssetPack(undefined, {});
      return;
    }

    if (isLoadingActivePack) {
      console.log('[AssetGalleryPanel] Still loading pack entries, waiting...');
      return;
    }

    if (!activePack?.entries) {
      console.log('[AssetGalleryPanel] No entries in active pack');
      return;
    }

    const resolvedEntries: Record<string, ResolvedPackEntry> = {};
    for (const entry of activePack.entries) {
      if (entry.imageUrl) {
        resolvedEntries[entry.templateId] = {
          imageUrl: entry.imageUrl,
          placement: entry.placement ?? undefined,
        };
      }
    }

    console.log('[AssetGalleryPanel] Calling setActiveAssetPack', {
      packId: selectedPackId,
      resolvedEntriesCount: Object.keys(resolvedEntries).length,
    });

    setActiveAssetPack(selectedPackId, resolvedEntries);
  }, [selectedPackId, isLoadingActivePack, activePack?.entries, setActiveAssetPack]);

  const packList = useMemo(() => {
    if (!assetPacks) return [];
    return assetPacks.map(pack => ({
      id: pack.id,
      name: pack.name,
      assetCount: 0,
      totalTemplates: templates.length,
    }));
  }, [assetPacks, templates.length]);

  const coverage = useMemo(() => {
    const covered = templates.filter(t => entriesByTemplateId.has(t.id) && entriesByTemplateId.get(t.id)?.imageUrl).length;
    return { covered, total: templates.length };
  }, [entriesByTemplateId, templates]);

  const { createPack, isCreating: isCreatingPack } = useCreateAssetPack(gameId);
  const { deletePack, isDeleting: isDeletingPack } = useDeleteAssetPack(gameId);

  const {
    isGenerating,
    generatingTemplates,
    progress,
    generateAll,
  } = useAssetGeneration({
    gameId,
    onComplete: (result) => {
      setIsQuickCreating(false);
      Alert.alert(
        'Generation Complete',
        `Generated ${result.successCount} assets${result.failCount > 0 ? `, ${result.failCount} failed` : ''}`
      );
    },
    onError: (error) => {
      setIsQuickCreating(false);
      Alert.alert('Generation Failed', error);
    },
  });

  const handleCreatePack = useCallback(async (params: {
    name: string;
    style?: 'pixel' | 'cartoon' | '3d' | 'flat';
    themePrompt?: string;
  }) => {
    try {
      const result = await createPack(params);
      setSelectedPackId(result.id);
      setPackSelectorVisible(false);
      return result;
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create asset pack');
      throw error;
    }
  }, [createPack]);

  const handleDeletePack = useCallback(async (packId: string) => {
    try {
      await deletePack(packId);
      if (selectedPackId === packId) {
        setSelectedPackId(undefined);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete asset pack');
    }
  }, [deletePack, selectedPackId]);

  const handleQuickGenerate = useCallback(async () => {
    console.log('[AssetGallery] handleQuickGenerate called');
    console.log('[AssetGallery] isPreviewMode:', isPreviewMode);
    console.log('[AssetGallery] gameId:', gameId);
    console.log('[AssetGallery] templates.length:', templates.length);

    if (isPreviewMode) {
      Alert.alert('Save Game First', 'Please save your game before generating assets.');
      return;
    }

    if (templates.length === 0) {
      Alert.alert('No Templates', 'Add some entities to your game first.');
      return;
    }

    setIsQuickCreating(true);

    try {
      const styleName = STYLE_OPTIONS.find(s => s.id === quickCreateStyle)?.label ?? 'Custom';
      const packName = quickCreateTheme.trim() 
        ? `${quickCreateTheme.trim().slice(0, 20)} (${styleName})`
        : `${styleName} Style`;

      console.log('[AssetGallery] Creating pack:', { packName, style: quickCreateStyle, gameId });
      const pack = await createPack({
        name: packName,
        style: quickCreateStyle,
        themePrompt: quickCreateTheme.trim() || undefined,
      });
      console.log('[AssetGallery] Pack created:', pack);

      setSelectedPackId(pack.id);

      console.log('[AssetGallery] Starting generateAll with packId:', pack.id);
      generateAll({
        packId: pack.id,
        templateIds: templates.map(t => t.id),
        themePrompt: quickCreateTheme.trim() || document.metadata?.description,
        style: quickCreateStyle,
        removeBackground,
      });
    } catch (error) {
      console.error('[AssetGallery] Quick generate failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create asset pack');
      setIsQuickCreating(false);
    }
  }, [isPreviewMode, gameId, templates, quickCreateTheme, quickCreateStyle, removeBackground, createPack, generateAll, document.metadata?.description]);

  const handleGenerateAll = useCallback(() => {
    if (!selectedPackId) {
      Alert.alert('No Pack Selected', 'Please select or create an asset pack first');
      return;
    }

    const templateIds = templates.map(t => t.id);
    const packStyle = activePack?.promptDefaults?.styleOverride as 'pixel' | 'cartoon' | '3d' | 'flat' | undefined;

    generateAll({
      packId: selectedPackId,
      templateIds,
      themePrompt: document.metadata?.description,
      style: packStyle,
    });
  }, [selectedPackId, templates, activePack?.promptDefaults?.styleOverride, document.metadata?.description, generateAll]);

  const updatePlacementMutation = useUpdatePlacement();

  const handleTemplatePress = useCallback((templateId: string) => {
    const template = document.templates[templateId];
    const entryData = entriesByTemplateId.get(templateId);
    
    if (entryData?.imageUrl) {
      setAlignmentEditor({
        visible: true,
        templateId,
        template,
        imageUrl: entryData.imageUrl,
        placement: entryData.placement ?? {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
      });
    } else {
      onTemplatePress?.(templateId);
    }
  }, [document.templates, entriesByTemplateId, onTemplatePress]);

  const handleSavePlacement = useCallback(async (placement: AssetPlacement) => {
    if (!selectedPackId || !alignmentEditor.templateId) return;

    try {
      await updatePlacementMutation.mutateAsync({
        packId: selectedPackId,
        templateId: alignmentEditor.templateId,
        placement,
      });
    } catch {
      Alert.alert('Error', 'Failed to save alignment');
    }
  }, [selectedPackId, alignmentEditor.templateId, updatePlacementMutation]);

  const toggleState = useCallback((state: UIState) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  }, []);

  const handleGenerateUIComponent = useCallback(async () => {
    if (isPreviewMode) {
      Alert.alert('Save Game First', 'Please save your game before generating assets.');
      return;
    }

    if (selectedStates.length === 0) {
      Alert.alert('No States Selected', 'Please select at least one state for the component.');
      return;
    }

    if (!uiTheme.trim()) {
      Alert.alert('Theme Required', 'Please describe the visual theme for your component.');
      return;
    }

    setIsGeneratingUI(true);

    try {
      // Create UI component pack
      const componentTypeLabel = COMPONENT_TYPES.find(c => c.id === uiComponentType)?.label ?? 'Component';

      const packResult = await generateUIComponent.mutateAsync({
        gameId,
        componentType: uiComponentType,
        theme: uiTheme.trim(),
        states: selectedStates,
      });

      // Create generation job for the pack
      const jobResult = await createJobMutation.mutateAsync({
        gameId,
        packId: packResult.packId,
        templateIds: [],
        promptDefaults: {
          componentType: uiComponentType,
          states: selectedStates,
          themePrompt: uiTheme.trim(),
        },
      });

      // Process the job
      await processJobMutation.mutateAsync({ jobId: jobResult.jobId });

      Alert.alert(
        'Generation Complete',
        `Generated ${selectedStates.length} state${selectedStates.length > 1 ? 's' : ''} for ${componentTypeLabel.toLowerCase()}.`
      );

      // Refresh UI packs
      setSelectedUIPackId(packResult.packId);
    } catch (error) {
      Alert.alert('Generation Failed', error instanceof Error ? error.message : 'Failed to generate UI component');
    } finally {
      setIsGeneratingUI(false);
    }
  }, [
    isPreviewMode,
    gameId,
    uiComponentType,
    selectedStates,
    uiTheme,
    generateUIComponent,
    createJobMutation,
    processJobMutation,
  ]);

  const isLoading = isLoadingPacks || isLoadingActivePack;
  const hasNoPacks = !isLoadingPacks && packList.length === 0;
  const showQuickCreate = hasNoPacks && !isPreviewMode;

  // Mode switcher component
  const renderModeSwitcher = () => (
    <View style={styles.modeSwitcher}>
      <Pressable
        style={[styles.modeTab, mode === 'entities' && styles.modeTabActive]}
        onPress={() => setMode('entities')}
      >
        <Text style={[styles.modeTabText, mode === 'entities' && styles.modeTabTextActive]}>
          Entities
        </Text>
      </Pressable>
      <Pressable
        style={[styles.modeTab, mode === 'ui-components' && styles.modeTabActive]}
        onPress={() => setMode('ui-components')}
      >
        <Text style={[styles.modeTabText, mode === 'ui-components' && styles.modeTabTextActive]}>
          UI Components
        </Text>
      </Pressable>
    </View>
  );

  // UI Components mode content
  const renderUIComponentsMode = () => {
    if (isPreviewMode) {
      return (
        <View style={styles.previewModeContainer}>
          <Text style={styles.previewModeEmoji}>💾</Text>
          <Text style={styles.previewModeTitle}>Save Your Game First</Text>
          <Text style={styles.previewModeText}>
            To generate UI components, you need to save your game first.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.uiComponentsContainer}>
        <View style={styles.uiSection}>
          <Text style={styles.sectionTitle}>UI COMPONENT PACKS</Text>
          {isLoadingUIPacks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packList}>
              {uiPacks?.map(pack => (
                <Pressable
                  key={pack.id}
                  style={[
                    styles.packChip,
                    selectedUIPackId === pack.id && styles.packChipActive,
                  ]}
                  onPress={() => setSelectedUIPackId(pack.id)}
                >
                  <Text style={[
                    styles.packChipText,
                    selectedUIPackId === pack.id && styles.packChipTextActive,
                  ]}>
                    {pack.name}
                  </Text>
                </Pressable>
              ))}
              {(!uiPacks || uiPacks.length === 0) && (
                <Text style={styles.emptyPackText}>No UI packs yet</Text>
              )}
            </ScrollView>
          )}
        </View>

        <View style={styles.uiSection}>
          <Text style={styles.sectionTitle}>COMPONENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.componentTypeList}>
            {COMPONENT_TYPES.map(type => (
              <Pressable
                key={type.id}
                style={[
                  styles.componentTypeChip,
                  uiComponentType === type.id && styles.componentTypeChipActive,
                ]}
                onPress={() => setUiComponentType(type.id)}
              >
                <Text style={[
                  styles.componentTypeChipText,
                  uiComponentType === type.id && styles.componentTypeChipTextActive,
                ]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.uiSection}>
          <Text style={styles.sectionTitle}>STATES ({selectedStates.length} selected)</Text>
          <View style={styles.statesGrid}>
            {UI_STATES.map(state => (
              <Pressable
                key={state.id}
                style={[
                  styles.stateChip,
                  selectedStates.includes(state.id) && styles.stateChipActive,
                ]}
                onPress={() => toggleState(state.id)}
              >
                <View style={[
                  styles.checkbox,
                  selectedStates.includes(state.id) && styles.checkboxActive,
                ]}>
                  {selectedStates.includes(state.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.stateChipText,
                  selectedStates.includes(state.id) && styles.stateChipTextActive,
                ]}>
                  {state.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.uiSection}>
          <Text style={styles.sectionTitle}>THEME</Text>
          <TextInput
            style={styles.themeInput}
            placeholder="Describe the visual theme (e.g., 'dark sci-fi button with neon glow')"
            placeholderTextColor="#6B7280"
            value={uiTheme}
            onChangeText={setUiTheme}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable
          style={[
            styles.generateButton,
            (isGeneratingUI || selectedStates.length === 0 || !uiTheme.trim()) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerateUIComponent}
          disabled={isGeneratingUI || selectedStates.length === 0 || !uiTheme.trim()}
        >
          {isGeneratingUI ? (
            <View style={styles.generateButtonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>
              Generate {COMPONENT_TYPES.find(c => c.id === uiComponentType)?.label} ({selectedStates.length} states)
            </Text>
          )}
        </Pressable>
      </View>
    );
  };

  if (isPreviewMode && mode === 'ui-components') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {renderModeSwitcher()}
        {renderUIComponentsMode()}
      </ScrollView>
    );
  }

  if (isPreviewMode) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.previewModeContainer}>
          <Text style={styles.previewModeEmoji}>💾</Text>
          <Text style={styles.previewModeTitle}>Save Your Game First</Text>
          <Text style={styles.previewModeText}>
            To generate AI assets, you need to save your game first. This allows us to store and manage your asset packs.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderModeSwitcher()}

      {mode === 'ui-components' ? (
        renderUIComponentsMode()
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Asset Gallery</Text>
            <Text style={styles.subtitle}>
              {coverage.covered}/{coverage.total} templates have assets
            </Text>
          </View>

          {showQuickCreate ? (
            <QuickGenerationForm
              gameId={gameId}
              theme={quickCreateTheme}
              onThemeChange={setQuickCreateTheme}
              style={quickCreateStyle}
              onStyleChange={setQuickCreateStyle}
              removeBackground={removeBackground}
              onRemoveBackgroundToggle={() => setRemoveBackground(prev => !prev)}
              templateCount={templates.length}
              isGenerating={isGenerating}
              isQuickCreating={isQuickCreating}
              progress={progress}
              onGenerate={handleQuickGenerate}
            />
          ) : (
            <>
              <View style={styles.packSelector}>
                <View style={styles.packSelectorHeader}>
                  <Text style={styles.sectionTitle}>ASSET PACKS</Text>
                  <Pressable
                    style={styles.managePacksButton}
                    onPress={() => setPackSelectorVisible(true)}
                  >
                    <Text style={styles.managePacksButtonText}>
                      {packList.length > 0 ? 'Manage' : '+ Create Pack'}
                    </Text>
                  </Pressable>
                </View>
                {isLoadingPacks ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6366F1" />
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packList}>
                    {packList.map(pack => (
                      <Pressable
                        key={pack.id}
                        style={[
                          styles.packChip,
                          selectedPackId === pack.id && styles.packChipActive,
                        ]}
                        onPress={() => setSelectedPackId(pack.id)}
                      >
                        <Text style={[
                          styles.packChipText,
                          selectedPackId === pack.id && styles.packChipTextActive,
                        ]}>
                          {pack.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[
                    styles.generateButton,
                    (isGenerating || !selectedPackId) && styles.generateButtonDisabled,
                  ]}
                  onPress={handleGenerateAll}
                  disabled={isGenerating || !selectedPackId}
                >
                  {isGenerating ? (
                    <View style={styles.generateButtonContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>
                        {progress.completed}/{progress.total} Generating...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.generateButtonText}>
                      {selectedPackId ? 'Regenerate All Assets' : 'Select a Pack First'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TEMPLATES ({templates.length})</Text>
          </View>

          <TemplateGrid
            templates={templates}
            entriesByTemplateId={entriesByTemplateId}
            generatingTemplates={generatingTemplates}
            isLoading={isLoading}
            onTemplatePress={handleTemplatePress}
          />
        </>
      )}

      <AssetPackSelector
        visible={packSelectorVisible}
        onClose={() => setPackSelectorVisible(false)}
        packs={assetPacks ?? []}
        selectedPackId={selectedPackId}
        totalTemplates={templates.length}
        onSelectPack={setSelectedPackId}
        onCreatePack={handleCreatePack}
        onDeletePack={handleDeletePack}
        isCreating={isCreatingPack}
        isDeleting={isDeletingPack}
      />

      <AssetAlignmentEditor
        visible={alignmentEditor.visible}
        onClose={() => setAlignmentEditor(prev => ({ ...prev, visible: false }))}
        templateId={alignmentEditor.templateId}
        physics={alignmentEditor.template?.physics}
        imageUrl={alignmentEditor.imageUrl}
        initialPlacement={alignmentEditor.placement}
        onSave={handleSavePlacement}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  previewModeContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  previewModeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  previewModeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewModeText: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickCreateContainer: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  quickCreateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  quickCreateSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  themeInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    minHeight: 60,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  styleChip: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#312E81',
  },
  styleChipEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  styleChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  styleChipTextActive: {
    color: '#FFFFFF',
  },
  bgRemoveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bgRemoveLabel: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  quickGenerateButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickGenerateButtonDisabled: {
    backgroundColor: '#6366F1',
    opacity: 0.7,
  },
  quickGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  packSelector: {
    marginBottom: 16,
  },
  packSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  managePacksButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  managePacksButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  packList: {
    flexDirection: 'row',
  },
  packChip: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  packChipActive: {
    backgroundColor: '#4F46E5',
  },
  packChipText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  packChipTextActive: {
    color: '#FFFFFF',
  },
  actionsRow: {
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#6366F1',
    opacity: 0.7,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  emptyStateSubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  // Mode switcher styles
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#4F46E5',
  },
  modeTabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  // UI Components mode styles
  uiComponentsContainer: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
  },
  uiSection: {
    marginBottom: 20,
  },
  componentTypeList: {
    flexDirection: 'row',
  },
  componentTypeChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  componentTypeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  componentTypeChipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  componentTypeChipTextActive: {
    color: '#FFFFFF',
  },
  statesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  stateChipActive: {
    backgroundColor: '#312E81',
    borderColor: '#4F46E5',
  },
  stateChipText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  stateChipTextActive: {
    color: '#FFFFFF',
  },
  emptyPackText: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
