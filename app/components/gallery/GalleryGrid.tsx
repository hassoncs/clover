
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { GalleryItem } from '@slopcade/shared';
import { GalleryCard } from './GalleryCard';

type GalleryGridProps = {
  items: GalleryItem[];
  onItemPress: (item: GalleryItem) => void;
};

export const GalleryGrid = ({ items, onItemPress }: GalleryGridProps) => {
  return (
    <FlatList
      data={items}
      numColumns={2}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <GalleryCard item={item} onPress={() => onItemPress(item)} />}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#0a0a0a',
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
  },
});
