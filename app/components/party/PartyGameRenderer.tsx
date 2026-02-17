import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
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
			<Animated.View key="buzzer" entering={FadeIn} className="flex-1 w-full">
				<BuzzerInput
					onPress={() => sendInput(true)}
					disabled={!activeInputRequest}
					prompt={activeInputRequest.request.prompt}
				/>
			</Animated.View>
		);
	}

	if (activeInputRequest?.request.type === "mic") {
		return (
			<Animated.View key="mic" entering={FadeIn} className="flex-1 w-full">
				<MicInput
					onSubmit={(data) => sendInput(data)}
					timeLimit={activeInputRequest.request.timeLimit}
					prompt={activeInputRequest.request.prompt}
				/>
			</Animated.View>
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
			<Animated.View
				key="investment"
				entering={FadeIn}
				className="flex-1 w-full"
			>
				<InvestmentInput
					options={options}
					totalBudget={totalBudget}
					onSubmit={(allocations) => sendInput(allocations)}
					timeLimit={activeInputRequest.request.timeLimit}
				/>
			</Animated.View>
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
			<Animated.View key="matching" entering={FadeIn} className="flex-1 w-full">
				<MatchingInput
					players={players}
					roles={roles}
					onSubmit={(assignments) => sendInput(assignments)}
					timeLimit={activeInputRequest.request.timeLimit}
				/>
			</Animated.View>
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
			<Animated.View key="wheel" entering={FadeIn} className="flex-1 w-full">
				<WheelInput
					slices={slices}
					seed={seed}
					autoSpin={autoSpin}
					onSpinComplete={(result) => sendInput(result)}
				/>
			</Animated.View>
		);
	}

	const gameTemplate = sharedData.gameTemplate || "default";
	const PhaseComponent = getPhaseRenderer(gameTemplate, gamePhase);

	if (PhaseComponent) {
		return (
			<Animated.View
				key={gamePhase}
				entering={FadeIn.duration(500)}
				className="flex-1 w-full"
			>
				<PhaseComponent
					roomState={roomState}
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
					sendInput={sendInput}
					role={role}
				/>
			</Animated.View>
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
