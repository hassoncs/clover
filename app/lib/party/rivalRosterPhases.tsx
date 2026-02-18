import { lazy, Suspense } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

const DrawingInput = lazy(() => import("@/components/party/DrawingInput"));

import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const RIVAL_ACCENT = "#f43f5e";
const DEFAULT_DRAW_TIME = 60;

type RivalBattle = {
	championId: string;
	championName: string;
	championDrawing: unknown;
	challengerId: string;
	challengerName: string;
	challengerDrawing: unknown;
	votes?: Array<{ voterName?: string; vote: number | string }>;
	winnerId?: string | null;
	championVotes?: number;
	challengerVotes?: number;
	isChallengerWin?: boolean;
};

type RivalWinner = {
	id: string;
	name: string;
	score: number;
};

type RivalScoreboardRow = {
	id?: string;
	name?: string;
	score: number;
};

function imageSource(drawingData: unknown): { uri: string } | undefined {
	if (typeof drawingData === "string" && drawingData.length > 0) {
		return { uri: drawingData };
	}
	return undefined;
}

function BattleDrawingsPanel({
	battle,
	isHost,
}: {
	battle: RivalBattle;
	isHost: boolean;
}) {
	const cardClass = isHost ? "p-6" : "p-3";
	const imageHeightClass = isHost ? "h-72" : "h-40";
	const textSizeClass = isHost ? "text-2xl" : "text-base";

	return (
		<View className="w-full flex-row gap-3">
			<View
				className={`flex-1 rounded-2xl border border-theme-border bg-theme-surface ${cardClass}`}
			>
				<Text className={`${textSizeClass} font-bold text-theme-text mb-2`}>
					Champion: {battle.championName}
				</Text>
				<Image
					source={imageSource(battle.championDrawing)}
					className={`w-full rounded-xl bg-black/10 ${imageHeightClass}`}
					resizeMode="contain"
				/>
			</View>
			<View
				className={`flex-1 rounded-2xl border border-theme-border bg-theme-surface ${cardClass}`}
			>
				<Text className={`${textSizeClass} font-bold text-theme-text mb-2`}>
					Challenger: {battle.challengerName}
				</Text>
				<Image
					source={imageSource(battle.challengerDrawing)}
					className={`w-full rounded-xl bg-black/10 ${imageHeightClass}`}
					resizeMode="contain"
				/>
			</View>
		</View>
	);
}

function ChampionPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = (sharedData.round as number) || 1;
	const title = (sharedData.title as string) || "Draw your Champion";
	const hasDrawingRequest = activeInputRequest?.request.type === "drawing";

	return (
		<PhaseShell
			round={round}
			title="Champion Draw"
			subtitle="Champions sketch first"
			timerSeconds={
				hasDrawingRequest
					? (activeInputRequest?.request.timeLimit ?? DEFAULT_DRAW_TIME)
					: undefined
			}
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={title} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Champions are drawing..."
					accentColor={RIVAL_ACCENT}
				/>
			) : hasDrawingRequest ? (
				<View className="w-full flex-1">
					<Suspense fallback={<ActivityIndicator />}>
						<DrawingInput
							onSubmit={(value) => sendInput(value)}
							colors={["#0f172a", RIVAL_ACCENT, "#fb7185", "#fecdd3"]}
						/>
					</Suspense>
				</View>
			) : (
				<HostWaitCard
					message="Waiting for Champion round to finish..."
					accentColor={RIVAL_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function ChallengerPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const round = (sharedData.round as number) || 1;
	const title = (sharedData.title as string) || "Draw your Challenger";
	const hasDrawingRequest = activeInputRequest?.request.type === "drawing";

	return (
		<PhaseShell
			round={round}
			title="Challenger Draw"
			subtitle="Counter-sketch the Champion"
			timerSeconds={
				hasDrawingRequest
					? (activeInputRequest?.request.timeLimit ?? DEFAULT_DRAW_TIME)
					: undefined
			}
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={title} size={isHost ? "large" : "normal"} />
			{isHost ? (
				<HostWaitCard
					message="Challengers are drawing..."
					accentColor={RIVAL_ACCENT}
				/>
			) : hasDrawingRequest ? (
				<View className="w-full flex-1">
					<Suspense fallback={<ActivityIndicator />}>
						<DrawingInput
							onSubmit={(value) => sendInput(value)}
							colors={["#0f172a", RIVAL_ACCENT, "#fb7185", "#fecdd3"]}
						/>
					</Suspense>
				</View>
			) : (
				<HostWaitCard
					message="Waiting for Challenger round to finish..."
					accentColor={RIVAL_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function BattleRevealPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const battle = (sharedData.battle as RivalBattle | undefined) ?? null;

	if (!battle) {
		return (
			<PhaseShell
				title="Battle Reveal"
				accentColor={RIVAL_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Preparing battle..."
					accentColor={RIVAL_ACCENT}
				/>
			</PhaseShell>
		);
	}

	return (
		<PhaseShell
			round={(sharedData.round as number) || 1}
			title="Battle Reveal"
			subtitle="Champion vs Challenger"
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text={`Who owns "${(sharedData.title as string) || "this title"}"?`}
				size={isHost ? "large" : "normal"}
			/>
			<BattleDrawingsPanel battle={battle} isHost={isHost} />
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
	const battle = (sharedData.battle as RivalBattle | undefined) ?? null;
	const hasVoteRequest = activeInputRequest?.request.type === "choice";
	const voteOptions =
		activeInputRequest?.request.options?.map((option, index) => ({
			id: String(index),
			text: option,
		})) ??
		(battle
			? [
					{ id: "0", text: `${battle.championName} (Champion)` },
					{ id: "1", text: `${battle.challengerName} (Challenger)` },
				]
			: []);

	return (
		<PhaseShell
			round={(sharedData.round as number) || 1}
			title="Vote The Winner"
			timerSeconds={
				hasVoteRequest ? activeInputRequest?.request.timeLimit : undefined
			}
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			{battle && <BattleDrawingsPanel battle={battle} isHost={isHost} />}
			{isHost ? (
				<HostWaitCard
					message="Players are voting..."
					accentColor={RIVAL_ACCENT}
				/>
			) : hasVoteRequest ? (
				<View className="w-full mt-4">
					<VoteList
						options={voteOptions}
						onVote={(choice) => sendInput(Number(choice))}
						disabled={!activeInputRequest}
					/>
				</View>
			) : (
				<HostWaitCard
					message="Waiting for voting window..."
					accentColor={RIVAL_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function BattleResultPhase({
	roomState,
	sharedData,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const battle = (sharedData.battle as RivalBattle | undefined) ?? null;
	const scores =
		(sharedData.scores as Record<string, number> | undefined) ?? {};

	if (!battle) {
		return (
			<PhaseShell
				title="Battle Result"
				accentColor={RIVAL_ACCENT}
				isHost={isHost}
			>
				<HostWaitCard
					message="Computing result..."
					accentColor={RIVAL_ACCENT}
				/>
			</PhaseShell>
		);
	}

	const winnerName =
		battle.winnerId === battle.championId
			? battle.championName
			: battle.challengerName;
	const rows = [
		{
			label: `${battle.championName} (Champion)`,
			detail: `${battle.championVotes ?? 0} vote(s)`,
			highlight: battle.winnerId === battle.championId,
		},
		{
			label: `${battle.challengerName} (Challenger)`,
			detail: `${battle.challengerVotes ?? 0} vote(s)`,
			highlight: battle.winnerId === battle.challengerId,
		},
		{
			label: `Winner: ${winnerName}`,
			detail: battle.isChallengerWin
				? "Underdog bonus awarded"
				: "Champion defended the title",
			highlight: true,
		},
	];

	const scoreRows = roomState.players
		.filter((player) => typeof scores[player.id] === "number")
		.map((player) => ({
			playerName: player.name,
			score: scores[player.id] ?? 0,
		}));

	return (
		<PhaseShell
			round={(sharedData.round as number) || 1}
			title="Battle Result"
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard title="Votes In" rows={rows} isHost={isHost} />
			{scoreRows.length > 0 && (
				<View className="w-full mt-4">
					<Text
						className={`font-bold text-theme-text mb-3 text-center ${isHost ? "text-2xl" : "text-lg"}`}
					>
						Current Standings
					</Text>
					<Scoreboard data={scoreRows} size={isHost ? "large" : "normal"} />
				</View>
			)}
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const winner = (sharedData.winner as RivalWinner | undefined) ?? null;
	const scoreboardData = (
		(sharedData.scoreboard as RivalScoreboardRow[] | undefined) ?? []
	).map((row) => ({
		playerName: row.name ?? row.id ?? "Unknown",
		score: row.score,
	}));

	return (
		<PhaseShell
			title="Rival Roster Winner"
			subtitle={
				winner ? `${winner.name} takes the crown` : "Final showdown complete"
			}
			accentColor={RIVAL_ACCENT}
			isHost={isHost}
		>
			<ResultRevealCard
				title="Champion of the Arena"
				rows={
					winner
						? [
								{
									label: winner.name,
									detail: `${winner.score} points`,
									highlight: true,
								},
							]
						: [{ label: "No winner data available" }]
				}
				isHost={isHost}
			/>
			<View className="w-full mt-4">
				<Scoreboard
					data={scoreboardData}
					highlightWinner
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

export function registerRivalRosterPhases() {
	registerGamePhases("rival-roster", {
		champion_phase: ChampionPhase,
		challenger_phase: ChallengerPhase,
		battle_reveal: BattleRevealPhase,
		voting: VotingPhase,
		battle_result: BattleResultPhase,
		winner: WinnerPhase,
	});
}
