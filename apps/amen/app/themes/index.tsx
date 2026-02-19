import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeCard } from "@/components/themes/ThemeCard";
import { ThemeEditorModal } from "@/components/themes/ThemeEditorModal";
import { ThemeFilterBar } from "@/components/themes/ThemeFilterBar";
import { type Theme, useBrowseThemes } from "@/hooks/useBrowseThemes";
import { toast } from "@/lib/toast";
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
		Alert.alert(
			"Delete Theme",
			"Are you sure you want to delete this theme? This action cannot be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await trpc.assetSystem.themes.delete.mutate({ id: theme.id });
							handleRefresh();
						} catch {
							toast.error("Failed to delete theme");
						}
					},
				},
			],
		);
	};

	const handleModalClose = () => {
		setIsModalVisible(false);
		setEditingTheme(null);
	};

	const handleModalSave = () => {
		handleRefresh();
	};

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
			<ScrollView
				className="flex-1"
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor="#C9A84C"
					/>
				}
			>
				<View className="p-4">
					<View className="mb-4">
						<Text className="text-2xl font-bold text-theme-text">Themes</Text>
						<Text className="text-theme-text-secondary mt-1">
							Create and discover visual styles for your games
						</Text>
					</View>

					<ThemeFilterBar
						searchQuery={searchQuery}
						onSearchChange={handleSearchChange}
					/>

					<Pressable
						onPress={handleCreate}
						className="bg-theme-primary p-4 rounded-xl mb-6 active:bg-theme-primary/90 items-center"
					>
						<Text className="text-theme-secondary font-semibold text-lg">
							+ Create New Theme
						</Text>
					</Pressable>

					<View className="mb-8">
						<Text className="text-xl font-bold text-theme-text mb-3">
							My Themes
						</Text>

						{isLoadingMy && myThemes.length === 0 ? (
							<ActivityIndicator size="large" color="#C9A84C" />
						) : myThemes.length === 0 ? (
							<View className="bg-theme-surface p-6 rounded-xl border border-theme-border items-center">
								<Text className="text-theme-text-secondary text-center">
									{searchQuery
										? "No themes match your search."
										: "You haven't created any themes yet."}
								</Text>
							</View>
						) : (
							<View>
								{myThemes.map((theme) => (
									<ThemeCard
										key={theme.id}
										{...theme}
										isOwned
										onPress={() =>
											router.push({
												pathname: "/themes/[id]",
												params: { id: theme.id },
											})
										}
										onEdit={() => handleEdit(theme)}
										onDelete={() => handleDelete(theme)}
									/>
								))}

								{hasMoreMyThemes && (
									<Pressable
										onPress={loadMoreMyThemes}
										className="bg-theme-surface p-3 rounded-lg border border-theme-border items-center mt-2 active:bg-theme-surface-elevated"
									>
										<Text className="text-theme-primary font-medium">
											Load more
										</Text>
									</Pressable>
								)}
							</View>
						)}
					</View>

					<View className="mb-6">
						<Text className="text-xl font-bold text-theme-text mb-3">
							Public Themes
						</Text>

						{isLoadingPublic && publicThemes.length === 0 ? (
							<ActivityIndicator size="large" color="#C9A84C" />
						) : publicThemes.length === 0 ? (
							<View className="bg-theme-surface p-6 rounded-xl border border-theme-border items-center">
								<Text className="text-theme-text-secondary text-center">
									{searchQuery
										? "No public themes match your search."
										: "No public themes available."}
								</Text>
							</View>
						) : (
							<View>
								{publicThemes.map((theme) => (
									<ThemeCard
										key={theme.id}
										{...theme}
										isOwned={false}
										onPress={() =>
											router.push({
												pathname: "/themes/[id]",
												params: { id: theme.id },
											})
										}
									/>
								))}

								{hasMorePublicThemes && (
									<Pressable
										onPress={loadMorePublicThemes}
										className="bg-theme-surface p-3 rounded-lg border border-theme-border items-center mt-2 active:bg-theme-surface-elevated"
									>
										<Text className="text-theme-primary font-medium">
											Load more
										</Text>
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
