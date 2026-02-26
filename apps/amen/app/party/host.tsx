import { Ionicons } from "@expo/vector-icons";
import {
	GameSettingsSheet,
	LobbyCountdown,
	PartyProvider,
	PlayerChip,
	useParty,
} from "@slopcade/party";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAudioManager } from "@/lib/audio/AudioManager";

function HostLobbyContent({
	code,
	hostToken,
}: {
	code: string;
	hostToken: string;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const {
		roomState,
		players,
		sendStartGame,
		connectionStatus,
		gameConfig,
		setGameConfig,
	} = useParty();
	const { templateTitle, minPlayers } = useLocalSearchParams<{
		templateTitle: string;
		minPlayers: string;
	}>();

	const gameName = templateTitle || "Party Game";
	const requiredPlayers = Number(minPlayers) || 3;
	const [showCountdown, setShowCountdown] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const prevPlayerCount = useRef(players.length);

	useEffect(() => {
		if (roomState?.phase === "playing") {
			router.replace({
				pathname: "/party/play",
				params: { code, role: "host", hostToken },
			});
		}
	}, [roomState?.phase, code, hostToken, router]);

	useEffect(() => {
		if (players.length > prevPlayerCount.current) {
			getAudioManager().playSfx("player-join");
		}
		prevPlayerCount.current = players.length;
	}, [players.length]);

	const handleShare = async () => {
		try {
			await Share.share({
				message: `Join my ${gameName} game! Code: ${code}`,
			});
		} catch (error) {
			console.error(error);
		}
	};

	const canStart = players.length >= requiredPlayers;

	return (
		<View
			className="flex-1 bg-theme-background"
			style={{
				paddingTop: insets.top,
				paddingBottom: insets.bottom,
			}}
		>
			<GameSettingsSheet
				visible={showSettings}
				config={gameConfig}
				onChange={setGameConfig}
				onClose={() => setShowSettings(false)}
			/>

			{showCountdown && <LobbyCountdown onComplete={() => sendStartGame()} />}

			<View className="flex-row justify-between items-center px-8 py-4 z-10">
				<Pressable
					onPress={() => router.back()}
					className="p-3 rounded-full bg-theme-surface/50 active:opacity-80"
				>
					<Ionicons name="arrow-back" size={28} color="white" />
				</Pressable>

				<View className="items-center">
					<Text className="text-theme-text-secondary text-sm font-medium uppercase tracking-widest">
						Playing
					</Text>
					<Text className="text-theme-text text-2xl font-bold font-serif">
						{gameName}
					</Text>
				</View>

				<Pressable
					onPress={() => setShowSettings(true)}
					className="p-3 rounded-full bg-theme-surface/50 active:opacity-80"
				>
					<Ionicons name="settings-outline" size={28} color="white" />
				</Pressable>
			</View>

			<View className="flex-1 flex-row items-center justify-center gap-12 px-12 pb-8">
				<Animated.View
					entering={FadeInDown.delay(300).springify()}
					className="flex-1 items-center justify-center gap-8"
				>
					<View className="items-center gap-2">
						<Text className="text-theme-text-secondary text-2xl font-medium">
							Join at
						</Text>
						<Text className="text-theme-primary text-4xl font-bold tracking-tight">
							amen.games
						</Text>
					</View>

					<View className="items-center gap-4">
						<Text className="text-theme-text-secondary text-xl font-medium">
							Room Code
						</Text>
						<Pressable
							onPress={handleShare}
							className="bg-theme-surface px-10 py-6 rounded-3xl border-2 border-theme-border active:scale-95 transition-transform"
						>
							<Text className="text-8xl font-black text-theme-primary tracking-widest font-mono">
								{code}
							</Text>
						</Pressable>
					</View>

					<View
						className={`px-4 py-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500/20" : "bg-red-500/20"}`}
					>
						<Text
							className={`text-sm font-bold ${connectionStatus === "connected" ? "text-green-400" : "text-red-400"}`}
						>
							{connectionStatus.toUpperCase()}
						</Text>
					</View>
				</Animated.View>

				<View className="flex-1 h-full max-h-[85%] bg-theme-surface/30 rounded-3xl border border-theme-border/50 overflow-hidden flex-col">
					<View className="p-6 border-b border-theme-border/50 bg-theme-surface/50 flex-row justify-between items-center">
						<Text className="text-2xl font-bold text-theme-text font-serif">
							Fellowship
						</Text>
						<View className="bg-theme-primary/20 px-4 py-2 rounded-full">
							<Text className="text-theme-primary text-lg font-bold">
								{players.length} / {requiredPlayers}+
							</Text>
						</View>
					</View>

					<ScrollView
						className="flex-1 p-6"
						contentContainerStyle={{ paddingBottom: 100 }}
					>
						{players.length === 0 ? (
							<View className="py-20 items-center opacity-50">
								<Ionicons name="people-outline" size={64} color="white" />
								<Text className="text-theme-text-secondary text-xl text-center mt-4">
									Waiting for players...
								</Text>
							</View>
						) : (
							<View className="flex-row flex-wrap justify-center gap-6">
								{players.map((player, index) => (
									<PlayerChip
										key={player.id}
										name={player.name}
										avatarId={player.avatar}
										isHost={false}
										index={index}
									/>
								))}
							</View>
						)}
					</ScrollView>

					<View className="p-6 bg-gradient-to-t from-theme-background to-transparent pt-8">
						<Pressable
							onPress={() => setShowCountdown(true)}
							disabled={!canStart}
							className={`w-full bg-theme-primary p-5 rounded-2xl items-center flex-row justify-center gap-3 shadow-lg ${!canStart ? "opacity-50 grayscale" : "active:scale-95"}`}
						>
							<Ionicons name="play" size={28} color="white" />
							<Text className="text-white text-2xl font-bold">
								{canStart ? "Start Game" : `Need ${requiredPlayers} Players`}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</View>
	);
}

export default function PartyHostScreen() {
	const params = useLocalSearchParams<{
		code: string;
		hostToken: string;
		templateId: string;
		templateTitle: string;
		minPlayers: string;
	}>();

	if (!params.code || !params.hostToken) {
		return (
			<View className="flex-1 bg-theme-background items-center justify-center">
				<Text className="text-theme-error">Missing room info</Text>
			</View>
		);
	}

	const hostRole = "host" as const;

	return (
		<PartyProvider
			code={params.code}
			role={hostRole}
			hostToken={params.hostToken}
		>
			<HostLobbyContent code={params.code} hostToken={params.hostToken} />
		</PartyProvider>
	);
}
