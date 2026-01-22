
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import type { GalleryItem } from '@slopcade/shared';
import { GalleryControls } from './GalleryControls';
import { GalleryExport } from './GalleryExport';
import { GalleryPreview } from './previews';

type GalleryDetailProps = {
  item: GalleryItem;
};

export const GalleryDetail = ({ item }: GalleryDetailProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const previewWidth = Math.min(screenWidth - 32, 400);
  const previewHeight = Math.round(previewWidth * 0.75);

  const initialValues = useMemo(() => {
    return item.params.reduce((acc, param) => {
      acc[param.key] = param.defaultValue;
      return acc;
    }, {} as Record<string, unknown>);
  }, [item.params]);

  const [values, setValues] = useState(initialValues);

  const handleValueChange = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const usageExample = item.getUsageExample?.(values) ?? `// Configure ${item.title}`;
  const exportJSON = item.getExportJSON(values);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.previewContainer}>
        <GalleryPreview item={item} params={values} width={previewWidth} height={previewHeight} />
      </View>

      {item.params.length > 0 && (
        <View style={styles.controlsSection}>
          <Text style={styles.sectionHeader}>Controls</Text>
          <GalleryControls params={item.params} values={values} onChange={handleValueChange} />
        </View>
      )}

      <GalleryExport json={exportJSON} usageExample={usageExample} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0a0a0a',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#a0a0a0',
    fontSize: 16,
    marginBottom: 24,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  controlsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});
