import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpcReact } from "@/lib/trpc/react";

export default function GameDetailScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();

	const {
		data: template,
		isLoading,
		error,
	} = trpcReact.partyTemplates.getById.useQuery(
		{ id: id! },
		{ enabled: !!id },
	);

	const handleBack = useCallback(() => router.back(), [router]);

	const handleHost = useCallback(() => {
		if (!template) return;
		router.push({
			pathname: "/party/host",
			params: { templateId: template.id },
		});
	}, [template, router]);

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-theme-background items-center justify-center">
				<ActivityIndicator
					size="large"
					color="rgb(var(--color-theme-primary))"
				/>
				<Text className="text-theme-text mt-4">Loading game...</Text>
			</SafeAreaView>
		);
	}

	if (error || !template) {
		return (
			<SafeAreaView className="flex-1 bg-theme-background items-center justify-center p-6">
				<Text className="text-theme-error text-center text-lg">
					{error?.message ?? "Game not found"}
				</Text>
				<Pressable
					className="mt-6 py-3 px-6 bg-theme-surface rounded-lg border border-theme-border"
					onPress={handleBack}
				>
					<Text className="text-theme-text font-semibold">Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<View className="px-4 py-3 flex-row items-center border-b border-theme-border">
				<Pressable onPress={handleBack} className="mr-4">
					<Text className="text-theme-primary text-lg">Back</Text>
				</Pressable>
			</View>

			<ScrollView className="flex-1">
				<View className="w-full h-48 bg-theme-primary/10 items-center justify-center">
					<Text className="text-7xl">{template.emoji}</Text>
				</View>

				<View className="px-4 pt-4 pb-8">
					<Text className="text-3xl font-bold text-theme-text mb-2">
						{template.title}
					</Text>

					<View className="flex-row gap-2 mb-4">
						<View className="bg-theme-primary/10 px-3 py-1 rounded-full">
							<Text className="text-theme-primary text-sm font-medium">
								{template.minPlayers}-{template.maxPlayers} players
							</Text>
						</View>
						<View className="bg-theme-surface px-3 py-1 rounded-full border border-theme-border">
							<Text className="text-theme-text-secondary text-sm">
								{template.contentPack}
							</Text>
						</View>
					</View>

					{template.description && (
						<Text className="text-theme-text-secondary text-base mb-3">
							{template.description}
						</Text>
					)}

					{template.mechanic && (
						<View className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-6">
							<Text className="text-theme-text-secondary text-xs uppercase tracking-wide mb-2">
								How to Play
							</Text>
							<Text className="text-theme-text text-base leading-6">
								{template.mechanic}
							</Text>
						</View>
					)}

					<Pressable
						className="py-4 bg-theme-primary rounded-xl items-center justify-center active:opacity-80"
						onPress={handleHost}
					>
						<Text className="text-theme-text-inverse font-bold text-lg">
							Host This Game
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
