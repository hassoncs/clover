import { ActivityIndicator, Text, View } from "react-native";
import { BuzzerInput } from "@/components/party/BuzzerInput";
import { InvestmentInput } from "@/components/party/InvestmentInput";
import { MatchingInput } from "@/components/party/MatchingInput";
import { MicInput } from "@/components/party/MicInput";
import { WheelInput } from "@/components/party/WheelInput";
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

	if (activeInputRequest?.request.type === "mic") {
		return (
			<MicInput
				onSubmit={(data) => sendInput(data)}
				timeLimit={activeInputRequest.request.timeLimit}
				prompt={activeInputRequest.request.prompt}
			/>
		);
	}

	if (activeInputRequest?.request.type === "investment") {
		const options = (activeInputRequest.request.options ||
			[]) as unknown as Array<{
			id: string;
			label: string;
		}>;
		const totalBudget =
			(activeInputRequest.request.metadata?.totalBudget as number) || 10000;
		return (
			<InvestmentInput
				options={options}
				totalBudget={totalBudget}
				onSubmit={(allocations) => sendInput(allocations)}
				timeLimit={activeInputRequest.request.timeLimit}
			/>
		);
	}

	if (activeInputRequest?.request.type === "matching") {
		const players = (activeInputRequest.request.metadata?.players ||
			[]) as Array<{ id: string; name: string }>;
		const roles = (activeInputRequest.request.metadata?.roles || []) as Array<{
			id: string;
			label: string;
		}>;
		return (
			<MatchingInput
				players={players}
				roles={roles}
				onSubmit={(assignments) => sendInput(assignments)}
				timeLimit={activeInputRequest.request.timeLimit}
			/>
		);
	}

	if (activeInputRequest?.request.type === "wheel") {
		const slices = (activeInputRequest.request.metadata?.slices ||
			[]) as Array<{
			id: string;
			label: string;
			color: string;
		}>;
		const seed = activeInputRequest.request.metadata?.seed as
			| number
			| undefined;
		const autoSpin = activeInputRequest.request.metadata?.autoSpin as
			| boolean
			| undefined;
		return (
			<WheelInput
				slices={slices}
				seed={seed}
				autoSpin={autoSpin}
				onSpinComplete={(result) => sendInput(result)}
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
