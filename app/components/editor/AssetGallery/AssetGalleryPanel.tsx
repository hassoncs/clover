import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { TemplateAssetCard } from './TemplateAssetCard';
import { AssetPackSelector } from './AssetPackSelector';
import { AssetAlignmentEditor } from '../AssetAlignment/AssetAlignmentEditor';
import { useAssetGeneration, useCreateAssetPack, useAssetPacks, useAssetPackWithEntries, useUpdatePlacement } from './useAssetGeneration';
import { useEditor } from '../EditorProvider';
import type { AssetPlacement, EntityTemplate } from '@slopcade/shared';

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

const STYLE_OPTIONS = [
  { id: 'pixel' as const, label: 'Pixel', emoji: '🎮' },
  { id: 'cartoon' as const, label: 'Cartoon', emoji: '🎨' },
  { id: '3d' as const, label: '3D', emoji: '🧊' },
  { id: 'flat' as const, label: 'Flat', emoji: '📐' },
];

export function AssetGalleryPanel({
  onTemplatePress,
}: AssetGalleryPanelProps) {
  const { gameId, document } = useEditor();
  const isPreviewMode = gameId === 'preview';
  
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

  const templates = useMemo(() => {
    return Object.entries(document.templates).map(([id, template]) => ({
      id,
      template,
    }));
  }, [document.templates]);

  const { data: assetPacks, isLoading: isLoadingPacks } = useAssetPacks(gameId);
  const { data: activePack, isLoading: isLoadingActivePack } = useAssetPackWithEntries(selectedPackId);

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

  const isLoading = isLoadingPacks || isLoadingActivePack;
  const hasNoPacks = !isLoadingPacks && packList.length === 0;
  const showQuickCreate = hasNoPacks && !isPreviewMode;

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
      <View style={styles.header}>
        <Text style={styles.title}>Asset Gallery</Text>
        <Text style={styles.subtitle}>
          {coverage.covered}/{coverage.total} templates have assets
        </Text>
      </View>

      {showQuickCreate ? (
        <View style={styles.quickCreateContainer}>
          <Text style={styles.quickCreateTitle}>Generate All Assets</Text>
          <Text style={styles.quickCreateSubtitle}>
            Describe your game's visual theme and we'll generate sprites for all {templates.length} templates
          </Text>

          <TextInput
            style={styles.themeInput}
            placeholder="e.g., Dark fantasy medieval castle, spooky atmosphere..."
            placeholderTextColor="#6B7280"
            value={quickCreateTheme}
            onChangeText={setQuickCreateTheme}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          <View style={styles.styleRow}>
            {STYLE_OPTIONS.map(style => (
              <Pressable
                key={style.id}
                style={[
                  styles.styleChip,
                  quickCreateStyle === style.id && styles.styleChipActive,
                ]}
                onPress={() => setQuickCreateStyle(style.id)}
              >
                <Text style={styles.styleChipEmoji}>{style.emoji}</Text>
                <Text style={[
                  styles.styleChipText,
                  quickCreateStyle === style.id && styles.styleChipTextActive,
                ]}>
                  {style.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.bgRemoveToggle}
            onPress={() => setRemoveBackground(prev => !prev)}
          >
            <View style={[styles.checkbox, removeBackground && styles.checkboxActive]}>
              {removeBackground && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.bgRemoveLabel}>Remove backgrounds (cleaner sprites)</Text>
          </Pressable>

          <Pressable
            style={[
              styles.quickGenerateButton,
              (isQuickCreating || isGenerating) && styles.quickGenerateButtonDisabled,
            ]}
            onPress={handleQuickGenerate}
            disabled={isQuickCreating || isGenerating}
          >
            {isQuickCreating || isGenerating ? (
              <View style={styles.generateButtonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.quickGenerateButtonText}>
                  {isGenerating ? `${progress.completed}/${progress.total} Generating...` : 'Creating...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.quickGenerateButtonText}>
                Generate {templates.length} Assets
              </Text>
            )}
          </Pressable>
        </View>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <View style={styles.grid}>
          {templates.map(({ id, template }) => {
            const entryData = entriesByTemplateId.get(id);
            return (
              <TemplateAssetCard
                key={id}
                templateId={id}
                template={template}
                imageUrl={entryData?.imageUrl}
                placement={entryData?.placement}
                lastGeneration={entryData?.lastGeneration}
                isGenerating={generatingTemplates.has(id)}
                onPress={() => handleTemplatePress(id)}
              />
            );
          })}
        </View>
      )}

      {templates.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No templates in this game</Text>
          <Text style={styles.emptyStateSubtext}>
            Add entities to your game to see them here
          </Text>
        </View>
      )}

      <AssetPackSelector
        visible={packSelectorVisible}
        onClose={() => setPackSelectorVisible(false)}
        packs={assetPacks ?? []}
        selectedPackId={selectedPackId}
        totalTemplates={templates.length}
        onSelectPack={setSelectedPackId}
        onCreatePack={handleCreatePack}
        isCreating={isCreatingPack}
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
});
