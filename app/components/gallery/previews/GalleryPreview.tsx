import React, { Suspense, lazy } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { GalleryItem } from '@slopcade/shared';
import { SkiaPreviewWrapper } from './SkiaPreviewWrapper';

const BehaviorPreview = lazy(() => import('./BehaviorPreview'));
const SpritePreview = lazy(() => import('./SpritePreview'));

type GalleryPreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width?: number;
  height?: number;
};

const LoadingFallback = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#4ecdc4" />
  </View>
);

export const GalleryPreview = ({ item, params, width = 300, height = 250 }: GalleryPreviewProps) => {
  const renderPreview = () => {
    switch (item.section) {
      case 'effects':
        return (
          <SkiaPreviewWrapper
            item={item}
            params={params}
            width={width}
            height={height}
            previewType="effect"
          />
        );
      case 'particles':
        return (
          <SkiaPreviewWrapper
            item={item}
            params={params}
            width={width}
            height={height}
            previewType="particle"
          />
        );
      case 'behaviors':
        return <BehaviorPreview item={item} params={params} width={width} height={height} />;
      case 'sprites':
        return <SpritePreview item={item} params={params} width={width} height={height} />;
      case 'physics':
        return (
          <SkiaPreviewWrapper
            item={item}
            params={params}
            width={width}
            height={height}
            previewType="physics"
          />
        );
      default:
        return (
          <View style={[styles.placeholder, { width, height }]}>
            <Text style={styles.placeholderText}>Preview not available</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Suspense fallback={<LoadingFallback />}>
        {renderPreview()}
      </Suspense>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0a0a1a',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
});
