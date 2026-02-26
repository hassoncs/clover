import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AnswerInput } from "../components/AnswerInput";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { AnswerRevealSequence } from "../components/results/AnswerRevealSequence";
import { FinalPodium } from "../components/results/FinalPodium";
import { RoundScoreBoard } from "../components/results/RoundScoreBoard";
import { VoteTally } from "../components/results/VoteTally";
import { Timer } from "../components/Timer";
import { VoteList } from "../components/VoteList";
import { usePartyNarration } from "./usePartyNarration";
import { parseJson } from "./parseSharedData";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const QUIPLASH_ACCENT = "#C9A84C";
const WINNER_NARRATION = "Well done, good and faithful servant!";

type QuiplashScoreboardEntry = { playerName: string; score: number };
type QuiplashRevealEntry = { id: string; text: string };
type QuiplashResultEntry = {
	text: string;
	authorName: string;
	voteCount: number;
	points: number;
};
type VoteOption = { id: string; text: string };

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseScoreboard(value: unknown): QuiplashScoreboardEntry[] {
	const parsed = parseJson<unknown[]>(value, []);
	if (!Array.isArray(parsed)) return [];
	return parsed
		.filter(
			(e): e is { playerName: string; score: number } =>
				typeof e === "object" &&
				e !== null &&
				typeof (e as Record<string, unknown>).playerName === "string",
		)
		.map((e) => ({
			playerName: e.playerName,
			score: asNumber((e as Record<string, unknown>).score),
		}));
}

function AnsweringPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = asNumber(sharedData.roundNumber, 1);
	const totalRounds = asNumber(sharedData.totalRounds, 3);
	const timerSeconds = asNumber(
		sharedData.timerRemaining,
		activeInputRequest?.request.timeLimit ?? 0,
	);

	return (
		<PhaseShell
			round={round}
			totalRounds={totalRounds}
			title="The Fellowship Table"
			subtitle="Fill in a funny answer"
			accentColor={QUIPLASH_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard
				text={asString(
					sharedData.promptText,
					activeInputRequest?.request.prompt ?? "Answer your prompts!",
				)}
				size={isHost ? "large" : "normal"}
			/>
			{isHost ? (
				<HostWaitCard
					message="Players are writing their answers..."
					accentColor={QUIPLASH_ACCENT}
				/>
			) : activeInputRequest?.request.type === "text" ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message="Waiting for the next phase..."
					accentColor={QUIPLASH_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const promptText = asString(sharedData.promptText, "");
	const rawAnswers = parseJson<QuiplashRevealEntry[]>(
		sharedData.answersJson,
		[],
	);

	const answers = rawAnswers.map((a, index) => ({
		text: asString(a.text, "(no answer)"),
		authorName: `Answer ${String.fromCharCode(65 + index)}`,
		voteCount: 0,
	}));

	return (
		<PhaseShell
			title="The Fellowship Table"
			subtitle="Behold the answers!"
			accentColor={QUIPLASH_ACCENT}
			isHost={isHost}
		>
			{promptText.length > 0 && (
				<PromptCard text={promptText} size={isHost ? "large" : "normal"} />
			)}
			<AnswerRevealSequence answers={answers} />
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
	const promptText = asString(sharedData.promptText, "");
	const voteOptions = parseJson<VoteOption[]>(sharedData.voteOptionsJson, []);
	const timerSeconds = asNumber(
		sharedData.timerRemaining,
		activeInputRequest?.request.timeLimit ?? 0,
	);

	const options = voteOptions.map((o) => ({ id: o.id, text: o.text }));

	return (
		<PhaseShell
			title="The Fellowship Table"
			subtitle="Vote for the best answer"
			accentColor={QUIPLASH_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			{promptText.length > 0 && (
				<PromptCard text={promptText} size={isHost ? "large" : "normal"} />
			)}
			{isHost ? (
				<HostWaitCard
					message="The congregation is voting..."
					accentColor={QUIPLASH_ACCENT}
				/>
			) : activeInputRequest?.request.type === "choice" ? (
				<VoteList
					options={options}
					onVote={(choiceId) => sendInput(choiceId)}
					disabled={false}
				/>
			) : (
				<HostWaitCard
					message="Waiting for voting to begin..."
					accentColor={QUIPLASH_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RoundResultsPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const promptText = asString(sharedData.promptText, "");
	const results = parseJson<QuiplashResultEntry[]>(sharedData.resultsJson, []);

	const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
	const maxVotes = results.reduce((max, r) => Math.max(max, r.voteCount), 0);
	const tallyAnswers = results.map((r) => ({
		text: `"${r.text}" — ${r.authorName}`,
		voteCount: r.voteCount,
		isWinner: r.voteCount === maxVotes && maxVotes > 0,
	}));

	return (
		<PhaseShell
			title="The Fellowship Table"
			subtitle="The votes are in!"
			accentColor={QUIPLASH_ACCENT}
			isHost={isHost}
		>
			{promptText.length > 0 && (
				<PromptCard text={promptText} size={isHost ? "large" : "normal"} />
			)}
			<VoteTally answers={tallyAnswers} totalVotes={totalVotes} />
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const scoreboard = parseScoreboard(sharedData.scoreboardJson);
	const round = asNumber(sharedData.roundNumber, 1);

	const players = scoreboard.map((e) => ({
		name: e.playerName,
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

	const scoreboard = parseScoreboard(sharedData.scoreboardJson);

	const players = scoreboard.map((e) => {
		const roomPlayer = roomState.players.find((p) => p.name === e.playerName);
		return {
			name: e.playerName,
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

export function registerQuiplashPhases() {
	registerGamePhases("quiplash", {
		answering: AnsweringPhase,
		reveal: RevealPhase,
		voting: VotingPhase,
		round_results: RoundResultsPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
