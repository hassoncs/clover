import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { AnswerInput } from "../components/AnswerInput";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { ResultRevealCard } from "../components/ResultRevealCard";
import { FinalPodium } from "../components/results/FinalPodium";
import { RoundScoreBoard } from "../components/results/RoundScoreBoard";
import { Timer } from "../components/Timer";
import { usePartyNarration } from "./usePartyNarration";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const YEAR_ACCENT = "#f59e0b";
const WINNER_NARRATION = "Well done, good and faithful servant!";

type ScoreboardEntry = { id: string; name: string; score: number };
type GuessEntry = {
	playerId: string;
	playerName: string;
	guess: number | null;
	points: number;
	isPerfect: boolean;
	isClose: boolean;
};
type RevealResults = {
	event: string;
	actualYear: number;
	guesses: GuessEntry[];
	pointsEarned: Record<string, number>;
};

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseScoreboard(value: unknown): ScoreboardEntry[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter(
			(e): e is ScoreboardEntry =>
				typeof e === "object" &&
				e !== null &&
				typeof (e as Record<string, unknown>).name === "string",
		)
		.map((e) => ({
			id: asString((e as Record<string, unknown>).id),
			name: asString((e as Record<string, unknown>).name),
			score: asNumber((e as Record<string, unknown>).score),
		}));
}

function parseRevealResults(value: unknown): RevealResults | null {
	if (typeof value !== "object" || value === null) return null;
	const r = value as Record<string, unknown>;
	const guesses = Array.isArray(r.guesses) ? (r.guesses as GuessEntry[]) : [];
	const pointsEarned =
		typeof r.pointsEarned === "object" && r.pointsEarned !== null
			? (r.pointsEarned as Record<string, number>)
			: {};
	return {
		event: asString(r.event),
		actualYear: asNumber(r.actualYear),
		guesses,
		pointsEarned,
	};
}

function RoundStartPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const round = asNumber(sharedData.round, 1);
	const eraName = asString(sharedData.eraName, "The Next Era");
	const isJinx = sharedData.isJinx === true;

	return (
		<PhaseShell
			round={round}
			totalRounds={3}
			title="Solomon's Bet"
			subtitle={
				isJinx ? "The Jinx Round — bet everything!" : "A new era begins"
			}
			accentColor={YEAR_ACCENT}
			isHost={isHost}
		>
			<View className="items-center p-8">
				<Text className="font-inter text-amen-cream/60 text-xs uppercase tracking-widest mb-3">
					{isJinx ? "⚡ JINX ROUND" : "Era"}
				</Text>
				<Text className="font-lora font-bold text-amen-cream text-3xl text-center">
					{eraName}
				</Text>
				{isJinx && (
					<Text className="font-inter text-amen-gold text-sm text-center mt-4">
						Guess 3 events fast — wrong answers cost you!
					</Text>
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
	const isHost = role === "host";
	const event = asString(
		sharedData.event,
		activeInputRequest?.request.prompt ?? "What year did this happen?",
	);
	const timeLimit = asNumber(
		sharedData.timeLimit,
		activeInputRequest?.request.timeLimit ?? 20,
	);

	return (
		<PhaseShell
			title="Solomon's Bet"
			subtitle="What year did this happen?"
			timerSeconds={timeLimit}
			accentColor={YEAR_ACCENT}
			isHost={isHost}
		>
			<Timer seconds={timeLimit} size={isHost ? "large" : "normal"} />
			<PromptCard text={event} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Scholars are placing their bets..."
					accentColor={YEAR_ACCENT}
				/>
			) : activeInputRequest?.request.type === "text" ? (
				<>
					<Text className="font-inter text-amen-cream/60 text-sm text-center mb-2">
						Enter the year (e.g. 1969)
					</Text>
					<AnswerInput onSubmit={sendInput} disabled={false} />
				</>
			) : (
				<HostWaitCard
					message="Awaiting your turn to guess..."
					accentColor={YEAR_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const results = parseRevealResults(sharedData.results);

	if (!results) {
		return (
			<PhaseShell
				title="Solomon's Bet"
				subtitle="Revealing the year..."
				accentColor={YEAR_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Computing results..."
					accentColor={YEAR_ACCENT}
				/>
			</PhaseShell>
		);
	}

	const rows = results.guesses.map((g) => {
		const guessLabel =
			g.guess !== null
				? `${g.playerName}: ${g.guess}`
				: `${g.playerName}: (no guess)`;
		const diff =
			g.guess !== null ? Math.abs(g.guess - results.actualYear) : null;
		const detail = g.isPerfect
			? "Perfect! (too close!) -500 pts"
			: g.isClose
				? "Very close! 0 pts"
				: diff !== null
					? `Off by ${diff} years (+${g.points} pts)`
					: `+${g.points} pts`;
		return {
			label: guessLabel,
			detail,
			highlight: g.isClose || (g.guess !== null && diff !== null && diff <= 5),
		};
	});

	return (
		<PhaseShell
			title="Solomon's Bet"
			subtitle="The answer is revealed!"
			accentColor={YEAR_ACCENT}
			isHost={isHost}
		>
			<View
				className="w-full p-5 rounded-2xl border-2 mb-4 items-center"
				style={{ borderColor: YEAR_ACCENT }}
			>
				<Text
					className="font-inter text-xs uppercase tracking-widest mb-1"
					style={{ color: YEAR_ACCENT }}
				>
					{results.event}
				</Text>
				<Text className="font-lora font-bold text-amen-cream text-5xl">
					{results.actualYear}
				</Text>
			</View>
			<ResultRevealCard
				title="How close were you?"
				rows={rows.length > 0 ? rows : [{ label: "No guesses recorded." }]}
				isHost={isHost}
			/>
		</PhaseShell>
	);
}

function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const scoreboard = parseScoreboard(sharedData.scoreboard);
	const round = asNumber(sharedData.round, 1);

	const players = scoreboard.map((e) => ({
		name: e.name,
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

	const scoreboard = parseScoreboard(sharedData.scoreboard);

	const players = scoreboard.map((e) => {
		const roomPlayer = roomState.players.find(
			(p) => p.id === e.id || p.name === e.name,
		);
		return {
			name: e.name,
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

export function registerYearJinxPhases() {
	registerGamePhases("year-jinx", {
		round_start: RoundStartPhase,
		guessing: GuessingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
