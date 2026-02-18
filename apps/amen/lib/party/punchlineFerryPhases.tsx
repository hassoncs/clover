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
import { parseJson } from "./parseSharedData";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const PUNCHLINE_FERRY_ACCENT = "#6366f1";

type JokeVoteEntry = {
	index: number;
	setup: string;
	bridge: string;
	punchline: string;
	setupPlayerName: string;
	bridgePlayerName: string;
	punchlinePlayerName: string;
	performedLive: boolean;
};

type ShowJoke = {
	setup: string;
	bridge: string;
	punchline: string;
	setupPlayerName: string;
	bridgePlayerName: string;
	punchlinePlayerName: string;
	performedLive: boolean;
	audioBlobId: string | null;
};

type WinnerInfo = {
	id: string;
	name: string;
	score: number;
};

type ScoreboardEntry = {
	id: string;
	name: string;
	score: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function parseArray(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = parseJson<unknown[]>(value, []);
		return Array.isArray(parsed) ? parsed : [];
	}
	return [];
}

function parseWinner(value: unknown): WinnerInfo | null {
	const data = asRecord(value);
	if (!data) {
		return null;
	}

	const id = asString(data.id);
	const name = asString(data.name);
	if (id.length === 0 && name.length === 0) {
		return null;
	}

	return {
		id,
		name: name || id || "Unknown",
		score: asNumber(data.score, 0),
	};
}

function parseScoreboard(value: unknown): ScoreboardEntry[] {
	const rows: ScoreboardEntry[] = [];

	for (const entry of parseArray(value)) {
		const data = asRecord(entry);
		if (!data) {
			continue;
		}

		const id = asString(data.id);
		const name = asString(data.name, id || "Player");
		rows.push({
			id: id || name,
			name,
			score: asNumber(data.score, 0),
		});
	}

	return rows;
}

function parseShowJoke(value: unknown): ShowJoke | null {
	const data = asRecord(value);
	if (!data) {
		return null;
	}

	const setup = asString(data.setup);
	const bridge = asString(data.bridge);
	const punchline = asString(data.punchline);
	if (setup.length === 0 && bridge.length === 0 && punchline.length === 0) {
		return null;
	}

	return {
		setup,
		bridge,
		punchline,
		setupPlayerName: asString(data.setupPlayerName, "Setup Player"),
		bridgePlayerName: asString(data.bridgePlayerName, "Bridge Player"),
		punchlinePlayerName: asString(data.punchlinePlayerName, "Punchline Player"),
		performedLive: asBoolean(data.performedLive, false),
		audioBlobId:
			typeof data.audioBlobId === "string" && data.audioBlobId.length > 0
				? data.audioBlobId
				: null,
	};
}

function parseVotingJokes(value: unknown): JokeVoteEntry[] {
	const jokes: JokeVoteEntry[] = [];

	for (const entry of parseArray(value)) {
		const data = asRecord(entry);
		if (!data) {
			continue;
		}

		jokes.push({
			index: asNumber(data.index, jokes.length),
			setup: asString(data.setup),
			bridge: asString(data.bridge),
			punchline: asString(data.punchline),
			setupPlayerName: asString(data.setupPlayerName, "Setup Player"),
			bridgePlayerName: asString(data.bridgePlayerName, "Bridge Player"),
			punchlinePlayerName: asString(
				data.punchlinePlayerName,
				"Punchline Player",
			),
			performedLive: asBoolean(data.performedLive, false),
		});
	}

	return jokes;
}

function phaseTimer(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
	sharedData: Record<string, unknown>,
): number {
	const sharedTimer = asNumber(sharedData.timerRemaining, -1);
	if (sharedTimer >= 0) {
		return sharedTimer;
	}
	return Math.max(0, activeInputRequest?.request.timeLimit ?? 0);
}

function formatJokeCard(
	label: string,
	text: string,
	credit: string,
	showEmpty = false,
) {
	const hasContent = text.trim().length > 0;
	if (!hasContent && !showEmpty) {
		return null;
	}

	return (
		<View
			key={`${label}-${credit}`}
			className="w-full rounded-2xl border bg-theme-surface p-4"
			style={{ borderColor: PUNCHLINE_FERRY_ACCENT }}
		>
			<Text className="text-theme-text-secondary text-xs font-semibold tracking-[1px]">
				{label}
			</Text>
			<Text className="text-theme-text text-lg font-bold mt-2">
				{hasContent ? text : "Waiting for this part..."}
			</Text>
			<Text className="text-theme-text-secondary text-sm mt-2">
				by {credit}
			</Text>
		</View>
	);
}

function JokeBuildStack({
	setup,
	bridge,
	punchline,
	setupPlayerName,
	bridgePlayerName,
	punchlinePlayerName,
	showEmpty,
}: {
	setup: string;
	bridge: string;
	punchline: string;
	setupPlayerName: string;
	bridgePlayerName: string;
	punchlinePlayerName: string;
	showEmpty?: boolean;
}) {
	return (
		<View className="w-full gap-3">
			{formatJokeCard("SETUP", setup, setupPlayerName, showEmpty)}
			{formatJokeCard("BRIDGE", bridge, bridgePlayerName, showEmpty)}
			{formatJokeCard("PUNCHLINE", punchline, punchlinePlayerName, showEmpty)}
		</View>
	);
}

function WordbankPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const instructions = asString(
		sharedData.instructions,
		"Submit 3 funny words to fuel the ferry.",
	);
	const timerSeconds = phaseTimer(activeInputRequest, sharedData);

	return (
		<PhaseShell
			title="Token Bank"
			subtitle="Everyone submits three funny words"
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard text={instructions} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Players are stocking the Token Bank..."
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			) : activeInputRequest?.request.type === "text" ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message="Waiting for the next phase..."
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function SetupPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = asNumber(sharedData.round, 1);
	const roundCount = Math.max(1, asNumber(sharedData.roundCount, 1));
	const template = asString(
		sharedData.template,
		"Why did the [BLANK] cross the road?",
	);
	const setupPlayerName = asString(sharedData.setupPlayerName, "Setup Player");
	const timerSeconds = phaseTimer(activeInputRequest, sharedData);
	const setupTurn =
		role === "player" && activeInputRequest?.request.type === "text";

	return (
		<PhaseShell
			round={round}
			totalRounds={roundCount}
			title="Setup"
			subtitle={`${setupPlayerName} fills the blank`}
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard
				text={`Template: ${template}`}
				size={isHost ? "large" : "normal"}
			/>
			<JokeBuildStack
				setup=""
				bridge=""
				punchline=""
				setupPlayerName={setupPlayerName}
				bridgePlayerName="Bridge Player"
				punchlinePlayerName="Punchline Player"
				showEmpty
			/>
			{setupTurn ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message={`${setupPlayerName} is writing...`}
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function ForcedWordPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const template = asString(sharedData.template, "");
	const forcedWord = asString(sharedData.forcedWord, "mystery word");
	const bridgePlayerName = asString(
		sharedData.bridgePlayerName,
		"Bridge Player",
	);
	const timerSeconds = phaseTimer(activeInputRequest, sharedData);
	const bridgeTurn =
		role === "player" && activeInputRequest?.request.type === "text";

	return (
		<PhaseShell
			title="Bridge"
			subtitle={`${bridgePlayerName} must use "${forcedWord}"`}
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard
				text={`Forced word: ${forcedWord}`}
				size={isHost ? "large" : "normal"}
			/>
			<JokeBuildStack
				setup={template}
				bridge=""
				punchline=""
				setupPlayerName="Setup Player"
				bridgePlayerName={bridgePlayerName}
				punchlinePlayerName="Punchline Player"
				showEmpty
			/>
			{bridgeTurn ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message={`${bridgePlayerName} is writing...`}
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function PunchlinePhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const setup = asString(sharedData.setup, "");
	const bridge = asString(sharedData.bridge, "");
	const punchlinePlayerName = asString(
		sharedData.punchlinePlayerName,
		"Punchline Player",
	);
	const timerSeconds = phaseTimer(activeInputRequest, sharedData);
	const punchlineTurn =
		role === "player" && activeInputRequest?.request.type === "text";

	return (
		<PhaseShell
			title="Punchline"
			subtitle={`${punchlinePlayerName} closes the joke`}
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard
				text="Write the final punchline that lands the joke."
				size={isHost ? "large" : "normal"}
			/>
			<JokeBuildStack
				setup={setup}
				bridge={bridge}
				punchline=""
				setupPlayerName="Setup Player"
				bridgePlayerName="Bridge Player"
				punchlinePlayerName={punchlinePlayerName}
				showEmpty
			/>
			{punchlineTurn ? (
				<AnswerInput onSubmit={sendInput} disabled={false} />
			) : (
				<HostWaitCard
					message={`${punchlinePlayerName} is writing...`}
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function TheShowPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const joke = parseShowJoke(sharedData.joke);

	if (!joke) {
		return (
			<PhaseShell
				title="The Show"
				subtitle="Preparing the stage"
				accentColor={PUNCHLINE_FERRY_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Preparing the full joke..."
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			</PhaseShell>
		);
	}

	const rows = [
		{
			label: joke.performedLive
				? `${joke.punchlinePlayerName} performed live`
				: "Text-only delivery",
			detail: joke.audioBlobId
				? `Audio clip: ${joke.audioBlobId}`
				: "No audio clip",
			highlight: joke.performedLive,
		},
	];

	return (
		<PhaseShell
			title="The Show"
			subtitle="Dramatic reveal: setup, bridge, punchline"
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text="Spotlight up. Here comes the full collaborative joke."
				size={isHost ? "large" : "normal"}
			/>
			<JokeBuildStack
				setup={joke.setup}
				bridge={joke.bridge}
				punchline={joke.punchline}
				setupPlayerName={joke.setupPlayerName}
				bridgePlayerName={joke.bridgePlayerName}
				punchlinePlayerName={joke.punchlinePlayerName}
			/>
			<ResultRevealCard title="Performance" rows={rows} isHost={isHost} />
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
	const jokes = parseVotingJokes(sharedData.jokes);
	const promptChoices =
		activeInputRequest?.request.type === "choice"
			? (activeInputRequest.request.options ?? [])
			: [];

	const fallbackChoices = jokes.map(
		(joke) =>
			`Joke ${joke.index + 1}: ${joke.setupPlayerName}, ${joke.bridgePlayerName}, ${joke.punchlinePlayerName}`,
	);

	const choices = promptChoices.length > 0 ? promptChoices : fallbackChoices;
	const voteOptions = choices.map((choice, index) => ({
		id: String(index),
		text: choice,
	}));

	const timerSeconds = phaseTimer(activeInputRequest, sharedData);
	const canVote =
		role === "player" && activeInputRequest?.request.type === "choice";

	return (
		<PhaseShell
			title="Voting"
			subtitle="Vote for the funniest completed joke"
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timerSeconds} size={isHost ? "large" : "normal"} />
			<PromptCard
				text="Which joke got the biggest laugh?"
				size={isHost ? "large" : "normal"}
			/>
			<View className="w-full gap-3 mb-4">
				{jokes.map((joke) => (
					<View
						key={`vote-joke-${joke.index}`}
						className="rounded-xl border bg-theme-surface p-4"
						style={{ borderColor: PUNCHLINE_FERRY_ACCENT }}
					>
						<Text className="text-theme-text text-base font-bold">
							Joke {joke.index + 1}
						</Text>
						<Text className="text-theme-text-secondary text-sm mt-1">
							{joke.setup}
						</Text>
						<Text className="text-theme-text-secondary text-sm mt-1">
							{joke.bridge}
						</Text>
						<Text className="text-theme-text text-sm mt-1 font-semibold">
							{joke.punchline}
						</Text>
					</View>
				))}
			</View>
			{isHost ? (
				<>
					<ChoiceGrid
						choices={choices}
						onSelect={() => undefined}
						disabled
						columns={choices.length > 2 ? 2 : 1}
						accentColor={PUNCHLINE_FERRY_ACCENT}
					/>
					<HostWaitCard
						message="Players are voting..."
						accentColor={PUNCHLINE_FERRY_ACCENT}
					/>
				</>
			) : canVote ? (
				<VoteList
					options={voteOptions}
					onVote={(choiceId) => {
						const parsed = Number.parseInt(choiceId, 10);
						sendInput(Number.isNaN(parsed) ? 0 : parsed);
					}}
					disabled={false}
				/>
			) : (
				<HostWaitCard
					message="Waiting for voting to start..."
					accentColor={PUNCHLINE_FERRY_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const winner = parseWinner(sharedData.winner);
	const scoreboard = parseScoreboard(sharedData.scoreboard);
	const winningJoke = parseShowJoke(sharedData.winningJoke);
	const voteCounts = parseArray(sharedData.voteCounts)
		.map((value) => asNumber(value, 0))
		.filter((value) => value >= 0);

	const winnerRows = winner
		? [
				{
					label: winner.name,
					detail: `${winner.score} points`,
					highlight: true,
				},
			]
		: [{ label: "No winner available" }];

	return (
		<PhaseShell
			title="Winner"
			subtitle="Best joke on the ferry"
			accentColor={PUNCHLINE_FERRY_ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="Comedy Champion"
				rows={winnerRows}
				isHost={isHost}
			/>
			{winningJoke && (
				<View className="w-full mt-4">
					<PromptCard text="Winning Joke" size={isHost ? "large" : "normal"} />
					<JokeBuildStack
						setup={winningJoke.setup}
						bridge={winningJoke.bridge}
						punchline={winningJoke.punchline}
						setupPlayerName={winningJoke.setupPlayerName}
						bridgePlayerName={winningJoke.bridgePlayerName}
						punchlinePlayerName={winningJoke.punchlinePlayerName}
					/>
				</View>
			)}
			{voteCounts.length > 0 && (
				<View
					className="w-full mt-4 rounded-xl border bg-theme-surface p-4"
					style={{ borderColor: PUNCHLINE_FERRY_ACCENT }}
				>
					<Text className="text-theme-text text-base font-bold mb-2">
						Vote Totals
					</Text>
					{voteCounts.map((count, index) => (
						<Text
							key={`vote-count-${index + 1}`}
							className="text-theme-text-secondary text-sm"
						>
							Joke {index + 1}: {count} vote{count === 1 ? "" : "s"}
						</Text>
					))}
				</View>
			)}
			<View className="w-full mt-4 flex-1">
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

export function registerPunchlineFerryPhases() {
	registerGamePhases("punchline-ferry", {
		wordbank: WordbankPhase,
		setup: SetupPhase,
		forcedword: ForcedWordPhase,
		punchline: PunchlinePhase,
		theshow: TheShowPhase,
		voting: VotingPhase,
		winner: WinnerPhase,
	});
}
