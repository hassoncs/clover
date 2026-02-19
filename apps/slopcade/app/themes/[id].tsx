import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeEditorModal } from "@/components/themes/ThemeEditorModal";
import { trpc } from "@/lib/trpc/client";

interface ThemeInfo {
	id: string;
	name: string;
	promptModifier: string;
	style?: string | null;
	thumbnailUrl?: string | null;
	creatorUserId: string | null;
	isPublic: boolean;
	createdAt: number | string | Date;
	updatedAt: number | string | Date | null;
}

export default function ThemeDetailScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();

	const [theme, setTheme] = useState<ThemeInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);

	const loadTheme = useCallback(async () => {
		if (!id) return;

		setIsLoading(true);
		setError(null);

		try {
			const data = await trpc.assetSystem.themes.get.query({ id });
			setTheme(data);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to load theme";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		loadTheme();
	}, [loadTheme]);

	const handleBack = useCallback(() => router.back(), [router]);

	const handleDelete = useCallback(() => {
		if (!theme) return;

		Alert.alert(
			"Delete Theme",
			"Are you sure you want to delete this theme? This action cannot be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						setIsDeleting(true);
						try {
							await trpc.assetSystem.themes.delete.mutate({ id: theme.id });
							router.back();
						} catch (err) {
							Alert.alert(
								"Delete Failed",
								err instanceof Error ? err.message : "Could not delete theme",
							);
							setIsDeleting(false);
						}
					},
				},
			],
		);
	}, [theme, router]);

	const handleEdit = useCallback(() => {
		setIsEditModalVisible(true);
	}, []);

	const handleEditSave = useCallback(() => {
		loadTheme();
	}, [loadTheme]);

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
				<ActivityIndicator size="large" color="#4CAF50" />
				<Text className="text-white mt-4">Loading theme...</Text>
			</SafeAreaView>
		);
	}

	if (error || !theme) {
		return (
			<SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
				<Text className="text-red-400 text-center text-lg">
					{error ?? "Theme not found"}
				</Text>
				<Pressable
					className="mt-6 py-3 px-6 bg-gray-700 rounded-lg"
					onPress={handleBack}
				>
					<Text className="text-white font-semibold">← Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="px-4 py-3 flex-row items-center border-b border-gray-800">
				<Pressable onPress={handleBack} className="mr-4">
					<Text className="text-white text-lg">← Back</Text>
				</Pressable>
			</View>

			<ScrollView className="flex-1">
				{theme.thumbnailUrl ? (
					<View className="w-full h-48">
						<Image
							source={{ uri: theme.thumbnailUrl }}
							className="w-full h-full"
							resizeMode="cover"
						/>
					</View>
				) : (
					<View className="w-full h-48 bg-gradient-to-br from-indigo-900 to-purple-900 items-center justify-center">
						<Text className="text-6xl">🎨</Text>
					</View>
				)}

				<View className="px-4 pt-4 pb-8">
					<Text className="text-3xl font-bold text-white mb-2">
						{theme.name}
					</Text>

					<View className="flex-row gap-2 mb-6">
						<View
							className={`px-3 py-1 rounded-full ${theme.isPublic ? "bg-green-900/30" : "bg-gray-700"}`}
						>
							<Text
								className={`${theme.isPublic ? "text-green-300" : "text-gray-300"} text-sm`}
							>
								{theme.isPublic ? "Public" : "Private"}
							</Text>
						</View>
						<View className="bg-gray-700 px-3 py-1 rounded-full">
							<Text className="text-gray-300 text-sm">
								{new Date(theme.createdAt).toLocaleDateString()}
							</Text>
						</View>
					</View>

					<View className="mb-8">
						<Text className="text-white text-xl font-bold mb-3">
							Prompt Modifier
						</Text>
						<View className="bg-gray-800 p-4 rounded-xl">
							<Text className="text-gray-300 text-base leading-relaxed font-mono">
								{theme.promptModifier}
							</Text>
						</View>
					</View>

					<View className="flex-row gap-3">
						<Pressable
							className="flex-1 py-3 bg-indigo-600 rounded-xl items-center active:bg-indigo-700"
							onPress={handleEdit}
						>
							<Text className="text-white font-bold text-base">Edit Theme</Text>
						</Pressable>

						<Pressable
							className={`flex-1 py-3 rounded-xl items-center ${
								isDeleting ? "bg-gray-600" : "bg-red-600 active:bg-red-700"
							}`}
							onPress={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? (
								<View className="flex-row items-center">
									<ActivityIndicator size="small" color="#FFFFFF" />
									<Text className="text-white font-bold text-base ml-2">
										Deleting...
									</Text>
								</View>
							) : (
								<Text className="text-white font-bold text-base">Delete</Text>
							)}
						</Pressable>
					</View>
				</View>
			</ScrollView>

			<ThemeEditorModal
				visible={isEditModalVisible}
				onClose={() => setIsEditModalVisible(false)}
				onSave={handleEditSave}
				editingTheme={theme}
				onEnhancePrompt={async (prompt, name) => {
					return await trpc.assetSystem.themes.enhancePrompt.mutate({
						prompt,
						name,
					});
				}}
				onCreateTheme={async (data) => {
					await trpc.assetSystem.themes.create.mutate(data);
				}}
				onUpdateTheme={async (data) => {
					await trpc.assetSystem.themes.update.mutate(data);
				}}
			/>
		</SafeAreaView>
	);
}
