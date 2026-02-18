import { useState, useCallback, useEffect, useRef } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SearchInput } from "@/components/shared/SearchInput";
import { ImageSearchResults } from "@/components/image-search/ImageSearchResults";
import { trpcReact } from "@/lib/trpc/react";

type ResultItem = {
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
};

const PAGE_SIZE = 64;

export default function ImageSearchScreen() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [start, setStart] = useState(0);
  const [allResults, setAllResults] = useState<ResultItem[]>([]);
  const lastDataRef = useRef<string>("");

  const { data, isLoading, isFetching } = trpcReact.search.query.useQuery(
    { query: submittedQuery, limit: PAGE_SIZE, start },
    {
      enabled: submittedQuery.length > 0,
      placeholderData: keepPreviousData,
    }
  );

  useEffect(() => {
    if (!data) return;
    const dataKey = `${submittedQuery}:${start}:${data.results.length}`;
    if (dataKey === lastDataRef.current) return;
    lastDataRef.current = dataKey;

    if (start === 0) {
      setAllResults(data.results);
    } else {
      setAllResults((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = data.results.filter((r) => !existingIds.has(r.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
  }, [data, start, submittedQuery]);

  const handleSubmit = useCallback((query: string) => {
    setAllResults([]);
    setStart(0);
    lastDataRef.current = "";
    setSubmittedQuery(query);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (data?.hasMore && !isFetching) {
      setStart(data.nextStart);
    }
  }, [data, isFetching]);

  const handleResultPress = useCallback((id: string) => {
    console.log("Selected asset:", id);
  }, []);

  const showInitialState = !submittedQuery;
  const showLoading = isLoading && start === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color="#F2F4F7" />
        </Pressable>
        <View style={styles.searchContainer}>
          <SearchInput
            value={inputValue}
            onChangeText={setInputValue}
            onSubmit={handleSubmit}
            placeholder="Search assets..."
            autoFocus
          />
        </View>
      </View>

      {submittedQuery.length > 0 && data && !isLoading && (
        <View style={styles.resultsMeta}>
          <Text style={styles.resultsCount}>
            {data.total} {data.total === 1 ? "result" : "results"} for &quot;{submittedQuery}&quot;
          </Text>
        </View>
      )}

      {showInitialState ? (
        <View style={styles.initialState}>
          <Text style={styles.initialIcon}>🔍</Text>
          <Text style={styles.initialText}>Search for icons, sprites, and more</Text>
          <Text style={styles.initialSubtext}>
            Try &quot;pizza&quot;, &quot;sword&quot;, or &quot;robot&quot;
          </Text>
        </View>
      ) : showLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <ImageSearchResults
          results={allResults}
          isLoading={isFetching && start > 0}
          hasMore={data?.hasMore ?? false}
          onLoadMore={handleLoadMore}
          onResultPress={handleResultPress}
          emptyMessage={`No results for "${submittedQuery}"`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050608",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flex: 1,
  },
  resultsMeta: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    color: "#6B7280",
    fontSize: 13,
  },
  initialState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  initialIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  initialText: {
    color: "#9CA3AF",
    fontSize: 18,
    fontWeight: "600",
  },
  initialSubtext: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 6,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
  },
});
