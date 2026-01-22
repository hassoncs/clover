import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { 
  getGalleryItem, 
  getGallerySection,
  initializeGalleryItems,
  type GallerySectionId,
} from '@slopcade/shared';
import { GalleryDetail } from '@/components/gallery';

export default function GalleryItemPage() {
  const { section, id } = useLocalSearchParams<{ section: GallerySectionId; id: string }>();
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

  const item = useMemo(() => {
    if (!initialized) return null;
    return getGalleryItem(section as GallerySectionId, id);
  }, [section, id, initialized]);

  if (!initialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading...</Text>
      </View>
    );
  }

  if (!item || !sectionInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Item not found: {section}/{id}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: item.title,
          headerStyle: { backgroundColor: sectionInfo.color + '22' },
        }}
      />
      <GalleryDetail item={item} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
  },
});
