import { Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { ChoiceGrid } from "@/components/party/ChoiceGrid";
import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const ACCENT = "#0ea5e9";

type ChainScoreEntry = {
	id: string;
	name: string;
	score: number;
};

function toNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	return null;
}

function toText(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function parseScoreboard(value: unknown): ChainScoreEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: ChainScoreEntry[] = [];
	for (const item of value) {
		if (typeof item !== "object" || item === null) {
			continue;
		}

		const maybeId = (item as { id?: unknown }).id;
		const maybeName = (item as { name?: unknown }).name;
		const maybeScore = (item as { score?: unknown }).score;
		const score = toNumber(maybeScore);

		if (
			typeof maybeId === "string" &&
			typeof maybeName === "string" &&
			score != null
		) {
			entries.push({ id: maybeId, name: maybeName, score });
		}
	}

	return entries;
}

function toScoreboardData(scoreboard: ChainScoreEntry[]) {
	return scoreboard.map((entry) => ({
		playerName: entry.name,
		score: entry.score,
	}));
}

function HostReactionHeader({
	sharedData,
	activeInputRequest,
}: Pick<PhaseRendererProps, "sharedData" | "activeInputRequest">) {
	const currentWord = toText(
		sharedData.currentWord,
		toText(sharedData.nextWord, "Waiting for chain"),
	);
	const currentPlayerName = toText(
		sharedData.currentPlayerName,
		"Next scientist",
	);
	const timerFromShared = toNumber(sharedData.timerRemaining);
	const timerFromRequest = toNumber(activeInputRequest?.request.timeLimit);
	const timerSeconds = timerFromShared ?? timerFromRequest ?? 0;

	return (
		<View
			className="w-full mb-4 rounded-2xl border bg-theme-surface p-4"
			style={{ borderColor: ACCENT }}
		>
			<Text className="text-xs font-semibold tracking-[1px] text-theme-text-secondary text-center">
				WORD CHAIN
			</Text>
			<Text
				className="text-center text-theme-text font-black text-4xl mt-2"
				style={{ color: ACCENT }}
			>
				{currentWord}
			</Text>
			<Text className="text-center text-theme-text-secondary text-lg mt-1">
				Current player: {currentPlayerName}
			</Text>
			<View className="items-center mt-3">
				<Timer seconds={timerSeconds} size="large" />
			</View>
		</View>
	);
}

function RoundStartPhase({
	sharedData,
	role,
	activeInputRequest,
}: PhaseRendererProps) {
	const round = toNumber(sharedData.round) ?? 1;
	const isMeltdown = sharedData.isMeltdown === true;
	const currentWord = toText(sharedData.currentWord, "Initializing chain");

	return (
		<PhaseShell
			round={round}
			title="Chain Reaction"
			subtitle={
				isMeltdown
					? "Meltdown round: eliminations active"
					: "Build the strongest chain"
			}
			accentColor={ACCENT}
			isHost={role === "host"}
		>
			{role === "host" && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<PromptCard
				text={`Current word: ${currentWord}`}
				size={role === "host" ? "large" : "normal"}
			/>
			{isMeltdown && (
				<View
					className="w-full rounded-xl border p-4"
					style={{ borderColor: ACCENT }}
				>
					<Text className="text-center text-theme-text text-base font-semibold">
						Reactor warning: missed links can eliminate players this round.
					</Text>
				</View>
			)}
		</PhaseShell>
	);
}

function ReactionPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const currentWord = toText(sharedData.currentWord, "Waiting for word");
	const currentPlayerName = toText(sharedData.currentPlayerName, "Player");
	const timerRemaining =
		toNumber(sharedData.timerRemaining) ??
		toNumber(activeInputRequest?.request.timeLimit) ??
		0;

	return (
		<PhaseShell
			title="Reaction"
			subtitle={`${currentPlayerName} must extend the chain`}
			timerSeconds={timerRemaining}
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<PromptCard text={currentWord} size={isHost ? "large" : "normal"} />
			{role === "player" && activeInputRequest?.request.type === "text" ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message={`${currentPlayerName} is typing the next word...`}
					accentColor={ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function ChallengePhase({
	sharedData,
	role,
	activeInputRequest,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const nextWord = toText(sharedData.nextWord, "Pending word");
	const currentPlayerName = toText(
		sharedData.currentPlayerName,
		"Current player",
	);
	const challengerName = toText(sharedData.challengerName, "Any challenger");

	return (
		<PhaseShell
			title="Challenge Window"
			subtitle={`Challenge ${currentPlayerName} if this link is weak`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<PromptCard
				text={`Proposed word: ${nextWord}`}
				size={isHost ? "large" : "normal"}
			/>
			<ChoiceGrid
				choices={["Challenge", "Let it pass"]}
				onSelect={() => undefined}
				disabled
				columns={2}
				accentColor={ACCENT}
			/>
			{role === "host" ? (
				<HostWaitCard
					message={`Awaiting buzzers. First challenger: ${challengerName}`}
					accentColor={ACCENT}
				/>
			) : (
				<Text className="mt-4 text-theme-text-secondary text-center text-sm">
					Buzzer is active. Tap fast if you want to challenge.
				</Text>
			)}
		</PhaseShell>
	);
}

function JustificationPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const nextWord = toText(sharedData.nextWord, "");
	const currentWord = toText(sharedData.currentWord, "");
	const challengerName = toText(sharedData.challengerName, "Challenger");
	const existingJustification = toText(sharedData.justification, "");

	return (
		<PhaseShell
			title="Justification"
			subtitle={`${challengerName} issued a challenge`}
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<PromptCard
				text={`Why does "${nextWord}" connect to "${currentWord}"?`}
				size={isHost ? "large" : "normal"}
			/>
			{existingJustification.length > 0 && (
				<View className="w-full rounded-xl border border-theme-border bg-theme-surface p-4 mb-4">
					<Text className="text-theme-text-secondary text-sm text-center mb-1">
						Current justification draft
					</Text>
					<Text className="text-theme-text text-base text-center">
						{existingJustification}
					</Text>
				</View>
			)}
			{role === "player" && activeInputRequest?.request.type === "text" ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message="Waiting for the challenged player to justify the link..."
					accentColor={ACCENT}
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
	const justification = toText(
		sharedData.justification,
		"No justification provided.",
	);
	const choices =
		activeInputRequest?.request.type === "choice" &&
		Array.isArray(activeInputRequest.request.options)
			? activeInputRequest.request.options.map((choice: string) =>
					String(choice),
				)
			: ["Valid", "Invalid"];
	const voteOptions = choices.map((choice, index) => ({
		id: String(index),
		text: choice,
	}));

	return (
		<PhaseShell
			title="Peer Vote"
			subtitle="Is the justification valid?"
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<PromptCard text={justification} size={isHost ? "large" : "normal"} />
			{role === "player" && activeInputRequest?.request.type === "choice" ? (
				<VoteList
					options={voteOptions}
					onVote={(answerId) => {
						const parsed = Number.parseInt(answerId, 10);
						sendInput(Number.isNaN(parsed) ? 0 : parsed);
					}}
					disabled={false}
				/>
			) : (
				<HostWaitCard
					message="Votes are coming in from the lab..."
					accentColor={ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({
	sharedData,
	role,
	activeInputRequest,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const message = toText(sharedData.message, "No reveal message yet.");
	const scoreboard = parseScoreboard(sharedData.scores);

	return (
		<PhaseShell
			title="Reveal"
			subtitle="Result from this challenge"
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<ResultRevealCard
				title="Outcome"
				rows={[
					{
						label: message,
						detail: "Chain state updated",
						highlight: true,
					},
				]}
				isHost={isHost}
			/>
			{scoreboard.length > 0 && (
				<View className="w-full mt-4">
					<Scoreboard
						data={toScoreboardData(scoreboard)}
						size={isHost ? "large" : "normal"}
					/>
				</View>
			)}
		</PhaseShell>
	);
}

function ScoresPhase({
	sharedData,
	role,
	activeInputRequest,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const scoreboard = parseScoreboard(sharedData.scoreboard);

	return (
		<PhaseShell
			title="Scores"
			subtitle="Round standings"
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<Scoreboard
				data={toScoreboardData(scoreboard)}
				size={isHost ? "large" : "normal"}
			/>
		</PhaseShell>
	);
}

function WinnerPhase({
	sharedData,
	role,
	activeInputRequest,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const scoreboard = parseScoreboard(sharedData.scoreboard);
	const winner = sharedData.winner;
	const winnerName =
		typeof winner === "object" && winner !== null
			? toText((winner as { name?: unknown }).name, "Unknown")
			: "Unknown";

	return (
		<PhaseShell
			title="Winner"
			subtitle="Final chain champion"
			accentColor={ACCENT}
			isHost={isHost}
		>
			{isHost && (
				<HostReactionHeader
					sharedData={sharedData}
					activeInputRequest={activeInputRequest}
				/>
			)}
			<ResultRevealCard
				title="Champion"
				rows={[
					{
						label: winnerName,
						detail: "Top reactor in the lab",
						highlight: true,
					},
				]}
				isHost={isHost}
			/>
			<View className="w-full mt-4">
				<Scoreboard
					data={toScoreboardData(scoreboard)}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

export function registerChainReactionPhases() {
	registerGamePhases("chain-reaction", {
		round_start: RoundStartPhase,
		reaction: ReactionPhase,
		challenge: ChallengePhase,
		justification: JustificationPhase,
		voting: VotingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
