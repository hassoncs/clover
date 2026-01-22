import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  getGalleryItems, 
  getGallerySection, 
  initializeGalleryItems,
  type GallerySectionId,
  type GalleryItem,
} from '@slopcade/shared';
import { GalleryGrid } from '@/components/gallery';

export default function GallerySectionPage() {
  const { section } = useLocalSearchParams<{ section: GallerySectionId }>();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeGalleryItems();
    setInitialized(true);
  }, []);

  const sectionInfo = useMemo(() => {
    if (!initialized) return null;
    try {
      return getGallerySection(section as GallerySectionId);
    } catch {
      return null;
    }
  }, [section, initialized]);

  const items = useMemo(() => {
    if (!initialized) return [];
    return getGalleryItems(section as GallerySectionId);
  }, [section, initialized]);

  const handleItemPress = (item: GalleryItem) => {
    router.push(`/gallery/${section}/${item.id}`);
  };

  if (!sectionInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Section not found: {section}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: sectionInfo.title,
          headerStyle: { backgroundColor: sectionInfo.color + '22' },
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.icon}>{sectionInfo.icon}</Text>
          <Text style={styles.title}>{sectionInfo.title}</Text>
          <Text style={styles.description}>{sectionInfo.description}</Text>
          <Text style={styles.count}>{items.length} items</Text>
        </View>
        <GalleryGrid items={items} onItemPress={handleItemPress} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  count: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});
