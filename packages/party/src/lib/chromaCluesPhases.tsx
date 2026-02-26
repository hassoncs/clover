import { Text, View } from "react-native";
import { ColorGrid } from "../components/chroma/GridDisplay";
import { MarkerLayer } from "../components/chroma/MarkerLayer";
import { Scoreboard } from "../components/Scoreboard";
import { Timer } from "../components/Timer";
import type { ChromaSharedData } from "./chromaCluesTypes";
import type { PhaseRendererProps } from "./phaseRegistry";
import { registerGamePhases } from "./phaseRegistry";

function ClueGivingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = sharedData as unknown as ChromaSharedData;
	const isCueGiver = role === "player" && activeInputRequest !== null;

	return (
		<View className="w-full flex-1 items-center">
			<Timer seconds={activeInputRequest?.request.timeLimit || 30} />
			<View className="bg-theme-surface p-6 rounded-xl border border-theme-border mb-4">
				<Text className="text-theme-text text-lg text-center">
					Round {data.round} —{" "}
					{isCueGiver
						? "You are the Cue Giver!"
						: `${data.cueGiverId} is giving clues`}
				</Text>
			</View>

			{role === "host" && (
				<View className="flex-1 items-center justify-center">
					<Text className="text-theme-text-secondary text-lg">
						Waiting for clue...
					</Text>
				</View>
			)}

			{isCueGiver && (
				<View className="flex-1 w-full items-center">
					<Text className="text-theme-text text-xl mb-4">
						Give a 1-word clue for your color!
					</Text>
					<Text className="text-theme-text-secondary text-sm mb-8">
						No basic color names (red, blue, green, etc.)
					</Text>
				</View>
			)}

			{!isCueGiver && role === "player" && (
				<View className="flex-1 items-center justify-center">
					<Text className="text-theme-text-secondary text-lg">
						Wait for the clue...
					</Text>
				</View>
			)}
		</View>
	);
}

function GuessPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = sharedData as unknown as ChromaSharedData;
	const markerNumber = data.phase === "first_guess" ? 1 : 2;

	const handleCellSelect = (row: number, col: number) => {
		sendInput({ row, col });
	};

	return (
		<View className="w-full flex-1 items-center">
			<Timer seconds={activeInputRequest?.request.timeLimit || 45} />

			<View className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-4 w-full items-center">
				<Text className="text-theme-text text-lg font-bold">
					{data.clue1 && `Clue: "${data.clue1}"`}
					{data.clue2 && ` + "${data.clue2}"`}
				</Text>
				<Text className="text-theme-text-secondary text-sm mt-2">
					Place marker #{markerNumber}
				</Text>
			</View>

			{role === "host" && (
				<View className="flex-1 items-center justify-center">
					<ColorGrid disabled />
					<Text className="text-theme-text-secondary text-lg mt-4">
						Players are placing markers...
					</Text>
				</View>
			)}

			{role === "player" && activeInputRequest && (
				<View className="flex-1 w-full">
					<ColorGrid
						onCellSelect={handleCellSelect}
						disabled={!activeInputRequest}
					/>
				</View>
			)}
		</View>
	);
}

function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const data = sharedData as unknown as ChromaSharedData;

	if (!data.targetColor) {
		return (
			<View className="flex-1 items-center justify-center">
				<Text className="text-theme-text">Revealing...</Text>
			</View>
		);
	}

	const markers = data.markers.map((m, i) => ({
		id: `${m.playerId}-${m.markerNumber}`,
		row: m.position?.row ?? 0,
		col: m.position?.col ?? 0,
		color: m.playerId === data.cueGiverId ? "#f59e0b" : "#8b5cf6",
		score: m.score,
	}));

	return (
		<View className="w-full flex-1 items-center">
			<View className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-4 w-full items-center">
				<Text className="text-theme-text text-xl font-bold">Reveal!</Text>
				<Text className="text-theme-text-secondary text-sm mt-2">
					Target: Row {data.targetColor.row + 1}, Col {data.targetColor.col + 1}
				</Text>
			</View>

			<View className="relative w-full aspect-square">
				<ColorGrid disabled />
				<MarkerLayer
					markers={markers}
					targetColor={data.targetColor}
					showScoringFrame
				/>
			</View>
		</View>
	);
}

function ScoresPhase({ sharedData }: PhaseRendererProps) {
	const data = sharedData as unknown as ChromaSharedData;
	const scoreboardData = data.scoreboard.map((s) => ({
		playerName: s.name,
		score: s.score,
	}));

	return (
		<View className="w-full flex-1">
			<Text className="text-2xl font-bold text-theme-text text-center mb-4">
				Round {data.round} Results
			</Text>
			<Scoreboard data={scoreboardData} />
		</View>
	);
}

function WinnerPhase({ sharedData }: PhaseRendererProps) {
	const data = sharedData as unknown as ChromaSharedData;
	const winner = data.scoreboard[0];
	const scoreboardData = data.scoreboard.map((s) => ({
		playerName: s.name,
		score: s.score,
	}));

	return (
		<View className="w-full flex-1 items-center">
			<Text className="text-4xl font-bold text-theme-primary text-center mb-2">
				Game Over!
			</Text>
			{winner && (
				<Text className="text-xl text-theme-text text-center mb-8">
					Winner: {winner.name} with {winner.score} points!
				</Text>
			)}
			<Scoreboard data={scoreboardData} highlightWinner />
		</View>
	);
}

export function registerChromaCluesPhases() {
	registerGamePhases("chroma-clues", {
		clue_giving: ClueGivingPhase,
		first_guess: GuessPhase,
		second_guess: GuessPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
