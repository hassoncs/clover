import { AmenIcon, AmenLoadingScreen } from "@slopcade/ui/amen";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { TutorialPager } from "@/components/browse/TutorialPager";
import type { PartyTemplate } from "@/lib/party/template-types";
import { trpcReact } from "@/lib/trpc/react";

export default function HowToPlayScreen() {
	const { templateId } = useLocalSearchParams<{ templateId: string }>();
	const router = useRouter();

	const { data, isLoading } = trpcReact.partyTemplates.getById.useQuery(
		{ id: templateId! },
		{ enabled: !!templateId }
	);

	const template = data as unknown as PartyTemplate;

	if (isLoading) {
		return <AmenLoadingScreen />;
	}

	if (
		!template ||
		!template.howToPlaySteps ||
		template.howToPlaySteps.length === 0
	) {
		return (
			<SafeAreaView className="flex-1 bg-amen-navy">
				<Stack.Screen options={{ headerShown: false }} />
				<View className="flex-1 items-center justify-center p-8 gap-6">
					<AmenIcon name="scroll" size={64} color="#C9A84C" />
					<Text className="font-lora text-2xl text-amen-cream text-center">
						No tutorial available for this game yet.
					</Text>
					<Pressable
						onPress={() => router.back()}
						className="bg-amen-gold/10 px-6 py-3 rounded-full border border-amen-gold/30 active:bg-amen-gold/20"
					>
						<Text className="font-inter font-bold text-amen-gold uppercase tracking-wider">
							Go Back
						</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-amen-navy">
			<Stack.Screen options={{ headerShown: false }} />
			<TutorialPager
				steps={template.howToPlaySteps}
				onDone={() => router.back()}
			/>
		</SafeAreaView>
	);
}
