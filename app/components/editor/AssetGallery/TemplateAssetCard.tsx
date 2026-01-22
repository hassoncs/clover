import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';
import { PrimitivePreview } from './PrimitivePreview';
import type { EntityTemplate, AssetPlacement } from '@slopcade/shared';

type ViewMode = 'primitive' | 'generated';

interface TemplateAssetCardProps {
  templateId: string;
  template: EntityTemplate;
  imageUrl?: string;
  placement?: AssetPlacement;
  isGenerating?: boolean;
  onPress?: () => void;
}

export function TemplateAssetCard({
  templateId,
  template,
  imageUrl,
  placement,
  isGenerating = false,
  onPress,
}: TemplateAssetCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(imageUrl ? 'generated' : 'primitive');
  const [imageError, setImageError] = useState(false);

  const hasGeneratedAsset = !!imageUrl;
  const showGeneratedView = viewMode === 'generated' && hasGeneratedAsset && !imageError;

  const getStatusIndicator = () => {
    if (isGenerating) return '⏳';
    if (hasGeneratedAsset) return '✓';
    return '○';
  };

  const getStatusColor = () => {
    if (isGenerating) return '#F59E0B';
    if (hasGeneratedAsset) return '#10B981';
    return '#6B7280';
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.previewContainer}>
        {showGeneratedView ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.generatedImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <PrimitivePreview
            physics={template.physics}
            sprite={template.sprite}
            size={64}
            color={template.sprite?.color ?? '#4CAF50'}
          />
        )}
        
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.templateName} numberOfLines={1}>
            {templateId}
          </Text>
          <Text style={[styles.statusIndicator, { color: getStatusColor() }]}>
            {getStatusIndicator()}
          </Text>
        </View>

        {hasGeneratedAsset && (
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeButton, viewMode === 'primitive' && styles.modeButtonActive]}
              onPress={() => setViewMode('primitive')}
            >
              <Text style={[styles.modeButtonText, viewMode === 'primitive' && styles.modeButtonTextActive]}>
                Shape
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, viewMode === 'generated' && styles.modeButtonActive]}
              onPress={() => setViewMode('generated')}
            >
              <Text style={[styles.modeButtonText, viewMode === 'generated' && styles.modeButtonTextActive]}>
                Asset
              </Text>
            </Pressable>
          </View>
        )}

        {placement && (placement.scale !== 1 || placement.offsetX !== 0 || placement.offsetY !== 0) && (
          <Text style={styles.placementInfo}>
            {placement.scale !== 1 ? `${Math.round(placement.scale * 100)}%` : ''}
            {(placement.offsetX !== 0 || placement.offsetY !== 0) ? ' adjusted' : ''}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 8,
    width: '48%',
    marginBottom: 12,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statusIndicator: {
    fontSize: 12,
    marginLeft: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: '#1F2937',
    borderRadius: 6,
    padding: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 4,
  },
  modeButtonActive: {
    backgroundColor: '#4F46E5',
  },
  modeButtonText: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  placementInfo: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 4,
  },
});
