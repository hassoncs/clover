import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  initializeGalleryItems,
  getGalleryItems,
  getGallerySection,
  type GalleryItem,
  type GallerySectionId,
  type ParamDefinition,
} from '@slopcade/shared';

type GalleryViewerProps = {
  sectionId: GallerySectionId;
  initialItemId?: string;
};

const NumberControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: number;
  onChange: (value: number) => void;
}) => {
  const step = param.step ?? 1;
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{param.displayName}</Text>
      <View style={styles.numberInput}>
        <Pressable onPress={() => onChange(value - step)} style={styles.numberButton}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.numberValue}>{value.toFixed(2)}</Text>
        <Pressable onPress={() => onChange(value + step)} style={styles.numberButton}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const BooleanControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <View style={styles.controlRow}>
    <Text style={styles.controlLabel}>{param.displayName}</Text>
    <Pressable 
      onPress={() => onChange(!value)} 
      style={[styles.toggleButton, value && styles.toggleButtonActive]}
    >
      <Text style={styles.buttonText}>{value ? 'On' : 'Off'}</Text>
    </Pressable>
  </View>
);

const SelectControl = ({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: string;
  onChange: (value: string) => void;
}) => {
  const options = param.options ?? [];
  const currentIndex = options.indexOf(value);
  const nextIndex = (currentIndex + 1) % options.length;
  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{param.displayName}</Text>
      <Pressable onPress={() => onChange(options[nextIndex])} style={styles.selectButton}>
        <Text style={styles.buttonText}>{value}</Text>
      </Pressable>
    </View>
  );
};

const GalleryItemCard = ({
  item,
  isSelected,
  onPress,
  sectionColor,
}: {
  item: GalleryItem;
  isSelected: boolean;
  onPress: () => void;
  sectionColor: string;
}) => (
  <Pressable 
    onPress={onPress} 
    style={[
      styles.itemCard, 
      isSelected && { borderColor: sectionColor, borderWidth: 2 }
    ]}
  >
    <Text style={styles.itemIcon}>{item.icon}</Text>
    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
  </Pressable>
);

const GalleryItemDetail = ({ item }: { item: GalleryItem }) => {
  const initialValues = useMemo(() => {
    return item.params.reduce((acc, param) => {
      acc[param.key] = param.defaultValue;
      return acc;
    }, {} as Record<string, unknown>);
  }, [item.params]);

  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleValueChange = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const exportJSON = item.getExportJSON(values);
  const usageExample = item.getUsageExample?.(values) ?? `// Configure ${item.title}`;

  return (
    <ScrollView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailIcon}>{item.icon}</Text>
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          {item.category && <Text style={styles.detailCategory}>{item.category}</Text>}
        </View>
      </View>
      
      <Text style={styles.detailDescription}>{item.description}</Text>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>Preview Area</Text>
      </View>

      {item.params.length > 0 && (
        <View style={styles.controlsSection}>
          <Text style={styles.sectionHeader}>Parameters</Text>
          {item.params.map(param => {
            const value = values[param.key];
            switch (param.type) {
              case 'number':
                return (
                  <NumberControl
                    key={param.key}
                    param={param}
                    value={value as number}
                    onChange={newValue => handleValueChange(param.key, newValue)}
                  />
                );
              case 'boolean':
                return (
                  <BooleanControl
                    key={param.key}
                    param={param}
                    value={value as boolean}
                    onChange={newValue => handleValueChange(param.key, newValue)}
                  />
                );
              case 'select':
                return (
                  <SelectControl
                    key={param.key}
                    param={param}
                    value={value as string}
                    onChange={newValue => handleValueChange(param.key, newValue)}
                  />
                );
              default:
                return null;
            }
          })}
        </View>
      )}

      <View style={styles.exportSection}>
        <Text style={styles.sectionHeader}>Usage</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{usageExample}</Text>
        </View>
        
        <Text style={styles.sectionHeader}>Export JSON</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {JSON.stringify(exportJSON, null, 2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export const GalleryViewer = ({ sectionId, initialItemId }: GalleryViewerProps) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId ?? null);

  useEffect(() => {
    initializeGalleryItems();
  }, []);

  const section = useMemo(() => {
    try {
      return getGallerySection(sectionId);
    } catch {
      return null;
    }
  }, [sectionId]);

  const items = useMemo(() => getGalleryItems(sectionId), [sectionId]);

  useEffect(() => {
    if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(initialItemId ?? items[0].id);
    }
  }, [items, initialItemId, selectedItemId]);

  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedItemId),
    [items, selectedItemId]
  );

  if (!section) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Section not found: {sectionId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: section.color + '22' }]}>
        <Text style={styles.headerIcon}>{section.icon}</Text>
        <Text style={styles.headerTitle}>{section.title}</Text>
        <Text style={styles.headerCount}>{items.length} items</Text>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.sidebar} horizontal={false}>
          <View style={styles.itemGrid}>
            {items.map(item => (
              <GalleryItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                onPress={() => setSelectedItemId(item.id)}
                sectionColor={section.color}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.detail}>
          {selectedItem ? (
            <GalleryItemDetail item={selectedItem} />
          ) : (
            <Text style={styles.noSelection}>Select an item to view details</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    minHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  headerCount: {
    color: '#888',
    fontSize: 14,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  itemGrid: {
    padding: 8,
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  detail: {
    flex: 1,
  },
  detailContainer: {
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  detailIcon: {
    fontSize: 48,
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  detailCategory: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  detailDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#aaa',
    fontSize: 12,
  },
  previewContainer: {
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewText: {
    color: '#555',
    fontSize: 16,
  },
  controlsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 14,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberButton: {
    width: 28,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  numberValue: {
    color: '#fff',
    fontSize: 14,
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#4ecdc4',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  exportSection: {
    marginTop: 24,
  },
  codeBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  codeText: {
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  noSelection: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});
