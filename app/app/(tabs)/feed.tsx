import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBrowseGames } from "@/hooks/useBrowseGames";

interface FeedCardProps {
  game: {
    id: string;
    title: string;
    description: string | null;
    playCount: number;
    thumbnailUrl: string | null;
    source: string;
  };
  height: number;
  onPlay: () => void;
  bottomInset: number;
}

function FeedCard({ game, height, onPlay, bottomInset }: FeedCardProps) {
  const tabBarSpace = 68 + bottomInset + 12;

  return (
    <View style={[styles.card, { height }]}>
      {game.thumbnailUrl ? (
        <Image
          source={{ uri: game.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      <View style={StyleSheet.absoluteFill}>
        <View style={styles.cardTopFade} />
      </View>

      <View style={[styles.cardContent, { paddingBottom: tabBarSpace + 16 }]}>
        <View style={styles.cardInfo}>
          {!game.thumbnailUrl && (
            <Text style={styles.cardEmoji}>🎮</Text>
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {game.title}
          </Text>
          {game.description && (
            <Text style={styles.cardDescription} numberOfLines={3}>
              {game.description}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <Ionicons name="play-circle" size={16} color="#A1A1AA" />
            <Text style={styles.cardMetaText}>
              {game.playCount} {game.playCount === 1 ? "play" : "plays"}
            </Text>
            {game.source === "template" && (
              <View style={styles.templateBadge}>
                <Text style={styles.templateBadgeText}>Template</Text>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
            onPress={onPlay}
          >
            <Ionicons name="play" size={22} color="#FFFFFF" />
            <Text style={styles.playButtonText}>PLAY</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const {
    publicGames,
    isLoadingPublic,
    hasMorePublicGames,
    publicGamesPage,
    fetchPublicGames,
  } = useBrowseGames({ pageSize: 20 });

  const cardHeight = screenHeight;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handlePlay = useCallback(
    (game: { id: string; source: string }) => {
      router.push({
        pathname: "/game-detail/[id]",
        params: { id: game.id, source: game.source },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof publicGames)[number] }) => {
      return (
        <FeedCard
          game={item}
          height={cardHeight}
          onPlay={() => handlePlay(item)}
          bottomInset={insets.bottom}
        />
      );
    },
    [cardHeight, handlePlay, insets.bottom],
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: cardHeight,
      offset: cardHeight * index,
      index,
    }),
    [cardHeight],
  );

  const handleEndReached = useCallback(() => {
    if (hasMorePublicGames) {
      fetchPublicGames(publicGamesPage + 1);
    }
  }, [hasMorePublicGames, publicGamesPage, fetchPublicGames]);

  if (isLoadingPublic) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#818CF8" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  if (publicGames.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎮</Text>
        <Text style={styles.emptyTitle}>No games yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to create a game!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={publicGames}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews
        onEndReached={handleEndReached}
        onEndReachedThreshold={2}
        decelerationRate="fast"
      />

      <View style={[styles.pageIndicator, { top: insets.top + 16 }]}>
        <Text style={styles.pageIndicatorText}>
          {activeIndex + 1} / {publicGames.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#A1A1AA",
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#71717A",
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#0A0B0E",
    justifyContent: "flex-end",
  },
  cardTopFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -100 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cardInfo: {
    gap: 10,
  },
  cardEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cardDescription: {
    color: "#D4D4D8",
    fontSize: 16,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cardMetaText: {
    color: "#A1A1AA",
    fontSize: 14,
  },
  templateBadge: {
    backgroundColor: "rgba(129,140,248,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  templateBadgeText: {
    color: "#818CF8",
    fontSize: 12,
    fontWeight: "600",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
  },
  playButtonPressed: {
    backgroundColor: "#4338CA",
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pageIndicator: {
    position: "absolute",
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicatorText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
});
