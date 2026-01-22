import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { GalleryItem } from '@slopcade/shared';
import { GALLERY_SECTIONS_BY_ID } from '@slopcade/shared';

type GalleryCardProps = {
  item: GalleryItem;
  onPress: () => void;
};

export const GalleryCard = ({ item, onPress }: GalleryCardProps) => {
  const section = GALLERY_SECTIONS_BY_ID[item.section];

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.previewPlaceholder, { backgroundColor: section?.color + '22' }]}>
        {item.icon && <Text style={styles.placeholderIcon}>{item.icon}</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        {section && (
          <View style={[styles.badge, { backgroundColor: section.color }]}>
            <Text style={styles.badgeText}>{section.title}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  previewPlaceholder: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
  },
  content: {
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8,
  },
});
