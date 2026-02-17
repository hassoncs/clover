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

const AVAILABLE_GAMES = [
	{
		id: "crowd-comedy",
		name: "Crowd Comedy",
		description: "The party game where you write the punchlines!",
		icon: "game-controller" as const,
		color: "#A855F7",
	},
	{
		id: "chroma-clues",
		name: "Chroma Clues",
		description: "A color-guessing party game. Give word clues!",
		icon: "color-palette" as const,
		color: "#EC4899",
	},
	{
		id: "punchline-duel",
		name: "Punchline Duel",
		description: "Head-to-head comedy battles. Two answers enter, one wins!",
		icon: "flash" as const,
		color: "#F59E0B",
	},
	{
		id: "quiplash",
		name: "Quiplash",
		description: "Fill-in-the-blank comedy. Submit answers, vote head-to-head!",
		icon: "chatbubbles" as const,
		color: "#10B981",
	},
	{
		id: "heads-up",
		name: "Heads Up",
		description: "Guess the word on the TV while your friends give clues!",
		icon: "person" as const,
		color: "#EF4444",
	},
];

export default function PartyIndexScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [isCreating, setIsCreating] = useState(false);
	const [selectedGameIndex, setSelectedGameIndex] = useState(0);

	const selectedGame = AVAILABLE_GAMES[selectedGameIndex];

	const handleHostGame = async () => {
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
				<View className="items-center mb-8">
					<Ionicons
						name={selectedGame.icon}
						size={80}
						color={selectedGame.color}
						className="mb-4"
					/>
					<Text className="text-4xl font-bold text-theme-text text-center">
						{selectedGame.name}
					</Text>
					<Text className="text-lg text-theme-text-secondary text-center mt-2">
						{selectedGame.description}
					</Text>
				</View>

				<View className="flex-row flex-wrap justify-center gap-4 mb-12">
					{AVAILABLE_GAMES.map((game, index) => (
						<Pressable
							key={game.id}
							onPress={() => setSelectedGameIndex(index)}
							className={`p-4 rounded-2xl items-center justify-center border-2 ${selectedGameIndex === index ? "bg-theme-surface border-theme-primary" : "bg-theme-surface/50 border-transparent"}`}
							style={{ width: "45%" }}
						>
							<Ionicons
								name={game.icon}
								size={32}
								color={selectedGameIndex === index ? game.color : "#666"}
								className="mb-2"
							/>
							<Text
								className={`font-bold text-center ${selectedGameIndex === index ? "text-theme-text" : "text-theme-text-secondary"}`}
							>
								{game.name}
							</Text>
						</Pressable>
					))}
				</View>
			</ScrollView>

			<View className="w-full max-w-sm self-center gap-4">
				<Pressable
					onPress={handleHostGame}
					disabled={isCreating}
					className={`w-full bg-theme-primary p-4 rounded-xl items-center flex-row justify-center gap-3 active:opacity-90 ${isCreating ? "opacity-70" : ""}`}
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
