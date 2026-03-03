import { Stack } from "expo-router";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentTonePicker } from "@/components/settings/ContentTonePicker";
import { VolumeSlider } from "@/components/settings/VolumeSlider";
import { useAppSettings } from "@/lib/settings/useAppSettings";

export default function GameSettingsScreen() {
	const { settings, updateSetting, resetSettings } = useAppSettings();

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
			<Stack.Screen
				options={{
					title: "Settings",
					headerStyle: { backgroundColor: "#0f0f0f" },
					headerTintColor: "#FFFDF7",
					headerTitleStyle: { fontFamily: "Lora-Bold" },
					headerBackTitle: "",
				}}
			/>

			<ScrollView className="flex-1 px-6 py-4">
				<View className="mb-8">
					<View className="items-center mb-4">
						<Text className="text-theme-text font-serif text-xl mt-2 font-bold">
							Audio
						</Text>
					</View>

					<VolumeSlider
						label="Music"
						value={settings.musicVolume}
						onChange={(v) => updateSetting("musicVolume", v)}
					/>
					<VolumeSlider
						label="Sound Effects"
						value={settings.sfxVolume}
						onChange={(v) => updateSetting("sfxVolume", v)}
					/>
					<VolumeSlider
						label="Voice Narration"
						value={settings.narrationVolume}
						onChange={(v) => updateSetting("narrationVolume", v)}
					/>
				</View>

				<View className="mb-8">
					<View className="items-center mb-4">
						<Text className="text-theme-text font-serif text-xl mt-2 font-bold">
							Accessibility
						</Text>
					</View>

					<View className="flex-row justify-between items-center mb-6">
						<Text className="text-theme-text font-medium text-base">
							Captions
						</Text>
						<Switch
							value={settings.captionsEnabled}
							onValueChange={(v) => updateSetting("captionsEnabled", v)}
							trackColor={{ false: "#1a1a1a", true: "#f97316" }}
							thumbColor="#FFFDF7"
						/>
					</View>

					<View className="mb-4">
						<Text className="text-theme-text font-medium text-base mb-3">
							Font Size
						</Text>
						<View className="flex-row gap-2">
							{(["small", "medium", "large"] as const).map((size) => (
								<Pressable
									key={size}
									onPress={() => updateSetting("fontSize", size)}
									className={`flex-1 py-2 rounded-full border items-center ${
										settings.fontSize === size
											? "bg-theme-primary border-theme-primary"
											: "bg-transparent border-theme-primary"
									}`}
								>
									<Text
										className={`font-medium capitalize ${
											settings.fontSize === size
												? "text-theme-background"
												: "text-theme-text"
										}`}
									>
										{size}
									</Text>
								</Pressable>
							))}
						</View>
					</View>
				</View>

				<View className="mb-8">
					<View className="items-center mb-4">
						<Text className="text-theme-text font-serif text-xl mt-2 font-bold">
							Content
						</Text>
					</View>

					<View className="mb-4">
						<Text className="text-theme-text font-medium text-base mb-3">
							Content Tone
						</Text>
						<ContentTonePicker
							value={settings.contentTone}
							onChange={(v) => updateSetting("contentTone", v)}
						/>
						<Text className="text-theme-text-secondary text-sm mt-2 italic">
							Adjusts prompts and pacing to fit your group vibe.
						</Text>
					</View>
				</View>

				<View className="mb-8">
					<View className="items-center mb-4">
						<Text className="text-theme-text font-serif text-xl mt-2 font-bold">
							Gameplay
						</Text>
					</View>

					<View className="mb-6">
						<Text className="text-theme-text font-medium text-base mb-3">
							Default Rounds
						</Text>
						<View className="flex-row gap-2">
							{([3, 5, 7] as const).map((rounds) => (
								<Pressable
									key={rounds}
									onPress={() => updateSetting("defaultRounds", rounds)}
									className={`flex-1 py-2 rounded-full border items-center ${
										settings.defaultRounds === rounds
											? "bg-theme-primary border-theme-primary"
											: "bg-transparent border-theme-primary"
									}`}
								>
									<Text
										className={`font-medium ${
											settings.defaultRounds === rounds
												? "text-theme-background"
												: "text-theme-text"
										}`}
									>
										{rounds} Rounds
									</Text>
								</Pressable>
							))}
						</View>
					</View>

					<View className="flex-row justify-between items-center">
						<View className="flex-1 mr-4">
							<Text className="text-theme-text font-medium text-base">
								Audience Mode
							</Text>
							<Text className="text-theme-text-secondary text-sm mt-1">
								Allow spectators to join and influence the game
							</Text>
						</View>
						<Switch
							value={settings.audienceMode}
							onValueChange={(v) => updateSetting("audienceMode", v)}
							trackColor={{ false: "#1a1a1a", true: "#f97316" }}
							thumbColor="#FFFDF7"
						/>
					</View>
				</View>

				<Pressable
					onPress={resetSettings}
					className="mb-12 py-3 border border-theme-border rounded-xl items-center active:opacity-70"
				>
					<Text className="text-theme-text-secondary font-medium">
						Reset to Defaults
					</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}
