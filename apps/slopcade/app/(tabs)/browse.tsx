import { Ionicons } from "@expo/vector-icons";
import { GameHallCarousel } from "@slopcade/ui";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameDetailPanel } from "@/components/browse/GameDetailPanel";
import { GameHallTile } from "@/components/browse/GameHallTile";
import { useBrowsePartyGames } from "@/hooks/useBrowsePartyGames";

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
		console.warn("[Browse] Party mode not available in Slopcade creator app");
	};

	const handleHowToPlay = () => {
		if (!selectedTemplate) return;
		router.push({
			pathname: "/how-to-play/[templateId]",
			params: { templateId: selectedTemplate.id },
		});
	};

	return (
		<View className="flex-1" style={{ backgroundColor: "#0A0A1A" }}>
			<SafeAreaView className="flex-1" edges={["top", "bottom"]}>
				<Modal transparent animationType="fade" visible={!!launching}>
					<View className="flex-1 bg-black/70 items-center justify-center">
						<View
							className="rounded-2xl p-8 items-center gap-4 mx-8"
							style={{ backgroundColor: "#1A1A2E", minWidth: 260 }}
						>
							<ActivityIndicator size="large" color="#6366F1" />
							<Text
								className="text-white text-lg text-center"
								style={{ fontFamily: "Lora-Bold" }}
							>
								Starting {launching}…
							</Text>
							<Text
								className="text-center text-sm"
								style={{ color: "rgba(255,255,255,0.5)" }}
							>
								Setting up your room
							</Text>
						</View>
					</View>
				</Modal>

				<View
					className="px-6 py-4 flex-row justify-between items-center"
					style={{ zIndex: 10 }}
				>
					<View>
						<Text
							className="text-3xl text-center"
							style={{
								color: "#A5B4FC",
								fontFamily: "Lora-Bold",
								letterSpacing: 6,
							}}
						>
							SLOPCADE
						</Text>
						<Text
							className="text-xs uppercase text-center -mt-1"
							style={{ color: "rgba(165, 180, 252, 0.5)", letterSpacing: 3 }}
						>
							The Arcade
						</Text>
					</View>
					<Pressable
						onPress={() => router.push("/(tabs)/profile")}
						className="p-2 -mr-2"
						accessibilityLabel="Profile"
					>
						<Ionicons name="person-circle-outline" size={28} color="#A5B4FC" />
					</Pressable>
				</View>

				<View className="flex-1 justify-center">
					{isLoading ? (
						<ActivityIndicator size="large" color="#6366F1" />
					) : (
						<GameHallCarousel
							items={templates}
							selectedId={selectedId}
							onSelect={setSelectedId}
							getImageUrl={(t) => t.thumbnailUrl}
							tileWidth={320}
							tileHeight={256}
							reflectionColor="#0A0A1A"
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
