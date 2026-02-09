import { useRef, useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpcReact } from "@/lib/trpc/react";
import { useAuth } from "@/hooks/useAuth";
import { SocialFeedCard } from "@/components/social/SocialFeedCard";
import { CommentsBottomSheet, type CommentsBottomSheetHandle } from "@/components/social/CommentsBottomSheet";

const PAGE_SIZE = 20;

type FeedTab = "forYou" | "following";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const commentsRef = useRef<CommentsBottomSheetHandle>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [forYouOffset, setForYouOffset] = useState(0);
  const [followingOffset, setFollowingOffset] = useState(0);

  const forYouQuery = trpcReact.social.feed.useQuery(
    { limit: PAGE_SIZE, offset: forYouOffset },
    { enabled: activeTab === "forYou" },
  );

  const followingQuery = trpcReact.socialExtra.followingFeed.useQuery(
    { limit: PAGE_SIZE, offset: followingOffset },
    { enabled: activeTab === "following" && !!currentUserId },
  );

  const isForYou = activeTab === "forYou";
  const activeQuery = isForYou ? forYouQuery : followingQuery;
  const games = activeQuery.data?.games ?? [];
  const hasMore = activeQuery.data?.hasMore ?? false;
  const isLoading = activeQuery.isLoading;
  const isRefetching = activeQuery.isRefetching;

  const handleCommentPress = useCallback((gameId: string) => {
    commentsRef.current?.open(gameId);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isForYou) {
      setForYouOffset(0);
      forYouQuery.refetch();
    } else {
      setFollowingOffset(0);
      followingQuery.refetch();
    }
  }, [isForYou, forYouQuery, followingQuery]);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab);
  }, []);

  const renderItem = useCallback(({ item }: { item: (typeof games)[number] }) => (
    <SocialFeedCard
      game={item}
      currentUserId={currentUserId}
      onCommentPress={handleCommentPress}
    />
  ), [currentUserId, handleCommentPress]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#818CF8" />
      </View>
    );
  }, [hasMore]);

  const tabBar = (
    <View
      className="flex-row bg-black border-b border-gray-800"
      style={{ paddingTop: insets.top }}
    >
      <Pressable
        className="flex-1 items-center py-3"
        onPress={() => handleTabChange("forYou")}
      >
        <Text className={`text-sm font-semibold ${isForYou ? "text-white" : "text-gray-500"}`}>
          For You
        </Text>
        {isForYou && <View className="mt-1.5 w-8 h-0.5 bg-indigo-500 rounded-full" />}
      </Pressable>
      {currentUserId && (
        <Pressable
          className="flex-1 items-center py-3"
          onPress={() => handleTabChange("following")}
        >
          <Text className={`text-sm font-semibold ${!isForYou ? "text-white" : "text-gray-500"}`}>
            Following
          </Text>
          {!isForYou && <View className="mt-1.5 w-8 h-0.5 bg-indigo-500 rounded-full" />}
        </Pressable>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        {tabBar}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#818CF8" />
          <Text className="text-gray-400 mt-4">Loading feed...</Text>
        </View>
      </View>
    );
  }

  if (games.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black">
          {tabBar}
          <View className="flex-1 items-center justify-center px-8">
            {isForYou ? (
              <>
                <Text className="text-5xl mb-4">🎮</Text>
                <Text className="text-white text-2xl font-bold">No games yet</Text>
                <Text className="text-gray-500 mt-2 text-center">
                  Be the first to create a game!
                </Text>
              </>
            ) : (
              <>
                <Text className="text-5xl mb-4">👥</Text>
                <Text className="text-white text-2xl font-bold">No games here</Text>
                <Text className="text-gray-500 mt-2 text-center">
                  Follow some creators to see their games here!
                </Text>
              </>
            )}
          </View>
          <CommentsBottomSheet
            ref={commentsRef}
            currentUserId={currentUserId}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-black">
        {tabBar}
        <FlatList
          data={games}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor="#818CF8"
            />
          }
          onEndReached={() => {
            if (hasMore) {
              if (isForYou) {
                setForYouOffset(games.length);
              } else {
                setFollowingOffset(games.length);
              }
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
        />

        <CommentsBottomSheet
          ref={commentsRef}
          currentUserId={currentUserId}
        />
      </View>
    </GestureHandlerRootView>
  );
}
