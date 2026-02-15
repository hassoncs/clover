import { ActivityIndicator, Text, View } from "react-native";
import { BuzzerInput } from "@/components/party/BuzzerInput";
import { useParty } from "@/lib/party/PartyContext";
import { getPhaseRenderer } from "@/lib/party/phaseRegistry";

export function PartyGameRenderer() {
	const { roomState, activeInputRequest, sendInput, role } = useParty();

	if (!roomState) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator size="large" color="#A855F7" />
			</View>
		);
	}

	const sharedData = (roomState.sharedData || {}) as any;
	const gamePhase = sharedData.phase;

	if (activeInputRequest?.request.type === "buzzer") {
		return (
			<BuzzerInput
				onPress={() => sendInput(true)}
				disabled={!activeInputRequest}
				prompt={activeInputRequest.request.prompt}
			/>
		);
	}

	const gameTemplate = sharedData.gameTemplate || "default";
	const PhaseComponent = getPhaseRenderer(gameTemplate, gamePhase);

	if (PhaseComponent) {
		return (
			<PhaseComponent
				roomState={roomState}
				sharedData={sharedData}
				activeInputRequest={activeInputRequest}
				sendInput={sendInput}
				role={role}
			/>
		);
	}

	return (
		<View className="flex-1 items-center justify-center">
			<Text className="text-theme-text text-lg">
				Waiting for game to start...
			</Text>
			{gamePhase && (
				<Text className="text-theme-text-secondary text-sm mt-2">
					Phase: {gamePhase}
				</Text>
			)}
		</View>
	);
}
