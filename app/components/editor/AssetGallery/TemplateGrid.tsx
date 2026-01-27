import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TemplateAssetCard } from './TemplateAssetCard';
import type { EntityTemplate } from '@slopcade/shared';

interface TemplateGridProps {
  templates: Array<{ id: string; template: EntityTemplate }>;
  entriesByTemplateId: Map<string, {
    imageUrl?: string;
    placement?: { scale: number; offsetX: number; offsetY: number };
    lastGeneration?: { compiledPrompt?: string; backgroundRemoved?: boolean; createdAt?: number };
  }>;
  generatingTemplates: Set<string>;
  isLoading: boolean;
  onTemplatePress: (templateId: string) => void;
}

export function TemplateGrid({
  templates,
  entriesByTemplateId,
  generatingTemplates,
  isLoading,
  onTemplatePress,
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No templates in this game</Text>
        <Text style={styles.emptyStateSubtext}>
          Add entities to your game to see them here
        </Text>
      </View>
    );
  }

  return (
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
            onPress={() => onTemplatePress(id)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
