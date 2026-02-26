import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { AnswerInput } from "../components/AnswerInput";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { AnswerRevealSequence } from "../components/results/AnswerRevealSequence";
import { FinalPodium } from "../components/results/FinalPodium";
import { RoundScoreBoard } from "../components/results/RoundScoreBoard";
import { VoteList } from "../components/VoteList";
import { usePartyNarration } from "./usePartyNarration";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const TRUTH_ACCENT = "#10b981";
const WINNER_NARRATION = "Well done, good and faithful servant!";

type ScoreboardEntry = { id: string; name: string; score: number };
type RevealAnswer = {
	text: string;
	authorId: string;
	type: "truth" | "player" | "house";
};
type VoteEntry = { voterId: string; voteIndex: number; type: string };
type RevealResults = {
	truth: string;
	answers: RevealAnswer[];
	votes: VoteEntry[];
	pointsEarned: Record<string, number>;
};

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseScoreboard(value: unknown): ScoreboardEntry[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(e): e is ScoreboardEntry =>
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
	const answers = Array.isArray(r.answers) ? (r.answers as RevealAnswer[]) : [];
	const votes = Array.isArray(r.votes) ? (r.votes as VoteEntry[]) : [];
	const pointsEarned =
		typeof r.pointsEarned === "object" && r.pointsEarned !== null
			? (r.pointsEarned as Record<string, number>)
			: {};
	return {
		truth: asString(r.truth),
		answers,
		votes,
		pointsEarned,
	};
}

function WritingLiesPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = asNumber(sharedData.round, 1);
	const prompt = asString(
		sharedData.prompt,
		activeInputRequest?.request.prompt ?? "Write a convincing lie...",
	);
	const timerSeconds = asNumber(
		sharedData.timerRemaining,
		activeInputRequest?.request.timeLimit ?? 0,
	);

	return (
		<PhaseShell
			round={round}
			title="Scrolls of Truth"
			subtitle="Write a convincing falsehood"
			accentColor={TRUTH_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={prompt} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Scribes are writing their lies..."
					accentColor={TRUTH_ACCENT}
				/>
			) : activeInputRequest?.request.type === "text" ? (
				<>
					<Text className="font-inter text-amen-cream/60 text-sm text-center mb-2">
						Write a false but convincing answer ({timerSeconds}s)
					</Text>
					<AnswerInput onSubmit={sendInput} disabled={false} />
				</>
			) : (
				<HostWaitCard
					message="Waiting for the writing phase..."
					accentColor={TRUTH_ACCENT}
				/>
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
	const rawAnswers = Array.isArray(sharedData.answers)
		? (sharedData.answers as string[])
		: [];

	const options = rawAnswers.map((text, index) => ({
		id: String(index),
		text,
	}));

	const canVote =
		role === "player" && activeInputRequest?.request.type === "choice";

	return (
		<PhaseShell
			title="Scrolls of Truth"
			subtitle="Discern truth from fiction"
			accentColor={TRUTH_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text="Which answer is the truth? Choose wisely!"
				size={isHost ? "large" : "normal"}
			/>
			{isHost ? (
				<>
					<View className="w-full gap-2 mb-4">
						{rawAnswers.map((text) => (
							<View
								key={text}
								className="bg-amen-navy-800 rounded-xl p-4 border border-amen-gold/10"
							>
								<Text className="font-inter text-amen-cream text-base">
									{text}
								</Text>
							</View>
						))}
					</View>
					<HostWaitCard
						message="Disciples are discerning..."
						accentColor={TRUTH_ACCENT}
					/>
				</>
			) : canVote ? (
				<VoteList
					options={options}
					onVote={(id) => sendInput(Number(id))}
					disabled={false}
				/>
			) : (
				<HostWaitCard
					message="Waiting to begin voting..."
					accentColor={TRUTH_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role, roomState }: PhaseRendererProps) {
	const isHost = role === "host";
	const results = parseRevealResults(sharedData.results);

	if (!results) {
		return (
			<PhaseShell
				title="Scrolls of Truth"
				subtitle="Revealing the truth..."
				accentColor={TRUTH_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Unrolling the scroll..."
					accentColor={TRUTH_ACCENT}
				/>
			</PhaseShell>
		);
	}

	const revealAnswers = results.answers.map((a) => {
		let authorName = "House Decoy";
		if (a.type === "truth") {
			authorName = "The Truth";
		} else if (a.type === "player") {
			const player = roomState.players.find((p) => p.id === a.authorId);
			authorName = player?.name ?? a.authorId.slice(0, 6);
		}
		const votesForThis = results.votes.filter(
			(v) =>
				results.answers[v.voteIndex] &&
				results.answers[v.voteIndex].text === a.text,
		).length;
		return {
			text: a.text,
			authorName,
			voteCount: votesForThis,
		};
	});

	const sorted = [...revealAnswers].sort((a) =>
		a.authorName === "The Truth" ? -1 : 1,
	);

	return (
		<PhaseShell
			title="Scrolls of Truth"
			subtitle="The truth is revealed!"
			accentColor={TRUTH_ACCENT}
			isHost={isHost}
		>
			<View
				className="w-full p-5 rounded-2xl border-2 mb-4 items-center"
				style={{ borderColor: TRUTH_ACCENT }}
			>
				<Text
					className="font-inter text-xs uppercase tracking-widest mb-1"
					style={{ color: TRUTH_ACCENT }}
				>
					The Truth
				</Text>
				<Text className="font-lora text-amen-cream text-xl text-center font-bold">
					{results.truth}
				</Text>
			</View>
			<ScrollView className="w-full" style={{ maxHeight: 300 }}>
				<AnswerRevealSequence answers={sorted} />
			</ScrollView>
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

export function registerTruthTrapPhases() {
	registerGamePhases("truth-trap", {
		writing_lies: WritingLiesPhase,
		voting: VotingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
