import { Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const ABOUT_YOU_BLUFF_ACCENT = "#8b5cf6";

type GuessResult = {
	guesserId: string;
	guessIndex: number;
	isCorrect: boolean;
};

type RevealResultData = {
	truth: string;
	subjectId: string;
	guesses: GuessResult[];
	pointsEarned: Record<string, number>;
};

type ScoreRow = {
	id: string;
	name: string;
	score: number;
};

type WinnerData = {
	id: string;
	name: string;
	score: number;
};

type TruthWritingData = {
	phase: "truth_writing";
	round: number;
	subjectId: string;
	subjectName: string;
	prompt: string;
};

type BluffWritingData = {
	phase: "bluff_writing";
	prompt: string;
};

type GuessingData = {
	phase: "guessing";
	answers: string[];
};

type RevealData = {
	phase: "reveal";
	results: RevealResultData;
	scores: Record<string, number>;
};

type ScoresData = {
	phase: "scores";
	scoreboard: ScoreRow[];
};

type WinnerPhaseData = {
	phase: "winner";
	winner: WinnerData;
	scoreboard: ScoreRow[];
};

function asTruthWritingData(data: Record<string, unknown>): TruthWritingData {
	return {
		phase: "truth_writing",
		round: typeof data.round === "number" ? data.round : 1,
		subjectId: typeof data.subjectId === "string" ? data.subjectId : "",
		subjectName:
			typeof data.subjectName === "string" ? data.subjectName : "Subject",
		prompt: typeof data.prompt === "string" ? data.prompt : "",
	};
}

function asBluffWritingData(data: Record<string, unknown>): BluffWritingData {
	return {
		phase: "bluff_writing",
		prompt: typeof data.prompt === "string" ? data.prompt : "",
	};
}

function asGuessingData(data: Record<string, unknown>): GuessingData {
	return {
		phase: "guessing",
		answers: Array.isArray(data.answers)
			? data.answers.filter(
					(entry): entry is string => typeof entry === "string",
				)
			: [],
	};
}

function asRevealData(data: Record<string, unknown>): RevealData {
	const rawResults =
		typeof data.results === "object" && data.results !== null
			? (data.results as Record<string, unknown>)
			: {};
	const rawGuesses = Array.isArray(rawResults.guesses)
		? rawResults.guesses
		: [];
	const guesses: GuessResult[] = rawGuesses
		.map((guess) => {
			if (typeof guess !== "object" || guess === null) return null;
			const value = guess as Record<string, unknown>;
			return {
				guesserId: typeof value.guesserId === "string" ? value.guesserId : "",
				guessIndex:
					typeof value.guessIndex === "number" ? value.guessIndex : -1,
				isCorrect: value.isCorrect === true,
			};
		})
		.filter((guess): guess is GuessResult => guess !== null);

	const rawPoints =
		typeof rawResults.pointsEarned === "object" &&
		rawResults.pointsEarned !== null
			? rawResults.pointsEarned
			: {};
	const pointsEarned: Record<string, number> = {};
	for (const [playerId, points] of Object.entries(
		rawPoints as Record<string, unknown>,
	)) {
		pointsEarned[playerId] = typeof points === "number" ? points : 0;
	}

	const scores: Record<string, number> = {};
	if (typeof data.scores === "object" && data.scores !== null) {
		for (const [playerId, score] of Object.entries(
			data.scores as Record<string, unknown>,
		)) {
			scores[playerId] = typeof score === "number" ? score : 0;
		}
	}

	return {
		phase: "reveal",
		results: {
			truth:
				typeof rawResults.truth === "string"
					? rawResults.truth
					: "No truth submitted.",
			subjectId:
				typeof rawResults.subjectId === "string" ? rawResults.subjectId : "",
			guesses,
			pointsEarned,
		},
		scores,
	};
}

function asScoresData(data: Record<string, unknown>): ScoresData {
	const rows = Array.isArray(data.scoreboard) ? data.scoreboard : [];
	return {
		phase: "scores",
		scoreboard: rows
			.map((row) => {
				if (typeof row !== "object" || row === null) return null;
				const value = row as Record<string, unknown>;
				return {
					id: typeof value.id === "string" ? value.id : "",
					name: typeof value.name === "string" ? value.name : "Player",
					score: typeof value.score === "number" ? value.score : 0,
				};
			})
			.filter((row): row is ScoreRow => row !== null),
	};
}

function asWinnerData(data: Record<string, unknown>): WinnerPhaseData {
	const rawWinner =
		typeof data.winner === "object" && data.winner !== null
			? (data.winner as Record<string, unknown>)
			: {};
	const scoreData = asScoresData(data);

	return {
		phase: "winner",
		winner: {
			id: typeof rawWinner.id === "string" ? rawWinner.id : "",
			name: typeof rawWinner.name === "string" ? rawWinner.name : "Unknown",
			score: typeof rawWinner.score === "number" ? rawWinner.score : 0,
		},
		scoreboard: scoreData.scoreboard,
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

function TruthWritingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = asTruthWritingData(sharedData);
	const isHost = role === "host";
	const isSubject =
		role === "player" && activeInputRequest?.request.type === "text";
	const timerSeconds =
		activeInputRequest?.request.timeLimit != null
			? activeInputRequest.request.timeLimit
			: isSubject
				? 30
				: undefined;

	return (
		<PhaseShell
			round={data.round}
			title="Tell The Truth"
			subtitle={`${data.subjectName} is the subject this round`}
			timerSeconds={timerSeconds}
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={data.prompt} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message={`${data.subjectName} is writing their truth...`}
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			) : isSubject ? (
				<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
			) : (
				<HostWaitCard
					message={`${data.subjectName} is writing their truth...`}
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function BluffWritingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const data = asBluffWritingData(sharedData);
	const isHost = role === "host";
	const isBluffer =
		role === "player" && activeInputRequest?.request.type === "text";
	const timerSeconds =
		activeInputRequest?.request.timeLimit != null
			? activeInputRequest.request.timeLimit
			: isBluffer
				? 30
				: undefined;

	return (
		<PhaseShell
			title="Write A Bluff"
			subtitle="One player told the truth; everyone else writes a convincing fake"
			timerSeconds={timerSeconds}
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={data.prompt} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Players are writing bluffs..."
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			) : isBluffer ? (
				<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
			) : (
				<HostWaitCard
					message="You are the subject. Wait while others write bluffs."
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			)}
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
	const timerSeconds =
		activeInputRequest?.request.timeLimit != null
			? activeInputRequest.request.timeLimit
			: isGuesser
				? 20
				: undefined;

	const options = data.answers.map((text, index) => ({
		id: String(index),
		text,
	}));

	return (
		<PhaseShell
			title="Find The Truth"
			subtitle="Pick the one answer you believe is real"
			timerSeconds={timerSeconds}
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
			isHost={isHost}
		>
			{isHost ? (
				<HostWaitCard
					message="Players are guessing..."
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			) : isGuesser ? (
				<VoteList
					options={options}
					onVote={(answerId) => {
						const guessIndex = Number(answerId);
						sendInput(Number.isFinite(guessIndex) ? guessIndex : 0);
					}}
					disabled={!activeInputRequest}
				/>
			) : (
				<HostWaitCard
					message="You are the subject. Wait while others guess the truth."
					accentColor={ABOUT_YOU_BLUFF_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, roomState, role }: PhaseRendererProps) {
	const data = asRevealData(sharedData);
	const isHost = role === "host";

	const correctRows = data.results.guesses
		.filter((guess) => guess.isCorrect)
		.map((guess) => ({
			label: `${playerNameFor(roomState, guess.guesserId)} found the truth`,
			detail: `Picked answer #${guess.guessIndex + 1}`,
			points: data.results.pointsEarned[guess.guesserId] ?? 0,
		}));

	const fooledRows = data.results.guesses
		.filter((guess) => !guess.isCorrect)
		.map((guess) => ({
			label: `${playerNameFor(roomState, guess.guesserId)} got fooled`,
			detail: `Picked answer #${guess.guessIndex + 1}`,
			points: data.results.pointsEarned[guess.guesserId] ?? 0,
		}));

	const subjectPoints = data.results.pointsEarned[data.results.subjectId] ?? 0;
	const subjectName = playerNameFor(roomState, data.results.subjectId);
	const scoreboardRows = roomState.players.map((player) => ({
		label: player.name,
		detail: `Total score: ${data.scores[player.id] ?? 0}`,
	}));

	return (
		<PhaseShell
			title="Reveal"
			subtitle={`${subjectName} was the subject this round`}
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="The Truth"
				rows={[{ label: data.results.truth, highlight: true }]}
				isHost={isHost}
			/>
			<View className="w-full mt-4 gap-4">
				<ResultRevealCard
					title="Correct Guesses"
					rows={
						correctRows.length > 0
							? correctRows
							: [{ label: "No one found the truth this round." }]
					}
					isHost={isHost}
				/>
				<ResultRevealCard
					title="Fooled Players"
					rows={
						fooledRows.length > 0
							? fooledRows
							: [{ label: "Nobody was fooled this round." }]
					}
					isHost={isHost}
				/>
				<ResultRevealCard
					title="Subject Bonus"
					rows={[
						{
							label: subjectName,
							detail:
								subjectPoints > 0
									? "Earned points when someone picked a bluff"
									: "No bonus points this round",
							points: subjectPoints > 0 ? subjectPoints : undefined,
						},
					]}
					isHost={isHost}
				/>
				{isHost && <Timer seconds={5} size="large" />}
				<ResultRevealCard
					title="Scores"
					rows={scoreboardRows}
					isHost={isHost}
				/>
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
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
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
			subtitle={`${data.winner.name} takes it with ${data.winner.score} points`}
			accentColor={ABOUT_YOU_BLUFF_ACCENT}
			isHost={isHost}
		>
			<View className="w-full items-center mb-4">
				<Text
					className={`font-bold text-center ${isHost ? "text-4xl" : "text-2xl"}`}
					style={{ color: ABOUT_YOU_BLUFF_ACCENT }}
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

export function registerAboutYouBluffPhases() {
	registerGamePhases("about-you-bluff", {
		truth_writing: TruthWritingPhase,
		bluff_writing: BluffWritingPhase,
		guessing: GuessingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
