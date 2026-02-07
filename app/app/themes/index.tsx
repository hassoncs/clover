import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { ThemeCard } from "@/components/themes/ThemeCard";
import { ThemeFilterBar } from "@/components/themes/ThemeFilterBar";
import { ThemeEditorModal } from "@/components/themes/ThemeEditorModal";
import { useBrowseThemes, type Theme } from "@/hooks/useBrowseThemes";
import { trpc } from "@/lib/trpc/client";

export default function ThemesScreen() {
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  const {
    myThemes,
    publicThemes,
    isLoadingMy,
    isLoadingPublic,
    isRefreshing,
    hasMoreMyThemes,
    hasMorePublicThemes,
    searchQuery,
    handleSearchChange,
    loadMoreMyThemes,
    loadMorePublicThemes,
    handleRefresh,
  } = useBrowseThemes();

  const handleCreate = () => {
    setEditingTheme(null);
    setIsModalVisible(true);
  };

  const handleEdit = (theme: Theme) => {
    setEditingTheme(theme);
    setIsModalVisible(true);
  };

  const handleDelete = (theme: Theme) => {
    Alert.alert("Delete Theme", "Are you sure you want to delete this theme? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await trpc.assetSystem.themes.delete.mutate({ id: theme.id });
            handleRefresh();
          } catch {
            Alert.alert("Error", "Failed to delete theme");
          }
        },
      },
    ]);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingTheme(null);
  };

  const handleModalSave = () => {
    handleRefresh();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#4CAF50" />}
      >
        <View className="p-4">
          <View className="mb-4">
            <Text className="text-2xl font-bold text-white">Themes</Text>
            <Text className="text-gray-400 mt-1">Create and discover visual styles for your games</Text>
          </View>

          <ThemeFilterBar searchQuery={searchQuery} onSearchChange={handleSearchChange} />

          <Pressable
            onPress={handleCreate}
            className="bg-indigo-600 p-4 rounded-xl mb-6 active:bg-indigo-700 items-center"
          >
            <Text className="text-white font-semibold text-lg">+ Create New Theme</Text>
          </Pressable>

          <View className="mb-8">
            <Text className="text-xl font-bold text-white mb-3">My Themes</Text>

            {isLoadingMy && myThemes.length === 0 ? (
              <ActivityIndicator size="large" color="#818CF8" />
            ) : myThemes.length === 0 ? (
              <View className="bg-gray-800 p-6 rounded-xl border border-gray-700 items-center">
                <Text className="text-gray-400 text-center">
                  {searchQuery ? "No themes match your search." : "You haven't created any themes yet."}
                </Text>
              </View>
            ) : (
              <View>
                {myThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    {...theme}
                    isOwned
                    onPress={() => router.push({ pathname: "/themes/[id]", params: { id: theme.id } })}
                    onEdit={() => handleEdit(theme)}
                    onDelete={() => handleDelete(theme)}
                  />
                ))}

                {hasMoreMyThemes && (
                  <Pressable
                    onPress={loadMoreMyThemes}
                    className="bg-gray-800 p-3 rounded-lg border border-gray-700 items-center mt-2 active:bg-gray-700"
                  >
                    <Text className="text-indigo-400 font-medium">Load more</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-xl font-bold text-white mb-3">Public Themes</Text>

            {isLoadingPublic && publicThemes.length === 0 ? (
              <ActivityIndicator size="large" color="#818CF8" />
            ) : publicThemes.length === 0 ? (
              <View className="bg-gray-800 p-6 rounded-xl border border-gray-700 items-center">
                <Text className="text-gray-400 text-center">
                  {searchQuery ? "No public themes match your search." : "No public themes available."}
                </Text>
              </View>
            ) : (
              <View>
                {publicThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    {...theme}
                    isOwned={false}
                    onPress={() => router.push({ pathname: "/themes/[id]", params: { id: theme.id } })}
                  />
                ))}

                {hasMorePublicThemes && (
                  <Pressable
                    onPress={loadMorePublicThemes}
                    className="bg-gray-800 p-3 rounded-lg border border-gray-700 items-center mt-2 active:bg-gray-700"
                  >
                    <Text className="text-indigo-400 font-medium">Load more</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ThemeEditorModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editingTheme={editingTheme}
      />
    </SafeAreaView>
  );
}
