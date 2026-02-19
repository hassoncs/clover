import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { ChoiceGrid } from "@/components/party/ChoiceGrid";
import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { FinalPodium } from "@/components/party/results/FinalPodium";
import { RoundScoreBoard } from "@/components/party/results/RoundScoreBoard";
import { Timer } from "@/components/party/Timer";
import { usePartyNarration } from "@/lib/party/usePartyNarration";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const HALF_ACCENT = "#6366f1";
const WINNER_NARRATION = "Well done, good and faithful servant!";

type HalfScoreboardEntry = { id: string; name: string; score: number };
type VoterEntry = {
	id: string;
	name: string;
	choice: number;
	earned: number;
};
type RevealResults = {
	drafterId: string;
	prompt: string;
	draft: string;
	countA: number;
	countB: number;
	pointsEarned: number;
	voters: VoterEntry[];
};

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseScoreboard(value: unknown): HalfScoreboardEntry[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(e): e is HalfScoreboardEntry =>
				typeof e === "object" &&
				e !== null &&
				typeof (e as Record<string, unknown>).name === "string",
		)
		.map((e) => ({
			id: asString((e as Record<string, unknown>).id),
			name: asString((e as Record<string, unknown>).name),
			score: asNumber((e as Record<string, unknown>).score),
		}));
}

function parseRevealResults(value: unknown): RevealResults | null {
	if (typeof value !== "object" || value === null) return null;
	const r = value as Record<string, unknown>;
	return {
		drafterId: asString(r.drafterId),
		prompt: asString(r.prompt),
		draft: asString(r.draft),
		countA: asNumber(r.countA),
		countB: asNumber(r.countB),
		pointsEarned: asNumber(r.pointsEarned),
		voters: Array.isArray(r.voters) ? (r.voters as VoterEntry[]) : [],
	};
}

function DraftingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = asNumber(sharedData.round, 1);
	const drafterName = asString(sharedData.drafterName, "The Mediator");
	const prompt = asString(
		sharedData.prompt,
		activeInputRequest?.request.prompt ?? "Complete the sentence...",
	);
	const timerSeconds = asNumber(
		sharedData.timerRemaining,
		activeInputRequest?.request.timeLimit ?? 0,
	);
	const isDrafter =
		role === "player" && activeInputRequest?.request.type === "text";

	return (
		<PhaseShell
			round={round}
			title="The Mediator"
			subtitle={`${drafterName} completes the sentence`}
			accentColor={HALF_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard text={prompt} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message={`${drafterName} is filling in the blank...`}
					accentColor={HALF_ACCENT}
				/>
			) : isDrafter ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<View className="mt-6 p-6 bg-amen-navy-800 rounded-2xl border border-amen-gold/20 items-center">
					<Text className="font-inter text-amen-cream text-center text-base">
						{drafterName} is writing — stand by to vote!
					</Text>
				</View>
			)}
		</PhaseShell>
	);
}

function VotingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const drafterName = asString(sharedData.drafterName, "The Mediator");
	const prompt = asString(sharedData.prompt, "");
	const draft = asString(sharedData.draft, "");
	const timerSeconds = asNumber(
		sharedData.timerRemaining,
		activeInputRequest?.request.timeLimit ?? 0,
	);
	const canVote =
		role === "player" && activeInputRequest?.request.type === "choice";

	const fullStatement =
		prompt.length > 0 && draft.length > 0
			? `${prompt} ${draft}`
			: draft || prompt;

	const choices = ["I'm in!", "No way!"];

	return (
		<PhaseShell
			title="The Mediator"
			subtitle="Do you agree?"
			accentColor={HALF_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<View className="w-full p-5 rounded-2xl border border-amen-gold/30 bg-amen-navy-800 mb-4">
				<Text className="font-inter text-amen-cream/60 text-xs uppercase tracking-widest mb-2">
					{drafterName} says:
				</Text>
				<Text className="font-lora text-amen-cream text-xl text-center leading-relaxed">
					"{fullStatement}"
				</Text>
			</View>
			{isHost ? (
				<HostWaitCard
					message="The congregation is voting..."
					accentColor={HALF_ACCENT}
				/>
			) : canVote ? (
				<ChoiceGrid
					choices={choices}
					onSelect={(index) => sendInput(index)}
					columns={2}
					accentColor={HALF_ACCENT}
				/>
			) : (
				<HostWaitCard
					message="Waiting for voting to begin..."
					accentColor={HALF_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const results = parseRevealResults(sharedData.results);

	if (!results) {
		return (
			<PhaseShell
				title="The Mediator"
				subtitle="Tallying votes..."
				accentColor={HALF_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Computing results..."
					accentColor={HALF_ACCENT}
				/>
			</PhaseShell>
		);
	}

	const totalVoters = results.countA + results.countB;
	const splitLabel =
		results.countA === results.countB
			? "Perfect split — maximum points!"
			: results.countA > results.countB
				? `${results.countA} in, ${results.countB} out`
				: `${results.countA} in, ${results.countB} out`;

	const rows = [
		{
			label: `"${results.prompt} ${results.draft}"`,
			detail: splitLabel,
			highlight: results.countA === results.countB,
		},
		{
			label: `Points for ${asString(sharedData.drafterName, "Drafter")}`,
			detail: `+${results.pointsEarned}`,
			highlight: results.pointsEarned > 0,
		},
	];

	return (
		<PhaseShell
			title="The Mediator"
			subtitle="The votes are revealed!"
			accentColor={HALF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full flex-row justify-center gap-8 mb-4">
				<View className="items-center">
					<Text className="font-lora font-bold text-5xl text-amen-gold">
						{results.countA}
					</Text>
					<Text className="font-inter text-amen-cream/60 text-sm mt-1">
						I'm in!
					</Text>
				</View>
				<View className="w-[1px] bg-amen-gold/20 self-stretch" />
				<View className="items-center">
					<Text className="font-lora font-bold text-5xl text-amen-cream/60">
						{results.countB}
					</Text>
					<Text className="font-inter text-amen-cream/60 text-sm mt-1">
						No way!
					</Text>
				</View>
			</View>
			{totalVoters > 0 && (
				<Text className="font-inter text-amen-gold text-center text-sm mb-4">
					{totalVoters} vote{totalVoters !== 1 ? "s" : ""} cast
				</Text>
			)}
			<ResultRevealCard title="Round Result" rows={rows} isHost={isHost} />
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const scoreboard = parseScoreboard(sharedData.scoreboard);
	const round = asNumber(sharedData.round, 1);

	const players = scoreboard.map((e) => ({
		name: e.name,
		score: e.score,
		scoreDelta: 0,
	}));

	if (role === "host" || role === "player") {
		return <RoundScoreBoard players={players} round={round} />;
	}

	return null;
}

function WinnerPhase({ sharedData, roomState }: PhaseRendererProps) {
	const router = useRouter();
	const { narrate } = usePartyNarration();

	useEffect(() => {
		void narrate(WINNER_NARRATION);
	}, [narrate]);

	const scoreboard = parseScoreboard(sharedData.scoreboard);

	const players = scoreboard.map((e) => {
		const roomPlayer = roomState.players.find(
			(p) => p.id === e.id || p.name === e.name,
		);
		return {
			name: e.name,
			avatarId: roomPlayer?.avatar,
			score: e.score,
		};
	});

	return (
		<FinalPodium
			players={players}
			onPlayAgain={() => router.replace("/party")}
			onBackToHall={() => router.replace("/party")}
		/>
	);
}

export function registerHalfAndHalfPhases() {
	registerGamePhases("half-and-half", {
		drafting: DraftingPhase,
		voting: VotingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
