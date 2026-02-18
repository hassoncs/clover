import { Image, Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { DrawingInput } from "@/components/party/DrawingInput";
import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const SKETCH_BLUFF_ACCENT = "#10b981";

type SketchBluffScoreEntry = {
	id: string;
	name: string;
	score: number;
};

type SketchBluffDrawingTitle = {
	text: string;
	authorId: string;
	authorName: string;
	isReal?: boolean;
};

type SketchBluffVote = {
	guesserId: string;
	guesserName: string;
	votedText: string;
	isCorrect: boolean;
};

type SketchBluffResults = {
	drawing: {
		artistId: string;
		artistName: string;
		imageData: string;
	};
	realPrompt: string;
	artistId: string;
	artistName: string;
	titles: SketchBluffDrawingTitle[];
	votes: SketchBluffVote[];
	pointsEarned: Record<string, number>;
};

type SketchBluffDrawingData = {
	phase: "drawing";
	round: number;
	totalRounds: number;
};

type SketchBluffBluffingData = {
	phase: "bluffing";
	round: number;
};

type SketchBluffVotingData = {
	phase: "voting";
	round: number;
	currentDrawing: {
		imageData: string;
		artistName: string;
		titles: string[];
	};
};

type SketchBluffRevealData = {
	phase: "reveal";
	results: SketchBluffResults;
	scores: Record<string, number>;
};

type SketchBluffScoresData = {
	phase: "scores";
	round: number;
	scoreboard: SketchBluffScoreEntry[];
};

type SketchBluffWinnerData = {
	phase: "winner";
	winner: SketchBluffScoreEntry;
	scoreboard: SketchBluffScoreEntry[];
};

function toNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toText(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function toObject(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function toScoreboard(
	value: unknown,
): Array<{ playerName: string; score: number }> {
	if (!Array.isArray(value)) return [];
	return value
		.filter((entry): entry is SketchBluffScoreEntry => {
			const maybe = toObject(entry);
			return (
				typeof maybe.id === "string" &&
				typeof maybe.name === "string" &&
				typeof maybe.score === "number"
			);
		})
		.map((entry) => ({ playerName: entry.name, score: entry.score }));
}

function getAssignedPrompt(requestMetadata: unknown): string | null {
	const metadata = toObject(requestMetadata);
	const assignments = metadata.assignments;
	if (typeof assignments === "string") return assignments;

	if (!assignments || typeof assignments !== "object") return null;
	const values = Object.values(assignments as Record<string, unknown>).filter(
		(value): value is string =>
			typeof value === "string" && value.trim().length > 0,
	);

	if (values.length === 1) return values[0];
	if (values.length > 1) return values[0];
	return null;
}

function DrawingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	roomState,
	role,
}: PhaseRendererProps) {
	const data = sharedData as SketchBluffDrawingData;
	const isHost = role === "host";
	const assignedPrompt = getAssignedPrompt(
		activeInputRequest?.request.metadata,
	);

	return (
		<PhaseShell
			round={toNumber(data.round)}
			totalRounds={toNumber(data.totalRounds)}
			title="Sketch the Prompt"
			timerSeconds={toNumber(activeInputRequest?.request.timeLimit)}
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			{isHost ? (
				<HostWaitCard
					message={`Players are drawing... (${roomState.players.length} in room)`}
					accentColor={SKETCH_BLUFF_ACCENT}
				/>
			) : activeInputRequest?.request.type === "drawing" ? (
				<View className="w-full flex-1 gap-4">
					{assignedPrompt ? <PromptCard text={assignedPrompt} /> : null}
					<DrawingInput
						onSubmit={(value) => {
							sendInput(value);
						}}
					/>
				</View>
			) : (
				<View className="w-full flex-1 items-center justify-center rounded-2xl border border-theme-border bg-theme-surface p-6">
					<Text className="text-theme-text text-lg font-semibold text-center">
						Waiting for your drawing assignment...
					</Text>
				</View>
			)}
		</PhaseShell>
	);
}

function BluffingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = sharedData as SketchBluffBluffingData;
	const isHost = role === "host";

	return (
		<PhaseShell
			round={toNumber(data.round)}
			title="Write a Bluff"
			timerSeconds={toNumber(activeInputRequest?.request.timeLimit)}
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			{isHost ? (
				<HostWaitCard
					message="Players are writing fake titles..."
					accentColor={SKETCH_BLUFF_ACCENT}
				/>
			) : (
				<View className="w-full flex-1 gap-4">
					<PromptCard
						text={toText(
							activeInputRequest?.request.prompt,
							"Write a fake title!",
						)}
					/>
					<AnswerInput
						onSubmit={sendInput as (answer: string) => void}
						disabled={activeInputRequest?.request.type !== "text"}
					/>
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
	const data = sharedData as SketchBluffVotingData;
	const isHost = role === "host";
	const drawing = toObject(data.currentDrawing);
	const titles = Array.isArray(drawing.titles)
		? drawing.titles.filter(
				(value): value is string => typeof value === "string",
			)
		: [];

	return (
		<PhaseShell
			round={toNumber(data.round)}
			title="Find the Real Title"
			timerSeconds={toNumber(activeInputRequest?.request.timeLimit)}
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full flex-1 gap-4">
				<View className="w-full rounded-2xl overflow-hidden border border-theme-border bg-theme-surface-elevated">
					<Image
						source={{ uri: toText(drawing.imageData) }}
						resizeMode="contain"
						className="w-full h-72"
					/>
				</View>
				<Text className="text-theme-text-secondary text-center text-base">
					Artist: {toText(drawing.artistName, "Unknown")}
				</Text>

				{isHost ? (
					<HostWaitCard
						message="Players are voting on the title..."
						accentColor={SKETCH_BLUFF_ACCENT}
					/>
				) : activeInputRequest?.request.type === "choice" ? (
					<View className="w-full flex-1 gap-3">
						<Timer seconds={toNumber(activeInputRequest.request.timeLimit)} />
						<VoteList
							options={titles.map((text, index) => ({
								id: String(index),
								text,
							}))}
							onVote={sendInput as (answerId: string) => void}
						/>
					</View>
				) : (
					<View className="w-full rounded-xl border border-theme-border bg-theme-surface p-5">
						<Text className="text-theme-text text-center font-semibold">
							You are not voting on this drawing.
						</Text>
					</View>
				)}
			</View>
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const data = sharedData as SketchBluffRevealData;
	const results = toObject(data.results) as unknown as SketchBluffResults;
	const isHost = role === "host";
	const titles = Array.isArray(results.titles) ? results.titles : [];

	const rows = titles.map((title) => {
		const titleVotes = Array.isArray(results.votes)
			? results.votes.filter((vote) => vote.votedText === title.text).length
			: 0;
		const earned = toNumber(results.pointsEarned?.[title.authorId]);

		return {
			label: title.text,
			detail: `${title.authorName}${titleVotes > 0 ? ` • ${titleVotes} vote${titleVotes === 1 ? "" : "s"}` : ""}`,
			points: earned,
			highlight: !!title.isReal,
		};
	});

	return (
		<PhaseShell
			title="Reveal"
			subtitle={`Real prompt: ${toText(results.realPrompt)}`}
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full flex-1 gap-4">
				<View className="w-full rounded-2xl overflow-hidden border border-theme-border bg-theme-surface-elevated">
					<Image
						source={{ uri: toText(results.drawing?.imageData) }}
						resizeMode="contain"
						className="w-full h-72"
					/>
				</View>
				<Text className="text-theme-text-secondary text-center text-base">
					Drawn by {toText(results.artistName)}
				</Text>
				<ResultRevealCard rows={rows} isHost={isHost} />
			</View>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const data = sharedData as SketchBluffScoresData;
	const isHost = role === "host";

	return (
		<PhaseShell
			round={toNumber(data.round)}
			title="Scoreboard"
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full flex-1">
				<Scoreboard
					data={toScoreboard(data.scoreboard)}
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const data = sharedData as SketchBluffWinnerData;
	const isHost = role === "host";
	const winner = toObject(data.winner);

	return (
		<PhaseShell
			title="Winner"
			subtitle={`${toText(winner.name, "Unknown")} takes it with ${toNumber(winner.score)} points`}
			accentColor={SKETCH_BLUFF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full flex-1">
				<Scoreboard
					data={toScoreboard(data.scoreboard)}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

export function registerSketchBluffPhases() {
	registerGamePhases("sketch-bluff", {
		drawing: DrawingPhase,
		bluffing: BluffingPhase,
		voting: VotingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
