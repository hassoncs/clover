import { Ionicons } from "@expo/vector-icons";
import { GameHallCarousel } from "@slopcade/ui";
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
import { GameDetailPanel } from "@/components/browse/GameDetailPanel";
import { GameHallTile } from "@/components/browse/GameHallTile";
import { useBrowsePartyGames } from "@/hooks/useBrowsePartyGames";
import { createPartyRoom } from "@/lib/party/api";

export default function BrowseScreen() {
	const router = useRouter();
	const [launching, setLaunching] = useState<string | null>(null);
	const [launchError, setLaunchError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { templates, isLoading } = useBrowsePartyGames();

	useEffect(() => {
		if (templates.length > 0 && !selectedId) {
			setSelectedId(templates[0].id);
		}
	}, [templates, selectedId]);

	const selectedTemplate = templates.find((t) => t.id === selectedId);

	const handlePlay = async () => {
		if (!selectedTemplate) return;
		try {
			setLaunching(selectedTemplate.title);
			setLaunchError(null);
			const { code, hostToken } = await createPartyRoom(
				selectedTemplate.id,
				selectedTemplate.minPlayers,
			);
			router.push({
				pathname: "/party/host",
				params: {
					code,
					hostToken,
					templateId: selectedTemplate.id,
					templateTitle: selectedTemplate.title,
					minPlayers: String(selectedTemplate.minPlayers),
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

	const handleHowToPlay = () => {
		if (!selectedTemplate) return;
		router.push({
			pathname: "/how-to-play/[templateId]",
			params: { templateId: selectedTemplate.id },
		});
	};

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

				<View className="px-6 py-1 flex-row justify-between items-center z-10">
					<View>
						<Text
							className="text-[#C9A84C] text-3xl tracking-widest text-center"
							style={{ fontFamily: "Cinzel_900Black", letterSpacing: 6 }}
						>
							AMEN
						</Text>
						<Text className="text-[#FFFDF7]/60 text-xs uppercase tracking-[0.2em] text-center -mt-1">
							The Hall
						</Text>
					</View>
					<View className="flex-row items-center gap-1">
						<Pressable
							onPress={() => router.push("/(tabs)/profile")}
							className="p-2"
							accessibilityLabel="Profile"
						>
							<Ionicons
								name="person-circle-outline"
								size={28}
								color="#C9A84C"
							/>
						</Pressable>
						<Pressable
							onPress={() => router.push("/settings/game-settings")}
							className="p-2 -mr-2"
							accessibilityLabel="Settings"
						>
							<Ionicons name="settings-outline" size={24} color="#C9A84C" />
						</Pressable>
					</View>
				</View>

				<View className="flex-1">
					{isLoading ? (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator size="large" color="#C9A84C" />
						</View>
					) : (
						<GameHallCarousel
							items={templates}
							selectedId={selectedId}
							onSelect={setSelectedId}
							getImageUrl={(t) => t.thumbnailUrl}
							renderTile={(template, selected, onPress) => (
								<GameHallTile
									template={template}
									selected={selected}
									onPress={onPress}
								/>
							)}
						/>
					)}
				</View>

				{launchError && (
					<Text className="text-red-400 text-center text-sm px-6 mb-2">
						{launchError}
					</Text>
				)}

				<GameDetailPanel
					template={selectedTemplate ?? null}
					onPlay={handlePlay}
					onHowToPlay={handleHowToPlay}
				/>
			</SafeAreaView>
		</View>
	);
}
