import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createPartyRoom } from "@/lib/party/api";

export default function PartyIndexScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [isCreating, setIsCreating] = useState(false);

	const handleHostGame = async () => {
		try {
			setIsCreating(true);
			const { code, hostToken } = await createPartyRoom();
			router.push({
				pathname: "/party/host",
				params: { code, hostToken },
			});
		} catch (error) {
			console.error("Failed to create room:", error);
			setIsCreating(false);
		}
	};

	return (
		<View
			className="flex-1 bg-theme-background items-center justify-center p-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View
				className="absolute top-4 left-4 z-10"
				style={{ top: insets.top + 16 }}
			>
				<Pressable
					onPress={() => router.back()}
					className="p-2 rounded-full bg-theme-surface active:opacity-80"
				>
					<Ionicons name="arrow-back" size={24} color="white" />
				</Pressable>
			</View>

			<View className="items-center mb-12">
				<Ionicons
					name="game-controller"
					size={64}
					color="#A855F7"
					className="mb-4"
				/>
				<Text className="text-4xl font-bold text-theme-text text-center">
					Crowd Comedy
				</Text>
				<Text className="text-lg text-theme-text-secondary text-center mt-2">
					The party game where you write the punchlines!
				</Text>
			</View>

			<View className="w-full max-w-sm gap-4">
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
