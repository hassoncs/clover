import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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

export function AssetGalleryPanel({
  onTemplatePress,
}: AssetGalleryPanelProps) {
  const { gameId, document } = useEditor();
  const [selectedPackId, setSelectedPackId] = useState<string | undefined>(
    document.assetSystem?.activeAssetPackId
  );
  const [packSelectorVisible, setPackSelectorVisible] = useState(false);
  const [alignmentEditor, setAlignmentEditor] = useState<AlignmentEditorState>({
    visible: false,
    templateId: '',
    template: null,
  });

  const templates = useMemo(() => {
    return Object.entries(document.templates).map(([id, template]) => ({
      id,
      template,
    }));
  }, [document.templates]);

  const { data: assetPacks, isLoading: isLoadingPacks } = useAssetPacks(gameId);
  const { data: activePack, isLoading: isLoadingActivePack } = useAssetPackWithEntries(selectedPackId);

  const entriesByTemplateId = useMemo(() => {
    if (!activePack?.entries) return new Map<string, { imageUrl?: string; placement?: AssetPlacement }>();
    const map = new Map<string, { imageUrl?: string; placement?: AssetPlacement }>();
    for (const entry of activePack.entries) {
      map.set(entry.templateId, {
        imageUrl: entry.imageUrl ?? undefined,
        placement: entry.placement,
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
      Alert.alert(
        'Generation Complete',
        `Generated ${result.successCount} assets${result.failCount > 0 ? `, ${result.failCount} failed` : ''}`
      );
    },
    onError: (error) => {
      Alert.alert('Generation Failed', error);
    },
  });

  const handleCreatePack = useCallback(async (name: string, style?: 'pixel' | 'cartoon' | '3d' | 'flat') => {
    try {
      const result = await createPack({ name, style });
      setSelectedPackId(result.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to create asset pack');
    }
  }, [createPack]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Asset Gallery</Text>
        <Text style={styles.subtitle}>
          {coverage.covered}/{coverage.total} templates have assets
        </Text>
      </View>

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
        ) : packList.length > 0 ? (
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
        ) : (
          <View style={styles.noPacksMessage}>
            <Text style={styles.noPacksText}>
              No asset packs yet. Create one to start generating assets.
            </Text>
          </View>
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
              {selectedPackId ? 'Generate All Assets' : 'Select a Pack First'}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>TEMPLATES</Text>
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
  noPacksMessage: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
  },
  noPacksText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
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
