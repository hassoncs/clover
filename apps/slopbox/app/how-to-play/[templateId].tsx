import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TutorialPager } from "@/components/browse/TutorialPager";
import type { PartyTemplate } from "@/lib/party/template-types";
import { trpcReact } from "@/lib/trpc/react";

export default function HowToPlayScreen() {
	const { templateId } = useLocalSearchParams<{ templateId: string }>();
	const router = useRouter();

	const { data, isLoading } = trpcReact.partyTemplates.getById.useQuery(
		{ id: templateId! },
		{ enabled: !!templateId },
	);

	const template = data as unknown as PartyTemplate;

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-[#0D1117]">
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#22c55e" />
				</View>
			</SafeAreaView>
		);
	}

	if (
		!template ||
		!template.howToPlaySteps ||
		template.howToPlaySteps.length === 0
	) {
		return (
			<SafeAreaView className="flex-1 bg-zinc-900">
				<Stack.Screen options={{ headerShown: false }} />
				<View className="flex-1 items-center justify-center p-8 gap-6">
					<Ionicons name="document-text-outline" size={64} color="#22c55e" />
					<Text className="font-lora text-2xl text-white text-center">
						No tutorial available for this game yet.
					</Text>
					<Pressable
						onPress={() => router.back()}
						className="bg-primary/10 px-6 py-3 rounded-full border border-primary/30 active:bg-primary/20"
					>
						<Text className="font-inter font-bold text-primary uppercase tracking-wider">
							Go Back
						</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-zinc-900">
			<Stack.Screen options={{ headerShown: false }} />
			<TutorialPager
				steps={template.howToPlaySteps}
				onDone={() => router.back()}
			/>
		</SafeAreaView>
	);
}
