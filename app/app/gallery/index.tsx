import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { 
  GALLERY_SECTIONS, 
  getGalleryItems, 
  initializeGalleryItems,
  type GallerySection 
} from '@slopcade/shared';

const SectionCard = ({ section }: { section: GallerySection }) => {
  const itemCount = getGalleryItems(section.id).length;
  
  return (
    <Link href={`/gallery/${section.id}`} asChild>
      <Pressable style={styles.sectionCard}>
        <View style={[styles.iconContainer, { backgroundColor: section.color }]}>
          <Text style={styles.icon}>{section.icon}</Text>
        </View>
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>{section.description}</Text>
          <Text style={styles.itemCount}>{itemCount} items</Text>
        </View>
      </Pressable>
    </Link>
  );
};

export default function GalleryHome() {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    initializeGalleryItems();
    setInitialized(true);
  }, []);

  if (!initialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Engine Gallery</Text>
        <Text style={styles.subtitle}>
          Explore all available effects, particles, behaviors, sprites, and physics features
        </Text>
      </View>
      
      <View style={styles.sectionsContainer}>
        {GALLERY_SECTIONS.map(section => (
          <SectionCard key={section.id} section={section} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionsContainer: {
    padding: 16,
  },
  sectionCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 28,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  itemCount: {
    color: '#4ecdc4',
    fontSize: 12,
    fontWeight: '600',
  },
});
