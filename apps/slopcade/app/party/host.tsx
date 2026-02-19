import { Ionicons } from "@expo/vector-icons";
import { useBrandConfig } from "@slopcade/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PartyProvider, useParty } from "@/lib/party/PartyContext";

function HostLobbyContent({
	code,
	hostToken,
}: {
	code: string;
	hostToken: string;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const brand = useBrandConfig();
	const { roomState, players, sendStartGame, connectionStatus } = useParty();
	const { templateTitle } = useLocalSearchParams<{ templateTitle: string }>();

	const gameName = templateTitle || "Party Game";

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
			className="flex-1 bg-theme-background items-center justify-between"
			style={{
				paddingTop: insets.top + 20,
				paddingBottom: insets.bottom + 20,
				paddingHorizontal: 40,
			}}
		>
			<View className="w-full flex-row justify-between items-center absolute top-0 left-0 right-0 p-8 z-10">
				<Pressable
					onPress={() =>
						router.canGoBack() ? router.back() : router.replace("/browse")
					}
					className="p-3 rounded-full bg-theme-surface/50 active:opacity-80"
				>
					<Ionicons name="arrow-back" size={32} color="white" />
				</Pressable>
				<View
					className={`px-4 py-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500/20" : "bg-red-500/20"}`}
				>
					<Text
						className={`text-sm font-bold ${connectionStatus === "connected" ? "text-green-400" : "text-red-400"}`}
					>
						{connectionStatus.toUpperCase()}
					</Text>
				</View>
			</View>

			<View className="flex-1 w-full flex-row items-center justify-center gap-12 mt-12">
				<Animated.View
					entering={FadeInDown.delay(300).springify()}
					className="flex-1 items-center justify-center gap-8"
				>
					<View className="items-center gap-2">
						<Text className="text-theme-text-secondary text-3xl font-medium">
							Join at
						</Text>
						<Text className="text-theme-primary text-5xl font-bold tracking-tight">
							{brand.domain}
						</Text>
					</View>

					<View className="items-center gap-4">
						<Text className="text-theme-text-secondary text-2xl font-medium">
							Room Code
						</Text>
						<Pressable
							onPress={handleShare}
							className="bg-theme-surface px-12 py-8 rounded-3xl border-2 border-theme-border active:scale-95 transition-transform"
						>
							<Text className="text-9xl font-black text-theme-text tracking-widest">
								{code}
							</Text>
						</Pressable>
					</View>
				</Animated.View>

				<View className="flex-1 h-full max-h-[80%] bg-theme-surface/30 rounded-3xl border border-theme-border/50 overflow-hidden">
					<View className="p-6 border-b border-theme-border/50 bg-theme-surface/50 flex-row justify-between items-center">
						<Text className="text-3xl font-bold text-theme-text">Players</Text>
						<View className="bg-theme-primary/20 px-4 py-2 rounded-full">
							<Text className="text-theme-primary text-xl font-bold">
								{players.length} joined
							</Text>
						</View>
					</View>

					<ScrollView
						className="flex-1 p-6"
						contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
					>
						{players.length === 0 ? (
							<View className="py-20 items-center opacity-50">
								<Ionicons name="people-outline" size={64} color="white" />
								<Text className="text-theme-text-secondary text-2xl text-center mt-4">
									Waiting for players...
								</Text>
							</View>
						) : (
							players.map((player, index) => (
								<Animated.View
									key={player.id}
									entering={FadeInUp.delay(index * 100).springify()}
									className="bg-theme-surface p-4 rounded-2xl border border-theme-border flex-row items-center gap-4"
								>
									<View className="w-12 h-12 rounded-full bg-theme-primary items-center justify-center">
										<Text className="text-white text-xl font-bold">
											{player.name[0].toUpperCase()}
										</Text>
									</View>
									<Text className="text-theme-text text-2xl font-medium">
										{player.name}
									</Text>
								</Animated.View>
							))
						)}
					</ScrollView>

					<View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-theme-background to-transparent pt-12">
						<Pressable
							onPress={sendStartGame}
							disabled={!canStart}
							className={`w-full bg-theme-primary p-6 rounded-2xl items-center flex-row justify-center gap-3 shadow-lg ${!canStart ? "opacity-50 grayscale" : "active:scale-95"}`}
						>
							<Ionicons name="play" size={32} color="white" />
							<Text className="text-white text-3xl font-bold">
								{canStart ? "Start Game" : "Need 3 Players"}
							</Text>
						</Pressable>
					</View>
				</View>
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
