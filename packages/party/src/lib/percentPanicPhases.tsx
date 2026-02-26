import { Text, View } from "react-native";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { ResultRevealCard } from "../components/ResultRevealCard";
import { Scoreboard } from "../components/Scoreboard";
import { Timer } from "../components/Timer";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const ACCENT = "#06b6d4";
const AGENT_PERCENT_CHOICES = [
	"0%",
	"10%",
	"20%",
	"30%",
	"40%",
	"50%",
	"60%",
	"70%",
	"80%",
	"90%",
	"100%",
];
const FALLBACK_BET_CHOICES = [
	"Higher (1x)",
	"Higher (2x)",
	"Higher (3x)",
	"Lower (1x)",
	"Lower (2x)",
	"Lower (3x)",
];

type ScoreEntry = {
	id: string;
	name: string;
	score: number;
};

type BetResult = {
	guesserId: string;
	bet: string;
	multiplier: number;
	isCorrect: boolean;
	points: number;
};

type RevealResults = {
	question: string;
	actualPercentage: number;
	agentId: string;
	agentGuess: number;
	bets: BetResult[];
	pointsEarned: Record<string, number>;
	source: string;
};

type WinnerData = {
	id: string;
	name: string;
	score: number;
};

function toRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "object" && value !== null) {
		return value as Record<string, unknown>;
	}
	return {};
}

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value.replace("%", ""));
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

function toText(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function toChoiceOptions(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
): string[] {
	if (!activeInputRequest || activeInputRequest.request.type !== "choice") {
		return [];
	}

	const requestRecord = toRecord(activeInputRequest.request);
	const rawChoices = Array.isArray(requestRecord.choices)
		? requestRecord.choices
		: Array.isArray(activeInputRequest.request.options)
			? activeInputRequest.request.options
			: [];

	return rawChoices.filter(
		(choice): choice is string => typeof choice === "string",
	);
}

function toScoreboardRows(value: unknown): ScoreEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => {
			const record = toRecord(entry);
			const id = toText(record.id);
			const name = toText(record.name, "Player");
			const score = toNumber(record.score, 0);
			if (id.length === 0) {
				return null;
			}
			return { id, name, score };
		})
		.filter((entry): entry is ScoreEntry => entry !== null);
}

function toRevealResults(value: unknown): RevealResults {
	const record = toRecord(value);
	const rawBets = Array.isArray(record.bets) ? record.bets : [];
	const bets: BetResult[] = rawBets
		.map((bet) => {
			const betRecord = toRecord(bet);
			const guesserId = toText(betRecord.guesserId);
			if (guesserId.length === 0) {
				return null;
			}
			return {
				guesserId,
				bet: toText(betRecord.bet, "Higher"),
				multiplier: Math.max(1, toNumber(betRecord.multiplier, 1)),
				isCorrect: betRecord.isCorrect === true,
				points: toNumber(betRecord.points, 0),
			};
		})
		.filter((bet): bet is BetResult => bet !== null);

	const pointsEarnedRecord = toRecord(record.pointsEarned);
	const pointsEarned: Record<string, number> = {};
	for (const [playerId, points] of Object.entries(pointsEarnedRecord)) {
		pointsEarned[playerId] = toNumber(points, 0);
	}

	return {
		question: toText(record.question, "No question provided"),
		actualPercentage: toNumber(record.actualPercentage, 0),
		agentId: toText(record.agentId),
		agentGuess: toNumber(record.agentGuess, 0),
		bets,
		pointsEarned,
		source: toText(record.source, "Unknown source"),
	};
}

function playerNameFor(
	roomState: PhaseRendererProps["roomState"],
	playerId: string,
): string {
	const player = roomState.players.find(
		(candidate) => candidate.id === playerId,
	);
	return player?.name ?? playerId.slice(0, 6);
}

function scoreRowsFromRecord(
	roomState: PhaseRendererProps["roomState"],
	scores: Record<string, number>,
) {
	return roomState.players.map((player) => ({
		playerName: player.name,
		score: toNumber(scores[player.id], 0),
	}));
}

function HostQuestionPanel({
	question,
	title,
	detail,
	timerSeconds,
}: {
	question: string;
	title: string;
	detail: string;
	timerSeconds: number;
}) {
	return (
		<View
			className="w-full mb-4 rounded-2xl border bg-theme-surface p-4"
			style={{ borderColor: ACCENT }}
		>
			<Text className="text-center text-theme-text-secondary font-semibold tracking-[1px] text-xs">
				{title}
			</Text>
			<Text className="text-center text-theme-text text-2xl font-black mt-2">
				{question}
			</Text>
			<Text className="text-center text-theme-text-secondary mt-2">
				{detail}
			</Text>
			<View className="items-center mt-3">
				<Timer seconds={timerSeconds} size="large" />
			</View>
		</View>
	);
}

function AgentGuessPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = toNumber(sharedData.round, 1);
	const question = toText(sharedData.question, "No question available");
	const agentName = toText(sharedData.agentName, "Agent");
	const agentId = toText(sharedData.agentId);
	const timerSeconds = toNumber(activeInputRequest?.request.timeLimit, 30);

	return (
		<PhaseShell
			round={round}
			title="Agent Guess"
			subtitle={`${agentName} sets the baseline guess`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostQuestionPanel
					question={question}
					title="QUESTION"
					detail={`${agentName} (${agentId || "unknown"}) is choosing a percentage`}
					timerSeconds={timerSeconds}
				/>
			)}
			<PromptCard text={question} size={isHost ? "large" : "normal"} />
			{!isHost && activeInputRequest?.request.type === "choice" ? (
				<View className="w-full gap-4">
					<Text className="text-center text-theme-text-secondary text-base">
						Pick a percentage from 0% to 100%
					</Text>
					<ChoiceGrid
						choices={AGENT_PERCENT_CHOICES}
						onSelect={(index) => {
							const parsed = toNumber(AGENT_PERCENT_CHOICES[index], 0);
							sendInput(parsed);
						}}
						columns={2}
						accentColor={ACCENT}
					/>
				</View>
			) : (
				<HostWaitCard
					message={`${agentName} is locking in their guess...`}
					accentColor={ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function GroupBetPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const question = toText(sharedData.question, "No question available");
	const agentGuess = toNumber(sharedData.agentGuess, 0);
	const timerSeconds = toNumber(activeInputRequest?.request.timeLimit, 30);
	const betChoices = toChoiceOptions(activeInputRequest);
	const choices = betChoices.length > 0 ? betChoices : FALLBACK_BET_CHOICES;

	return (
		<PhaseShell
			title="Group Bet"
			subtitle="Will the real number be higher or lower?"
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostQuestionPanel
					question={question}
					title="BETTING WINDOW"
					detail={`Baseline guess is ${agentGuess}%`}
					timerSeconds={timerSeconds}
				/>
			)}
			<PromptCard text={question} size={isHost ? "large" : "normal"} />
			<View
				className="w-full rounded-2xl border bg-theme-surface p-5 mb-4"
				style={{ borderColor: ACCENT }}
			>
				<Text className="text-center text-theme-text-secondary font-semibold">
					AGENT GUESS
				</Text>
				<Text
					className="text-center text-5xl font-black mt-2"
					style={{ color: ACCENT }}
				>
					{agentGuess}%
				</Text>
			</View>
			{!isHost && activeInputRequest?.request.type === "choice" ? (
				<ChoiceGrid
					choices={choices}
					onSelect={(index) => sendInput(index)}
					columns={2}
					accentColor={ACCENT}
				/>
			) : (
				<HostWaitCard
					message="Players are betting Higher/Lower with multipliers..."
					accentColor={ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealGauge({ actual, guess }: { actual: number; guess: number }) {
	const clampedActual = Math.min(100, Math.max(0, actual));
	const clampedGuess = Math.min(100, Math.max(0, guess));

	return (
		<View className="w-full rounded-2xl border border-theme-border bg-theme-surface p-4">
			<Text className="text-theme-text text-center font-semibold mb-3">
				Actual vs Agent Guess
			</Text>
			<View className="w-full h-6 rounded-full bg-theme-background overflow-hidden mb-2">
				<View
					className="h-full"
					style={{ width: `${clampedActual}%`, backgroundColor: ACCENT }}
				/>
			</View>
			<View className="w-full h-3 rounded-full bg-theme-background overflow-hidden mb-3">
				<View
					className="h-full bg-theme-text-secondary"
					style={{ width: `${clampedGuess}%` }}
				/>
			</View>
			<View className="flex-row justify-between">
				<Text className="text-theme-text">Actual: {clampedActual}%</Text>
				<Text className="text-theme-text-secondary">
					Guess: {clampedGuess}%
				</Text>
			</View>
		</View>
	);
}

function RevealPhase({ sharedData, roomState, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const results = toRevealResults(sharedData.results);
	const scoresRecord = toRecord(sharedData.scores);
	const scores: Record<string, number> = {};
	for (const [playerId, score] of Object.entries(scoresRecord)) {
		scores[playerId] = toNumber(score, 0);
	}

	const correctRows = results.bets
		.filter((bet) => bet.isCorrect)
		.map((bet) => ({
			label: `${playerNameFor(roomState, bet.guesserId)} bet ${bet.bet} (${bet.multiplier}x)`,
			detail: `Correct +${bet.points}`,
			highlight: true,
		}));

	const missedRows = results.bets
		.filter((bet) => !bet.isCorrect)
		.map((bet) => ({
			label: `${playerNameFor(roomState, bet.guesserId)} bet ${bet.bet} (${bet.multiplier}x)`,
			detail: `Missed (${bet.points} pts)`,
		}));

	return (
		<PhaseShell
			title="Reveal"
			subtitle="The true percentage is in"
			accentColor={ACCENT}
			isHost={isHost}
		>
			<PromptCard text={results.question} size={isHost ? "large" : "normal"} />
			<RevealGauge
				actual={results.actualPercentage}
				guess={results.agentGuess}
			/>
			<View className="w-full mt-4 gap-4">
				<ResultRevealCard
					title="Answer"
					rows={[
						{
							label: `${results.actualPercentage}%`,
							detail: `Source: ${results.source}`,
							highlight: true,
						},
					]}
					isHost={isHost}
				/>
				<ResultRevealCard
					title="Correct Bets"
					rows={
						correctRows.length > 0
							? correctRows
							: [{ label: "No correct bets this round" }]
					}
					isHost={isHost}
				/>
				<ResultRevealCard
					title="Missed Bets"
					rows={
						missedRows.length > 0
							? missedRows
							: [{ label: "Nobody missed this round" }]
					}
					isHost={isHost}
				/>
			</View>
			<View className="w-full mt-4">
				<Scoreboard
					data={scoreRowsFromRecord(roomState, scores)}
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const scoreboard = toScoreboardRows(sharedData.scoreboard);

	return (
		<PhaseShell
			title="Scores"
			subtitle="Round standings"
			accentColor={ACCENT}
			isHost={isHost}
		>
			<Scoreboard
				data={scoreboard.map((entry) => ({
					playerName: entry.name,
					score: entry.score,
				}))}
				size={isHost ? "large" : "normal"}
			/>
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const winnerRecord = toRecord(sharedData.winner);
	const winner: WinnerData = {
		id: toText(winnerRecord.id),
		name: toText(winnerRecord.name, "Unknown"),
		score: toNumber(winnerRecord.score, 0),
	};
	const scoreboard = toScoreboardRows(sharedData.scoreboard);

	return (
		<PhaseShell
			title="Winner"
			subtitle={`${winner.name} closes out Percent Panic`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="Champion"
				rows={[
					{
						label: winner.name,
						detail: `${winner.score} points`,
						highlight: true,
					},
				]}
				isHost={isHost}
			/>
			<View className="w-full mt-4">
				<Scoreboard
					data={scoreboard.map((entry) => ({
						playerName: entry.name,
						score: entry.score,
					}))}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

export function registerPercentPanicPhases() {
	registerGamePhases("percent-panic", {
		agent_guess: AgentGuessPhase,
		group_bet: GroupBetPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
