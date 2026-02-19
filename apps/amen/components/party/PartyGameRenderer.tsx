import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { BuzzerInput } from "@/components/party/BuzzerInput";
import { CaptionOverlay } from "@/components/party/CaptionOverlay";
import { InvestmentInput } from "@/components/party/InvestmentInput";
import { MatchingInput } from "@/components/party/MatchingInput";
import { MicInput } from "@/components/party/MicInput";
import { WheelInput } from "@/components/party/WheelInput";
import { getAudioManager } from "@/lib/audio/AudioManager";
import { useParty } from "@/lib/party/PartyContext";
import { getPhaseRenderer } from "@/lib/party/phaseRegistry";
import { useAppSettings } from "@/lib/settings/useAppSettings";

const FONT_SCALE_MAP = {
	small: 0.85,
	medium: 1.0,
	large: 1.2,
} as const;

export function PartyGameRenderer() {
	const { roomState, activeInputRequest, sendInput, role } = useParty();
	const { settings } = useAppSettings();

	const fontScale = FONT_SCALE_MAP[settings.fontSize];
	const fontScaleStyle =
		fontScale !== 1 ? { transform: [{ scale: fontScale }] } : undefined;

	useEffect(() => {
		const audioManager = getAudioManager();
		audioManager.setVolumes(
			settings.musicVolume,
			settings.sfxVolume,
			settings.narrationVolume,
		);
	}, [settings.musicVolume, settings.sfxVolume, settings.narrationVolume]);

	const captionText =
		(activeInputRequest?.request.metadata?.caption as string) ?? null;
	const showCaption = settings.captionsEnabled && !!captionText;

	if (!roomState) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator size="large" color="#A855F7" />
				<CaptionOverlay text={captionText} visible={showCaption} />
			</View>
		);
	}

	const sharedData = (roomState.sharedData || {}) as any;
	const gamePhase = sharedData.phase ?? sharedData.qaPhase;

	if (activeInputRequest?.request.type === "buzzer") {
		return (
			<Animated.View
				key="buzzer"
				entering={FadeIn}
				className="flex-1 w-full"
				style={fontScaleStyle}
			>
				<BuzzerInput
					onPress={() => sendInput(true)}
					disabled={!activeInputRequest}
					prompt={activeInputRequest.request.prompt}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
			</Animated.View>
		);
	}

	if (activeInputRequest?.request.type === "mic") {
		return (
			<Animated.View
				key="mic"
				entering={FadeIn}
				className="flex-1 w-full"
				style={fontScaleStyle}
			>
				<MicInput
					onSubmit={(data) => sendInput(data)}
					timeLimit={activeInputRequest.request.timeLimit}
					prompt={activeInputRequest.request.prompt}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
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
				style={fontScaleStyle}
			>
				<InvestmentInput
					options={options}
					totalBudget={totalBudget}
					onSubmit={(allocations) => sendInput(allocations)}
					timeLimit={activeInputRequest.request.timeLimit}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
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
			<Animated.View
				key="matching"
				entering={FadeIn}
				className="flex-1 w-full"
				style={fontScaleStyle}
			>
				<MatchingInput
					players={players}
					roles={roles}
					onSubmit={(assignments) => sendInput(assignments)}
					timeLimit={activeInputRequest.request.timeLimit}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
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
			<Animated.View
				key="wheel"
				entering={FadeIn}
				className="flex-1 w-full"
				style={fontScaleStyle}
			>
				<WheelInput
					slices={slices}
					seed={seed}
					autoSpin={autoSpin}
					onSpinComplete={(result) => sendInput(result)}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
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
				style={fontScaleStyle}
			>
				<PhaseComponent
					roomState={roomState}
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
					sendInput={sendInput}
					role={role}
				/>
				<CaptionOverlay text={captionText} visible={showCaption} />
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
			<CaptionOverlay text={captionText} visible={showCaption} />
		</View>
	);
}
