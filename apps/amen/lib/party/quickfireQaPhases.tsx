import { Text, View } from "react-native";
import { ChoiceGrid } from "@/components/party/ChoiceGrid";
import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { parseJson } from "./parseSharedData";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const QUICKFIRE_ACCENT = "#eab308";
const CORRECT_GREEN = "#22c55e";

type RevealResult = {
	playerId: string;
	answer: string | null;
	isCorrect: boolean;
	points: number;
	speedBonus: number;
	streakBonus: number;
};

type ScoreEntry = {
	playerName: string;
	score: number;
};

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseOptions(value: unknown): string[] {
	const parsed = parseJson<unknown[]>(value, []);
	if (!Array.isArray(parsed)) {
		return [];
	}

	return parsed
		.filter((option): option is string => typeof option === "string")
		.map((option) => option.trim())
		.filter((option) => option.length > 0);
}

function parseRevealResults(value: unknown): RevealResult[] {
	const parsed = parseJson<unknown[]>(value, []);
	if (!Array.isArray(parsed)) {
		return [];
	}

	const results: RevealResult[] = [];
	for (const entry of parsed) {
		if (typeof entry !== "object" || entry === null) {
			continue;
		}

		const shape = entry as {
			playerId?: unknown;
			answer?: unknown;
			isCorrect?: unknown;
			points?: unknown;
			speedBonus?: unknown;
			streakBonus?: unknown;
		};

		if (typeof shape.playerId !== "string") {
			continue;
		}

		results.push({
			playerId: shape.playerId,
			answer: typeof shape.answer === "string" ? shape.answer : null,
			isCorrect: shape.isCorrect === true,
			points: asNumber(shape.points),
			speedBonus: asNumber(shape.speedBonus),
			streakBonus: asNumber(shape.streakBonus),
		});
	}

	return results;
}

function parseScoreboard(value: unknown): ScoreEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const rows: ScoreEntry[] = [];
	for (const entry of value) {
		if (typeof entry !== "object" || entry === null) {
			continue;
		}

		const shape = entry as {
			playerName?: unknown;
			name?: unknown;
			score?: unknown;
		};
		const playerName =
			typeof shape.playerName === "string"
				? shape.playerName
				: typeof shape.name === "string"
					? shape.name
					: "Player";

		rows.push({
			playerName,
			score: asNumber(shape.score),
		});
	}

	return rows;
}

function playerNameFor(
	roomState: PhaseRendererProps["roomState"],
	playerId: string,
): string {
	const player = roomState.players.find(
		(candidate) => candidate.id === playerId,
	);
	return player?.name ?? playerId;
}

function QuestionPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
	roomState,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const prompt = asString(sharedData.prompt, "Get ready for the next question");
	const options = parseOptions(sharedData.optionsJson);
	const questionIndex = asNumber(sharedData.questionIndex, 0) + 1;
	const totalQuestions = Math.max(1, asNumber(sharedData.totalQuestions, 1));
	const timerSeconds = Math.max(
		0,
		asNumber(
			sharedData.timerRemaining,
			activeInputRequest?.request.timeLimit ?? 0,
		),
	);
	const answeredCount = asNumber(
		sharedData.answerCount,
		asNumber(sharedData.answersReceived, 0),
	);

	return (
		<PhaseShell
			round={questionIndex}
			totalRounds={totalQuestions}
			title="Quickfire Q&A"
			subtitle="Answer fast for bigger points"
			accentColor={QUICKFIRE_ACCENT}
			isHost={isHost}
		>
			<View className="w-full items-center">
				<Timer seconds={timerSeconds} size="large" />
			</View>
			<PromptCard text={prompt} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<>
					<View
						className="w-full rounded-xl border p-4 mb-4"
						style={{ borderColor: QUICKFIRE_ACCENT }}
					>
						<Text className="text-theme-text text-center text-base font-semibold">
							Live answers: {answeredCount}/{roomState.players.length}
						</Text>
					</View>
					<ChoiceGrid
						choices={options}
						onSelect={() => undefined}
						disabled
						columns={options.length > 2 ? 2 : 1}
						accentColor={QUICKFIRE_ACCENT}
					/>
					<HostWaitCard
						message="Players are locking in answers..."
						accentColor={QUICKFIRE_ACCENT}
					/>
				</>
			) : activeInputRequest?.request.type === "choice" ? (
				<ChoiceGrid
					choices={options}
					onSelect={(index) => {
						sendInput(options[index] ?? "");
					}}
					columns={options.length > 2 ? 2 : 1}
					accentColor={QUICKFIRE_ACCENT}
				/>
			) : (
				<HostWaitCard
					message="Waiting for the next question..."
					accentColor={QUICKFIRE_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role, roomState }: PhaseRendererProps) {
	const isHost = role === "host";
	const correctAnswer = asString(
		sharedData.correctAnswer,
		"No answer provided",
	);
	const results = parseRevealResults(sharedData.resultsJson);

	const rows = results.map((result) => {
		const playerName = playerNameFor(roomState, result.playerId);
		const answerText = result.answer ?? "No answer";
		const detail = result.isCorrect
			? `Correct +${result.points} (speed +${result.speedBonus}, streak +${result.streakBonus})`
			: "Incorrect";

		return {
			label: `${playerName}: ${answerText}`,
			detail,
			highlight: result.isCorrect,
		};
	});

	return (
		<PhaseShell
			title="Reveal"
			subtitle="See who answered correctly"
			accentColor={QUICKFIRE_ACCENT}
			isHost={isHost}
		>
			<View
				className="w-full rounded-2xl border bg-theme-surface p-4 mb-4"
				style={{ borderColor: CORRECT_GREEN }}
			>
				<Text
					className="text-center text-sm font-semibold"
					style={{ color: CORRECT_GREEN }}
				>
					CORRECT ANSWER
				</Text>
				<Text
					className="text-center font-bold text-2xl mt-1"
					style={{ color: CORRECT_GREEN }}
				>
					{correctAnswer}
				</Text>
			</View>
			<ResultRevealCard
				title="Player Results"
				rows={rows.length > 0 ? rows : [{ label: "No answers recorded yet." }]}
				isHost={isHost}
			/>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const parsedJsonScoreboard = parseJson<unknown[]>(
		sharedData.scoreboardJson,
		[],
	);
	const fallbackScoreboard = Array.isArray(sharedData.scoreboard)
		? sharedData.scoreboard
		: [];
	const scoreboard = parseScoreboard(
		parsedJsonScoreboard.length > 0 ? parsedJsonScoreboard : fallbackScoreboard,
	);

	return (
		<PhaseShell
			title="Final Scores"
			subtitle="Quickfire results"
			accentColor={QUICKFIRE_ACCENT}
			isHost={isHost}
		>
			{scoreboard.length > 0 ? (
				<Scoreboard
					data={scoreboard}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			) : (
				<HostWaitCard
					message="Calculating final scores..."
					accentColor={QUICKFIRE_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

export function registerQuickfireQaPhases() {
	registerGamePhases("quickfire-qa", {
		question: QuestionPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
	});
}
