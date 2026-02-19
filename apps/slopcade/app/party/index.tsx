import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createPartyRoom } from "@/lib/party/api";
import { trpcReact } from "@/lib/trpc/react";

export default function PartyIndexScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [isCreating, setIsCreating] = useState(false);
	const [selectedGameIndex, setSelectedGameIndex] = useState(0);

	const { data: templates = [], isLoading } =
		trpcReact.partyTemplates.listByBrand.useQuery(
			{ brandId: "slopcade" },
			{ staleTime: 1000 * 60 * 5 },
		);

	const selectedGame = templates[selectedGameIndex];

	const handleHostGame = async () => {
		if (!selectedGame) return;
		try {
			setIsCreating(true);
			const { code, hostToken } = await createPartyRoom(selectedGame.id);
			router.push({
				pathname: "/party/host",
				params: { code, hostToken, template: selectedGame.id },
			});
		} catch (error) {
			console.error("Failed to create room:", error);
			setIsCreating(false);
		}
	};

	return (
		<View
			className="flex-1 bg-theme-background p-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View className="flex-row items-center justify-between mb-8">
				<Pressable
					onPress={() => router.back()}
					className="p-2 rounded-full bg-theme-surface active:opacity-80"
				>
					<Ionicons name="arrow-back" size={24} color="white" />
				</Pressable>
				<Text className="text-xl font-bold text-theme-text">Party Games</Text>
				<View className="w-10" />
			</View>

			<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
				{isLoading ? (
					<View className="items-center justify-center py-20">
						<ActivityIndicator color="white" size="large" />
					</View>
				) : (
					<>
						<View className="items-center mb-8">
							<Text className="text-7xl mb-4">
								{selectedGame?.emoji ?? "🎮"}
							</Text>
							<Text className="text-4xl font-bold text-theme-text text-center">
								{selectedGame?.title ?? ""}
							</Text>
							<Text className="text-lg text-theme-text-secondary text-center mt-2">
								{selectedGame?.description ?? ""}
							</Text>
						</View>

						<View className="flex-row flex-wrap justify-center gap-4 mb-12">
							{templates.map((game, index) => (
								<Pressable
									key={game.id}
									onPress={() => setSelectedGameIndex(index)}
									className={`p-4 rounded-2xl items-center justify-center border-2 ${selectedGameIndex === index ? "bg-theme-surface border-theme-primary" : "bg-theme-surface/50 border-transparent"}`}
									style={{ width: "45%" }}
								>
									<Text className="text-3xl mb-2">{game.emoji}</Text>
									<Text
										className={`font-bold text-center ${selectedGameIndex === index ? "text-theme-text" : "text-theme-text-secondary"}`}
									>
										{game.title}
									</Text>
								</Pressable>
							))}
						</View>
					</>
				)}
			</ScrollView>

			<View className="w-full max-w-sm self-center gap-4">
				<Pressable
					onPress={handleHostGame}
					disabled={isCreating || isLoading || !selectedGame}
					className={`w-full bg-theme-primary p-4 rounded-xl items-center flex-row justify-center gap-3 active:opacity-90 ${isCreating || isLoading ? "opacity-70" : ""}`}
				>
					{isCreating ? (
						<ActivityIndicator color="white" />
					) : (
						<>
							<Ionicons name="add-circle-outline" size={24} color="white" />
							<Text className="text-white text-xl font-bold">Host Game</Text>
						</>
					)}
				</Pressable>

				<Pressable
					onPress={() => router.push("/party/join")}
					disabled={isCreating}
					className="w-full bg-theme-surface p-4 rounded-xl items-center flex-row justify-center gap-3 active:opacity-90 border border-theme-border"
				>
					<Ionicons name="people-outline" size={24} color="white" />
					<Text className="text-theme-text text-xl font-bold">Join Game</Text>
				</Pressable>
			</View>
		</View>
	);
}
