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

const ACCENT = "#84cc16";

type ScoreEntry = {
	playerName: string;
	score: number;
};

type HistoryEntry = {
	word: string;
	outcome: string;
};

function toNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toText(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function parseScoreboard(value: unknown): ScoreEntry[] {
	const parsed = parseJson<unknown[]>(value, []);
	return parsed
		.filter((item) => typeof item === "object" && item !== null)
		.map((item) => {
			const row = item as { playerName?: unknown; score?: unknown };
			return {
				playerName: toText(row.playerName, "Player"),
				score: toNumber(row.score, 0),
			};
		});
}

function parseHistory(value: unknown): HistoryEntry[] {
	const parsed = parseJson<unknown[]>(value, []);
	return parsed
		.filter((item) => typeof item === "object" && item !== null)
		.map((item) => {
			const row = item as { word?: unknown; outcome?: unknown };
			return {
				word: toText(row.word, "Unknown word"),
				outcome: toText(row.outcome, "pass"),
			};
		});
}

function getChoiceOptions(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
) {
	if (!activeInputRequest || activeInputRequest.request.type !== "choice") {
		return ["correct", "pass"];
	}

	if (!Array.isArray(activeInputRequest.request.options)) {
		return ["correct", "pass"];
	}

	const options = activeInputRequest.request.options
		.map((option) => String(option))
		.filter((option) => option.length > 0);

	return options.length > 0 ? options : ["correct", "pass"];
}

function outcomeDetail(outcome: string): string {
	if (outcome === "correct") return "Correct";
	if (outcome === "time") return "Time expired";
	return "Pass";
}

function GuessingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const roundNumber = toNumber(sharedData.roundNumber, 1);
	const totalRounds = toNumber(sharedData.totalRounds, 1);
	const activeGuesserName = toText(sharedData.activeGuesserName, "Guesser");
	const currentWord = toText(sharedData.currentWord, "Get ready");
	const timerRemaining = toNumber(sharedData.timerRemaining, 0);
	const roundCorrect = toNumber(sharedData.roundCorrect, 0);
	const roundPasses = toNumber(sharedData.roundPasses, 0);
	const isHost = role === "host";
	const isActiveGuesser =
		role === "player" && activeInputRequest?.request.type === "choice";
	const options = getChoiceOptions(activeInputRequest);

	return (
		<PhaseShell
			round={roundNumber}
			totalRounds={totalRounds}
			title="Heads Up"
			subtitle={`${activeGuesserName} is guessing`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<>
					<View
						className="w-full rounded-2xl border bg-theme-surface p-4 mb-4"
						style={{ borderColor: ACCENT }}
					>
						<Text className="text-theme-text-secondary text-center text-sm font-semibold tracking-[1px]">
							WORD ON SCREEN
						</Text>
						<PromptCard text={currentWord} size="large" />
						<Timer seconds={timerRemaining} size="large" />
						<View className="flex-row gap-3 justify-center">
							<View
								className="rounded-xl border bg-theme-surface-elevated px-4 py-2"
								style={{ borderColor: ACCENT }}
							>
								<Text className="text-theme-text font-semibold">
									Correct: {roundCorrect}
								</Text>
							</View>
							<View
								className="rounded-xl border bg-theme-surface-elevated px-4 py-2"
								style={{ borderColor: ACCENT }}
							>
								<Text className="text-theme-text font-semibold">
									Passes: {roundPasses}
								</Text>
							</View>
						</View>
					</View>
					<HostWaitCard
						message={`${activeGuesserName} is tapping Correct/Pass...`}
						accentColor={ACCENT}
					/>
				</>
			)}

			{isActiveGuesser && (
				<View className="w-full flex-1 items-center justify-center">
					<Text className="text-theme-text-secondary text-center text-sm font-semibold mb-3 tracking-[1px]">
						FAST TAP MODE
					</Text>
					<View className="w-full">
						<ChoiceGrid
							choices={options.map((option) =>
								option === "correct"
									? "Correct"
									: option === "pass"
										? "Pass"
										: option,
							)}
							onSelect={(index) => {
								sendInput(options[index] ?? "pass");
							}}
							columns={2}
							accentColor={ACCENT}
						/>
					</View>
				</View>
			)}

			{!isHost && !isActiveGuesser && (
				<View className="w-full flex-1 items-center justify-center">
					<Text className="text-theme-text-secondary text-center text-sm mb-3 tracking-[1px] font-semibold">
						SHOW THIS WORD
					</Text>
					<View
						className="w-full rounded-2xl border bg-theme-surface px-6 py-10"
						style={{ borderColor: ACCENT }}
					>
						<Text
							className="text-center text-theme-text font-black text-6xl"
							style={{ color: ACCENT }}
						>
							{currentWord}
						</Text>
					</View>
				</View>
			)}
		</PhaseShell>
	);
}

function RoundResultsPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const roundNumber = toNumber(sharedData.roundNumber, 1);
	const totalRounds = toNumber(sharedData.totalRounds, 1);
	const activeGuesserName = toText(sharedData.activeGuesserName, "Guesser");
	const roundCorrect = toNumber(sharedData.roundCorrect, 0);
	const roundPasses = toNumber(sharedData.roundPasses, 0);
	const history = parseHistory(sharedData.historyJson);
	const scoreboard = parseScoreboard(sharedData.scoreboardJson);

	return (
		<PhaseShell
			round={roundNumber}
			totalRounds={totalRounds}
			title="Round Results"
			subtitle={`${activeGuesserName}'s turn recap`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="Turn Stats"
				rows={[
					{
						label: "Correct guesses",
						detail: String(roundCorrect),
						highlight: true,
					},
					{
						label: "Passes",
						detail: String(roundPasses),
					},
				]}
				isHost={isHost}
			/>

			<View className="w-full mt-4">
				<ResultRevealCard
					title="Word History"
					rows={history.map((entry) => ({
						label: entry.word,
						detail: outcomeDetail(entry.outcome),
						highlight: entry.outcome === "correct",
					}))}
					isHost={isHost}
				/>
			</View>

			<View className="w-full mt-4">
				<Scoreboard data={scoreboard} size={isHost ? "large" : "normal"} />
			</View>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const roundNumber = toNumber(sharedData.roundNumber, 1);
	const totalRounds = toNumber(sharedData.totalRounds, 1);
	const scoreboard = parseScoreboard(sharedData.scoreboardJson);

	return (
		<PhaseShell
			round={roundNumber}
			totalRounds={totalRounds}
			title="Scores"
			subtitle="Leaderboard"
			accentColor={ACCENT}
			isHost={isHost}
		>
			<Scoreboard data={scoreboard} size={isHost ? "large" : "normal"} />
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const scoreboard = parseScoreboard(sharedData.scoreboardJson);
	const winnerName = toText(sharedData.winnerName, "Nobody");
	const winnerScore = toNumber(sharedData.winnerScore, 0);

	return (
		<PhaseShell
			title="Winner"
			subtitle="Final standings"
			accentColor={ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="Champion"
				rows={[
					{
						label: winnerName,
						detail: `${winnerScore} points`,
						highlight: true,
					},
				]}
				isHost={isHost}
			/>
			<View className="w-full mt-4">
				<Scoreboard
					data={scoreboard}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

export function registerHeadsUpPhases() {
	registerGamePhases("heads-up", {
		guessing: GuessingPhase,
		round_results: RoundResultsPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
