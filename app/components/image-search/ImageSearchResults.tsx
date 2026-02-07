import { useCallback, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ImageSearchResultCard } from "./ImageSearchResultCard";

interface SearchResultItem {
  id: string;
  type: string;
  source: string;
  name: string;
  previewUrl: string;
  metadata: {
    collection?: string;
    license?: string;
    width?: number;
    height?: number;
    frameCount?: number;
  };
}

interface ImageSearchResultsProps {
  results: SearchResultItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onResultPress?: (id: string) => void;
  emptyMessage?: string;
}

const NUM_COLUMNS = 3;

export function ImageSearchResults({
  results,
  isLoading,
  hasMore,
  onLoadMore,
  onResultPress,
  emptyMessage = "No results found",
}: ImageSearchResultsProps) {
  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => (
      <ImageSearchResultCard
        id={item.id}
        name={item.name}
        previewUrl={item.previewUrl}
        collection={item.metadata.collection}
        onPress={onResultPress}
      />
    ),
    [onResultPress]
  );

  const keyExtractor = useCallback((item: SearchResultItem) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const listFooter = useMemo(() => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }, [isLoading]);

  if (!isLoading && results.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
  },
});
