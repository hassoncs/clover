import { Ionicons } from "@expo/vector-icons";
import { AmenGrainOverlay, PatternBackground } from "@slopcade/ui/amen";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameHallCarousel } from "@/components/browse/GameHallCarousel";
import { useBrowsePartyGames } from "@/hooks/useBrowsePartyGames";
import { createPartyRoom } from "@/lib/party/api";

export default function BrowseScreen() {
	const router = useRouter();
	const [launching, setLaunching] = useState<string | null>(null);
	const [launchError, setLaunchError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { templates, isLoading, refetch } = useBrowsePartyGames();

	useEffect(() => {
		if (templates.length > 0 && !selectedId) {
			setSelectedId(templates[0].id);
		}
	}, [templates, selectedId]);

	const handlePlay = async (
		templateId: string,
		templateTitle: string,
		minPlayers: number,
	) => {
		try {
			setLaunching(templateTitle);
			setLaunchError(null);
			const { code, hostToken } = await createPartyRoom(templateId, minPlayers);
			router.push({
				pathname: "/party/host",
				params: {
					code,
					hostToken,
					templateId,
					templateTitle,
					minPlayers: String(minPlayers),
				},
			});
		} catch (err) {
			setLaunchError(
				err instanceof Error ? err.message : "Failed to create room",
			);
		} finally {
			setLaunching(null);
		}
	};

	const selectedTemplate = templates.find((t) => t.id === selectedId);

	return (
		<View className="flex-1 bg-[#1B3A6B]">
			<PatternBackground
				pattern="dots"
				color="rgba(255, 255, 255, 0.05)"
				style={StyleSheet.absoluteFill}
			/>
			<AmenGrainOverlay />

			<SafeAreaView className="flex-1" edges={["top", "bottom"]}>
				<Modal transparent animationType="fade" visible={!!launching}>
					<View className="flex-1 bg-black/60 items-center justify-center">
						<View className="bg-theme-surface rounded-2xl p-8 items-center gap-4 mx-8">
							<ActivityIndicator
								size="large"
								color="rgb(var(--color-theme-primary))"
							/>
							<Text className="text-theme-text font-semibold text-lg text-center">
								Starting {launching}…
							</Text>
							<Text className="text-theme-text-secondary text-sm text-center">
								Setting up your room
							</Text>
						</View>
					</View>
				</Modal>

				<View className="px-6 py-4 flex-row justify-between items-center z-10">
					<View>
						<Text
							className="text-[#C9A84C] text-3xl font-serif tracking-widest text-center"
							style={{ fontFamily: "Lora_700Bold" }}
						>
							A·MEN
						</Text>
						<Text className="text-[#FFFDF7]/60 text-xs uppercase tracking-[0.2em] text-center -mt-1">
							The Hall
						</Text>
					</View>
					<Pressable
						onPress={() => router.push("/settings/game-settings")}
						className="p-2 -mr-2 bg-[#0F2347]/50 rounded-full"
						accessibilityLabel="Settings"
					>
						<Ionicons name="settings-outline" size={24} color="#C9A84C" />
					</Pressable>
				</View>

				<View className="flex-1 justify-center gap-8">
					{isLoading ? (
						<ActivityIndicator size="large" color="#C9A84C" />
					) : (
						<>
							<GameHallCarousel
								templates={templates}
								selectedId={selectedId}
								onSelect={setSelectedId}
							/>

							<View className="mx-6 p-6 bg-[#0F2347] rounded-2xl border border-white/10 items-center gap-4">
								{selectedTemplate ? (
									<>
										<Text className="text-[#FFFDF7] text-lg font-serif text-center">
											{selectedTemplate.title}
										</Text>
										<Text className="text-[#FFFDF7]/60 text-center text-sm">
											{selectedTemplate.minPlayers}-
											{selectedTemplate.maxPlayers} Players
										</Text>

										{launchError && (
											<Text className="text-red-400 text-center text-sm">
												{launchError}
											</Text>
										)}

										<Pressable
											onPress={() =>
												handlePlay(
													selectedTemplate.id,
													selectedTemplate.title,
													selectedTemplate.minPlayers,
												)
											}
											className="bg-[#C9A84C] px-8 py-3 rounded-full active:opacity-90"
										>
											<Text className="text-[#0F2347] font-bold uppercase tracking-wider">
												Play Now
											</Text>
										</Pressable>
									</>
								) : (
									<Text className="text-[#FFFDF7]/40">Select a game</Text>
								)}
							</View>
						</>
					)}
				</View>
			</SafeAreaView>
		</View>
	);
}
