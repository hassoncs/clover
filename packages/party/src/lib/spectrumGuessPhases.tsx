import { Text, View } from "react-native";
import { AnswerInput } from "../components/AnswerInput";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { ResultRevealCard } from "../components/ResultRevealCard";
import { Scoreboard } from "../components/Scoreboard";
import { Timer } from "../components/Timer";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const SPECTRUM_GUESS_ACCENT = "#d946ef";

type SpectrumScale = {
	left: string;
	right: string;
};

type GuessResult = {
	guesserId: string;
	value: number;
	points: number;
};

type RevealResults = {
	target: number;
	scale: SpectrumScale;
	responseText: string;
	subjectId: string;
	guesses: GuessResult[];
	avgGuess: number;
	creatorPoints: number;
	pointsEarned: Record<string, number>;
};

type ScoreRow = {
	id: string;
	name: string;
	score: number;
};

type WinnerRow = {
	id: string;
	name: string;
	score: number;
};

type CalibrationData = {
	phase: "calibration";
	round: number;
	subjectId: string;
	subjectName: string;
	scale: SpectrumScale;
	target: number;
};

type GuessingData = {
	phase: "guessing";
	round: number;
	scale: SpectrumScale;
	responseText: string;
	subjectName: string;
};

type RevealData = {
	phase: "reveal";
	results: RevealResults;
	scores: Record<string, number>;
};

type ScoresData = {
	phase: "scores";
	scoreboard: ScoreRow[];
};

type WinnerData = {
	phase: "winner";
	winner: WinnerRow;
	scoreboard: ScoreRow[];
};

type SpectrumMarker = {
	id: string;
	value: number;
	label?: string;
	color?: string;
	highlight?: boolean;
};

type SpectrumBarProps = {
	scale: SpectrumScale;
	markers?: SpectrumMarker[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number): number {
	if (value < 0) return 0;
	if (value > 100) return 100;
	return value;
}

function asScale(value: unknown): SpectrumScale {
	if (!isRecord(value)) {
		return { left: "Left", right: "Right" };
	}

	return {
		left: asString(value.left, "Left"),
		right: asString(value.right, "Right"),
	};
}

function asScoreboard(value: unknown): ScoreRow[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((row) => {
			if (!isRecord(row)) return null;
			return {
				id: asString(row.id),
				name: asString(row.name, "Player"),
				score: asNumber(row.score, 0),
			};
		})
		.filter((row): row is ScoreRow => row !== null);
}

function asCalibrationData(data: Record<string, unknown>): CalibrationData {
	return {
		phase: "calibration",
		round: asNumber(data.round, 1),
		subjectId: asString(data.subjectId),
		subjectName: asString(data.subjectName, "Subject"),
		scale: asScale(data.scale),
		target: clampPercent(asNumber(data.target, 50)),
	};
}

function asGuessingData(data: Record<string, unknown>): GuessingData {
	return {
		phase: "guessing",
		round: asNumber(data.round, 1),
		scale: asScale(data.scale),
		responseText: asString(data.responseText, ""),
		subjectName: asString(data.subjectName, "Subject"),
	};
}

function asRevealData(data: Record<string, unknown>): RevealData {
	const rawResults = isRecord(data.results) ? data.results : {};
	const rawGuesses = Array.isArray(rawResults.guesses)
		? rawResults.guesses
		: [];

	const guesses = rawGuesses
		.map((guess) => {
			if (!isRecord(guess)) return null;
			return {
				guesserId: asString(guess.guesserId),
				value: clampPercent(asNumber(guess.value, 50)),
				points: asNumber(guess.points, 0),
			};
		})
		.filter((guess): guess is GuessResult => guess !== null);

	const pointsEarned: Record<string, number> = {};
	if (isRecord(rawResults.pointsEarned)) {
		for (const [playerId, points] of Object.entries(rawResults.pointsEarned)) {
			pointsEarned[playerId] = asNumber(points, 0);
		}
	}

	const scores: Record<string, number> = {};
	if (isRecord(data.scores)) {
		for (const [playerId, score] of Object.entries(data.scores)) {
			scores[playerId] = asNumber(score, 0);
		}
	}

	return {
		phase: "reveal",
		results: {
			target: clampPercent(asNumber(rawResults.target, 50)),
			scale: asScale(rawResults.scale),
			responseText: asString(rawResults.responseText, ""),
			subjectId: asString(rawResults.subjectId),
			guesses,
			avgGuess: clampPercent(asNumber(rawResults.avgGuess, 50)),
			creatorPoints: asNumber(rawResults.creatorPoints, 0),
			pointsEarned,
		},
		scores,
	};
}

function asScoresData(data: Record<string, unknown>): ScoresData {
	return {
		phase: "scores",
		scoreboard: asScoreboard(data.scoreboard),
	};
}

function asWinnerData(data: Record<string, unknown>): WinnerData {
	const winnerSource = isRecord(data.winner) ? data.winner : {};
	return {
		phase: "winner",
		winner: {
			id: asString(winnerSource.id),
			name: asString(winnerSource.name, "Winner"),
			score: asNumber(winnerSource.score, 0),
		},
		scoreboard: asScoreboard(data.scoreboard),
	};
}

function playerNameFor(
	roomState: PhaseRendererProps["roomState"],
	playerId: string,
): string {
	const player = roomState.players.find(
		(candidate) => candidate.id === playerId,
	);
	if (player) return player.name;
	if (playerId.length >= 6) return playerId.slice(0, 6);
	return "Player";
}

function SpectrumBar({ scale, markers = [] }: SpectrumBarProps) {
	return (
		<View className="w-full bg-theme-surface rounded-2xl border border-theme-border p-4">
			<View className="flex-row justify-between mb-2">
				<Text className="text-theme-text-secondary font-bold text-xs uppercase tracking-wide">
					{scale.left}
				</Text>
				<Text className="text-theme-text-secondary font-bold text-xs uppercase tracking-wide">
					{scale.right}
				</Text>
			</View>
			<View className="relative h-12 justify-center">
				<View className="h-3 rounded-full border border-theme-border bg-theme-surface-elevated" />
				{markers.map((marker) => {
					const value = clampPercent(marker.value);
					return (
						<View
							key={marker.id}
							className="absolute items-center"
							style={{
								left: `${value}%`,
								top: 0,
								transform: [{ translateX: -8 }],
							}}
						>
							<View
								className="w-4 h-4 rounded-full border-2"
								style={{
									backgroundColor: marker.color ?? "#ffffff",
									borderColor: marker.highlight
										? SPECTRUM_GUESS_ACCENT
										: "#111827",
								}}
							/>
							{marker.label && (
								<Text
									className="text-[10px] text-theme-text mt-1 text-center"
									style={{ width: 56 }}
								>
									{marker.label}
								</Text>
							)}
						</View>
					);
				})}
			</View>
		</View>
	);
}

function CalibrationPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = asCalibrationData(sharedData);
	const isHost = role === "host";
	const isSubject =
		role === "player" && activeInputRequest?.request.type === "text";
	const timerSeconds = activeInputRequest?.request.timeLimit;

	const markers: SpectrumMarker[] =
		isSubject || isHost
			? [
					{
						id: "target",
						value: data.target,
						label: `${data.target}%`,
						color: SPECTRUM_GUESS_ACCENT,
						highlight: true,
					},
				]
			: [];

	return (
		<PhaseShell
			round={data.round}
			title="Calibration"
			subtitle={`${data.subjectName} is calibrating the scale`}
			timerSeconds={timerSeconds}
			accentColor={SPECTRUM_GUESS_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text={`Find a word that feels ${data.target}% between ${data.scale.left} and ${data.scale.right}.`}
				size={isHost ? "large" : "normal"}
			/>
			<SpectrumBar scale={data.scale} markers={markers} />
			<View className="w-full mt-4">
				{isSubject ? (
					<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
				) : (
					<HostWaitCard
						message={`${data.subjectName} is writing the clue...`}
						accentColor={SPECTRUM_GUESS_ACCENT}
					/>
				)}
			</View>
		</PhaseShell>
	);
}

function GuessingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = asGuessingData(sharedData);
	const isHost = role === "host";
	const isGuesser =
		role === "player" && activeInputRequest?.request.type === "choice";

	const timerSeconds = activeInputRequest?.request.timeLimit;
	const requestedChoices = Array.isArray(activeInputRequest?.request.options)
		? activeInputRequest.request.options.filter(
				(choice): choice is string => typeof choice === "string",
			)
		: [];
	const rangeChoices = [
		"0",
		"10",
		"20",
		"30",
		"40",
		"50",
		"60",
		"70",
		"80",
		"90",
		"100",
	];
	const displayChoices =
		requestedChoices.length > 0
			? rangeChoices.filter((choice) => requestedChoices.includes(choice))
			: rangeChoices;

	return (
		<PhaseShell
			round={data.round}
			title="Guess The Position"
			subtitle="Place the clue word on the spectrum"
			timerSeconds={timerSeconds}
			accentColor={SPECTRUM_GUESS_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text={data.responseText || "Waiting for clue..."}
				size={isHost ? "large" : "normal"}
			/>
			<SpectrumBar scale={data.scale} />
			<View className="w-full mt-4">
				{isHost ? (
					<HostWaitCard
						message="Players are placing guesses..."
						accentColor={SPECTRUM_GUESS_ACCENT}
					/>
				) : isGuesser ? (
					<View className="w-full gap-3">
						<Text className="text-theme-text-secondary text-center text-sm">
							Tap the closest percentage
						</Text>
						<ChoiceGrid
							choices={displayChoices}
							onSelect={(index) => {
								const value = displayChoices[index] ?? "50";
								sendInput(value);
							}}
							disabled={!activeInputRequest}
							columns={2}
							accentColor={SPECTRUM_GUESS_ACCENT}
						/>
					</View>
				) : (
					<HostWaitCard
						message="You are the subject this round. Wait for guesses."
						accentColor={SPECTRUM_GUESS_ACCENT}
					/>
				)}
			</View>
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, roomState, role }: PhaseRendererProps) {
	const data = asRevealData(sharedData);
	const isHost = role === "host";

	const markers: SpectrumMarker[] = [
		{
			id: "target",
			value: data.results.target,
			label: `Target ${data.results.target}`,
			color: SPECTRUM_GUESS_ACCENT,
			highlight: true,
		},
		{
			id: "avg",
			value: data.results.avgGuess,
			label: `Avg ${Math.round(data.results.avgGuess)}`,
			color: "#22d3ee",
		},
		...data.results.guesses.map((guess) => ({
			id: `guess-${guess.guesserId}`,
			value: guess.value,
			label: playerNameFor(roomState, guess.guesserId),
			color: "#f9a8d4",
		})),
	];

	const guessRows = data.results.guesses.map((guess) => ({
		label: playerNameFor(roomState, guess.guesserId),
		detail: `Guessed ${guess.value}%`,
		points: guess.points,
		highlight: Math.abs(guess.value - data.results.target) <= 5,
	}));

	const subjectName = playerNameFor(roomState, data.results.subjectId);
	const scoreRows = roomState.players.map((player) => ({
		label: player.name,
		detail: `Total: ${data.scores[player.id] ?? 0}`,
	}));

	return (
		<PhaseShell
			title="Reveal"
			subtitle={`${subjectName} wrote: ${data.results.responseText}`}
			accentColor={SPECTRUM_GUESS_ACCENT}
			isHost={isHost}
		>
			<SpectrumBar scale={data.results.scale} markers={markers} />
			<View className="w-full mt-4 gap-4">
				<ResultRevealCard
					title="Guesses"
					rows={
						guessRows.length > 0
							? guessRows
							: [{ label: "No guesses submitted." }]
					}
					isHost={isHost}
				/>
				<ResultRevealCard
					title="Creator Points"
					rows={[
						{
							label: subjectName,
							detail: `Average guess: ${Math.round(data.results.avgGuess)}%`,
							points: data.results.creatorPoints,
							highlight: true,
						},
					]}
					isHost={isHost}
				/>
				{isHost && <Timer seconds={6} size="large" />}
				<ResultRevealCard title="Scores" rows={scoreRows} isHost={isHost} />
			</View>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const data = asScoresData(sharedData);
	const isHost = role === "host";

	return (
		<PhaseShell
			title="Leaderboard"
			subtitle="Current standings"
			accentColor={SPECTRUM_GUESS_ACCENT}
			isHost={isHost}
		>
			<Scoreboard
				data={data.scoreboard.map((row) => ({
					playerName: row.name,
					score: row.score,
				}))}
				size={isHost ? "large" : "normal"}
			/>
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const data = asWinnerData(sharedData);
	const isHost = role === "host";

	return (
		<PhaseShell
			title="Winner"
			subtitle={`${data.winner.name} wins with ${data.winner.score} points`}
			accentColor={SPECTRUM_GUESS_ACCENT}
			isHost={isHost}
		>
			<View className="w-full items-center mb-4">
				<Text
					className={`font-bold text-center ${isHost ? "text-4xl" : "text-2xl"}`}
					style={{ color: SPECTRUM_GUESS_ACCENT }}
				>
					{data.winner.name}
				</Text>
			</View>
			<Scoreboard
				data={data.scoreboard.map((row) => ({
					playerName: row.name,
					score: row.score,
				}))}
				highlightWinner
				size={isHost ? "large" : "normal"}
			/>
		</PhaseShell>
	);
}

export function registerSpectrumGuessPhases() {
	registerGamePhases("spectrum-guess", {
		calibration: CalibrationPhase,
		guessing: GuessingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
