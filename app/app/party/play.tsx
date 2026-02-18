import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PartyGameRenderer } from "@/components/party/PartyGameRenderer";
import { registerAboutYouBluffPhases } from "@/lib/party/aboutYouBluffPhases";
import { registerChainReactionPhases } from "@/lib/party/chainReactionPhases";
import { registerChromaCluesPhases } from "@/lib/party/chromaCluesPhases";
import { registerConsensusMinePhases } from "@/lib/party/consensusMinePhases";
import { registerDefaultPhases } from "@/lib/party/defaultPhases";
import { registerDrawfulAnimatePhases } from "@/lib/party/drawfulAnimatePhases";
import { registerHeadsUpPhases } from "@/lib/party/headsUpPhases";
import { PartyProvider, useParty } from "@/lib/party/PartyContext";
import { registerPercentPanicPhases } from "@/lib/party/percentPanicPhases";
import { registerPunchlineFerryPhases } from "@/lib/party/punchlineFerryPhases";
import { registerQuickfireQaPhases } from "@/lib/party/quickfireQaPhases";
import { registerRivalRosterPhases } from "@/lib/party/rivalRosterPhases";
import { registerShirtClashPhases } from "@/lib/party/shirtClashPhases";
import { registerSketchBluffPhases } from "@/lib/party/sketchBluffPhases";
import { registerSpectrumGuessPhases } from "@/lib/party/spectrumGuessPhases";

registerDefaultPhases();
registerChromaCluesPhases();
registerAboutYouBluffPhases();
registerChainReactionPhases();
registerConsensusMinePhases();
registerDrawfulAnimatePhases();
registerHeadsUpPhases();
registerPercentPanicPhases();
registerPunchlineFerryPhases();
registerQuickfireQaPhases();
registerRivalRosterPhases();
registerShirtClashPhases();
registerSketchBluffPhases();
registerSpectrumGuessPhases();

function GameContent() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { roomState, connectionStatus } = useParty();

	if (!roomState) {
		return (
			<View className="flex-1 items-center justify-center bg-theme-background">
				<ActivityIndicator size="large" color="#A855F7" />
				<Text className="text-theme-text mt-4">Connecting...</Text>
			</View>
		);
	}

	const roomPhase = roomState.phase;

	if (roomPhase === "lobby") {
		return (
			<View className="flex-1 items-center justify-center">
				<Text className="text-theme-text text-lg">
					Waiting for host to start...
				</Text>
			</View>
		);
	}

	return (
		<View
			className="flex-1 bg-theme-background p-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View className="w-full flex-row justify-between items-center mb-6">
				<Pressable
					onPress={() => router.replace("/party")}
					className="p-2 rounded-full bg-theme-surface active:opacity-80"
				>
					<Ionicons name="close" size={24} color="white" />
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

			<PartyGameRenderer />
		</View>
	);
}

export default function PartyPlayScreen() {
	const params = useLocalSearchParams<{
		code: string;
		name?: string;
		role: "host" | "player";
		hostToken?: string;
	}>();

	if (!params.code || !params.role) {
		return (
			<View className="flex-1 bg-theme-background items-center justify-center">
				<Text className="text-theme-error">Missing game info</Text>
			</View>
		);
	}

	return (
		// eslint-disable-next-line jsx-a11y/aria-role
		<PartyProvider
			code={params.code}
			role={params.role}
			name={params.name}
			hostToken={params.hostToken}
		>
			<GameContent />
		</PartyProvider>
	);
}
