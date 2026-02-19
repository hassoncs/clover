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
			<SafeAreaView className="flex-1 bg-theme-background items-center justify-center">
				<ActivityIndicator size="large" color="#C9A84C" />
				<Text className="text-theme-text mt-4">Loading theme...</Text>
			</SafeAreaView>
		);
	}

	if (error || !theme) {
		return (
			<SafeAreaView className="flex-1 bg-theme-background items-center justify-center p-6">
				<Text className="text-theme-error text-center text-lg">
					{error ?? "Theme not found"}
				</Text>
				<Pressable
					className="mt-6 py-3 px-6 bg-theme-surface-elevated rounded-lg"
					onPress={handleBack}
				>
					<Text className="text-theme-text font-semibold">← Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<View className="px-4 py-3 flex-row items-center border-b border-theme-border">
				<Pressable onPress={handleBack} className="mr-4">
					<Text className="text-theme-text text-lg">← Back</Text>
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
					<View className="w-full h-48 bg-gradient-to-br from-theme-secondary to-theme-surface-elevated items-center justify-center">
						<Text className="text-6xl">🎨</Text>
					</View>
				)}

				<View className="px-4 pt-4 pb-8">
					<Text className="text-3xl font-bold text-theme-text mb-2">
						{theme.name}
					</Text>

					<View className="flex-row gap-2 mb-6">
						<View
							className={`px-3 py-1 rounded-full ${theme.isPublic ? "bg-theme-success/30" : "bg-theme-surface-elevated"}`}
						>
							<Text
								className={`${theme.isPublic ? "text-theme-success" : "text-theme-text-secondary"} text-sm`}
							>
								{theme.isPublic ? "Public" : "Private"}
							</Text>
						</View>
						<View className="bg-theme-surface-elevated px-3 py-1 rounded-full">
							<Text className="text-theme-text-secondary text-sm">
								{new Date(theme.createdAt).toLocaleDateString()}
							</Text>
						</View>
					</View>

					<View className="mb-8">
						<Text className="text-theme-text text-xl font-bold mb-3">
							Prompt Modifier
						</Text>
						<View className="bg-theme-surface p-4 rounded-xl">
							<Text className="text-theme-text-secondary text-base leading-relaxed font-mono">
								{theme.promptModifier}
							</Text>
						</View>
					</View>

					<View className="flex-row gap-3">
						<Pressable
							className="flex-1 py-3 bg-theme-primary rounded-xl items-center active:bg-theme-primary/90"
							onPress={handleEdit}
						>
							<Text className="text-theme-secondary font-bold text-base">
								Edit Theme
							</Text>
						</Pressable>

						<Pressable
							className={`flex-1 py-3 rounded-xl items-center ${
								isDeleting
									? "bg-theme-surface-elevated"
									: "bg-theme-error active:bg-theme-error/90"
							}`}
							onPress={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? (
								<View className="flex-row items-center">
									<ActivityIndicator size="small" color="#FDF8F0" />
									<Text className="text-theme-text font-bold text-base ml-2">
										Deleting...
									</Text>
								</View>
							) : (
								<Text className="text-theme-text-inverse font-bold text-base">
									Delete
								</Text>
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
			/>
		</SafeAreaView>
	);
}
