import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PartyProvider, useParty } from "@/lib/party/PartyContext";

const GAME_NAMES: Record<string, string> = {
	"crowd-comedy": "Crowd Comedy",
	"chroma-clues": "Chroma Clues",
};

function HostLobbyContent({
	code,
	hostToken,
}: {
	code: string;
	hostToken: string;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { roomState, players, sendStartGame, connectionStatus } = useParty();
	const { template } = useLocalSearchParams<{ template: string }>();

	const gameName = GAME_NAMES[template || "crowd-comedy"] || "Crowd Comedy";

	useEffect(() => {
		if (roomState?.phase === "playing") {
			router.replace({
				pathname: "/party/play",
				params: { code, role: "host", hostToken },
			});
		}
	}, [roomState?.phase, code, hostToken, router]);

	const handleShare = async () => {
		try {
			await Share.share({
				message: `Join my ${gameName} game! Code: ${code}`,
			});
		} catch (error) {
			console.error(error);
		}
	};

	const canStart = players.length >= 3;

	return (
		<View
			className="flex-1 bg-theme-background items-center p-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View className="w-full flex-row justify-between items-center mb-8">
				<Pressable
					onPress={() => router.back()}
					className="p-2 rounded-full bg-theme-surface active:opacity-80"
				>
					<Ionicons name="arrow-back" size={24} color="white" />
				</Pressable>
				<View
					className={`px-3 py-1 rounded-full ${connectionStatus === "connected" ? "bg-green-500/20" : "bg-red-500/20"}`}
				>
					<Text
						className={`text-xs font-bold ${connectionStatus === "connected" ? "text-green-400" : "text-red-400"}`}
					>
						{connectionStatus.toUpperCase()}
					</Text>
				</View>
			</View>

			<View className="items-center mb-12 w-full">
				<Text className="text-theme-text-secondary text-lg mb-2">
					Room Code
				</Text>
				<Pressable
					onPress={handleShare}
					className="flex-row items-center gap-3 bg-theme-surface px-8 py-4 rounded-2xl border border-theme-border active:opacity-80"
				>
					<Text className="text-5xl font-bold text-theme-text tracking-widest">
						{code}
					</Text>
					<Ionicons
						name="copy-outline"
						size={24}
						className="text-theme-text-secondary"
					/>
				</Pressable>
			</View>

			<View className="w-full flex-1 mb-8">
				<View className="flex-row justify-between items-end mb-4 px-2">
					<Text className="text-xl font-bold text-theme-text">Players</Text>
					<Text className="text-theme-text-secondary">
						{players.length} joined
					</Text>
				</View>

				<ScrollView className="w-full bg-theme-surface rounded-xl border border-theme-border flex-1">
					{players.length === 0 ? (
						<View className="p-8 items-center">
							<Text className="text-theme-text-secondary text-center">
								Waiting for players to join...
							</Text>
						</View>
					) : (
						players.map((player, index) => (
							<View
								key={player.id}
								className={`p-4 flex-row items-center gap-3 ${index !== players.length - 1 ? "border-b border-theme-border" : ""}`}
							>
								<View className="w-8 h-8 rounded-full bg-theme-primary items-center justify-center">
									<Text className="text-white font-bold">
										{player.name[0].toUpperCase()}
									</Text>
								</View>
								<Text className="text-theme-text text-lg font-medium">
									{player.name}
								</Text>
							</View>
						))
					)}
				</ScrollView>
			</View>

			<View className="w-full gap-2">
				{!canStart && (
					<Text className="text-theme-warning text-center text-sm">
						Need at least 3 players to start
					</Text>
				)}
				<Pressable
					onPress={sendStartGame}
					disabled={!canStart}
					className={`w-full bg-theme-primary p-4 rounded-xl items-center flex-row justify-center gap-2 active:opacity-90 ${!canStart ? "opacity-50" : ""}`}
				>
					<Ionicons name="play" size={24} color="white" />
					<Text className="text-white text-xl font-bold">Start Game</Text>
				</Pressable>
			</View>
		</View>
	);
}

export default function PartyHostScreen() {
	const params = useLocalSearchParams<{ code: string; hostToken: string }>();

	if (!params.code || !params.hostToken) {
		return (
			<View className="flex-1 bg-theme-background items-center justify-center">
				<Text className="text-theme-error">Missing room info</Text>
			</View>
		);
	}

	const content = (
		<PartyProvider
			code={params.code}
			role="host" // eslint-disable-line jsx-a11y/aria-role
			hostToken={params.hostToken}
		>
			<HostLobbyContent code={params.code} hostToken={params.hostToken} />
		</PartyProvider>
	);

	return content;
}
