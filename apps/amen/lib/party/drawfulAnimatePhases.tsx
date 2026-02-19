import { useRouter } from "expo-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";

const DrawingInput = lazy(() => import("@/components/party/DrawingInput"));

import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { AnswerRevealSequence } from "@/components/party/results/AnswerRevealSequence";
import { FinalPodium } from "@/components/party/results/FinalPodium";
import { RoundScoreBoard } from "@/components/party/results/RoundScoreBoard";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";
import { usePartyNarration } from "./usePartyNarration";

const ACCENT_COLOR = "#f59e0b";

type DrawingPhaseSharedData = {
	phase: "drawing_f1" | "drawing_f2";
	round: number;
	totalRounds: number;
};

type BluffingSharedData = {
	phase: "bluffing";
	round: number;
};

type AnimationPreviewData = {
	frame1?: unknown;
	frame2?: unknown;
	artistName?: unknown;
	titles?: unknown;
};

type VotingSharedData = {
	phase: "voting";
	round: number;
	currentAnimation?: AnimationPreviewData;
};

type RevealTitle = {
	text?: unknown;
	authorId?: unknown;
	authorName?: unknown;
	isReal?: unknown;
};

type RevealVote = {
	guesserName?: unknown;
	votedText?: unknown;
	isCorrect?: unknown;
};

type RevealResults = {
	animation?: AnimationPreviewData;
	realPrompt?: unknown;
	artistId?: unknown;
	artistName?: unknown;
	titles?: unknown;
	votes?: unknown;
	pointsEarned?: unknown;
};

type RevealSharedData = {
	phase: "reveal";
	results?: RevealResults;
	scores?: unknown;
};

type ScoreboardRow = {
	id: unknown;
	name: unknown;
	score: unknown;
};

type ScoresSharedData = {
	phase: "scores";
	scoreboard?: unknown;
	round?: number;
};

type WinnerSharedData = {
	phase: "winner";
	winner?: {
		id?: unknown;
		name?: unknown;
		score?: unknown;
	};
	scoreboard?: unknown;
};

function toNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringOrEmpty(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((item): item is string => typeof item === "string");
}

function mapScoreboard(
	scoreboard: unknown,
): Array<{ playerName: string; score: number }> {
	if (!Array.isArray(scoreboard)) {
		return [];
	}

	return scoreboard.map((row) => {
		const item = row as ScoreboardRow;
		const playerName = toStringOrEmpty(item.name) || toStringOrEmpty(item.id);
		return {
			playerName,
			score: toNumber(item.score),
		};
	});
}

function extractFirstAssignedAnimation(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
): AnimationPreviewData | null {
	const assignments = activeInputRequest?.request.metadata?.assignments;
	if (!assignments || typeof assignments !== "object") {
		return null;
	}

	const values = Object.values(assignments);
	if (
		values.length === 0 ||
		typeof values[0] !== "object" ||
		values[0] === null
	) {
		return null;
	}

	return values[0] as AnimationPreviewData;
}

function AnimationFlipPreview({
	frame1,
	frame2,
	label,
}: {
	frame1?: string;
	frame2?: string;
	label?: string;
}) {
	const [showFirstFrame, setShowFirstFrame] = useState(true);

	useEffect(() => {
		if (!frame1 || !frame2) {
			return;
		}

		const intervalId = setInterval(() => {
			setShowFirstFrame((prev) => !prev);
		}, 700);

		return () => clearInterval(intervalId);
	}, [frame1, frame2]);

	if (!frame1 && !frame2) {
		return null;
	}

	const shownFrame = showFirstFrame ? frame1 || frame2 : frame2 || frame1;

	return (
		<View className="w-full items-center mb-4">
			{label ? (
				<Text className="text-theme-text-secondary mb-2 text-center">
					{label}
				</Text>
			) : null}
			<View
				className="w-full max-w-md aspect-square bg-theme-surface border-2 rounded-2xl overflow-hidden"
				style={{ borderColor: ACCENT_COLOR }}
			>
				<Image
					source={{ uri: shownFrame }}
					resizeMode="contain"
					style={{ width: "100%", height: "100%" }}
				/>
			</View>
		</View>
	);
}

function DrawingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
	frameNumber,
}: PhaseRendererProps & { frameNumber: 1 | 2 }) {
	const isHost = role === "host";
	const data = sharedData as unknown as DrawingPhaseSharedData;
	const title = frameNumber === 1 ? "Draw Frame 1" : "Draw Frame 2";
	const subtitle =
		frameNumber === 1
			? "Sketch the starting pose of your animation"
			: "Complete the motion with a second frame";

	return (
		<PhaseShell
			round={toNumber(data.round)}
			totalRounds={toNumber(data.totalRounds)}
			title={title}
			subtitle={subtitle}
			timerSeconds={activeInputRequest?.request.timeLimit}
			accentColor={ACCENT_COLOR}
			isHost={isHost}
		>
			{isHost ? (
				<HostWaitCard
					message={
						frameNumber === 1
							? "Players are drawing Frame 1..."
							: "Players are drawing Frame 2..."
					}
					accentColor={ACCENT_COLOR}
				/>
			) : (
				<View className="w-full flex-1">
					<PromptCard
						text={
							activeInputRequest?.request.prompt ||
							(frameNumber === 1 ? "Draw Frame 1" : "Draw Frame 2")
						}
					/>
					<Suspense fallback={<ActivityIndicator />}>
						<DrawingInput onSubmit={sendInput} />
					</Suspense>
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
	const isHost = role === "host";
	const data = sharedData as unknown as BluffingSharedData;
	const assignedAnimation = extractFirstAssignedAnimation(activeInputRequest);

	return (
		<PhaseShell
			round={toNumber(data.round)}
			title="Bluffing"
			subtitle="Invent a fake title that sounds believable"
			timerSeconds={activeInputRequest?.request.timeLimit}
			accentColor={ACCENT_COLOR}
			isHost={isHost}
		>
			{isHost ? (
				<HostWaitCard
					message="Players are writing fake titles..."
					accentColor={ACCENT_COLOR}
				/>
			) : (
				<View className="w-full">
					<AnimationFlipPreview
						frame1={toStringOrEmpty(assignedAnimation?.frame1)}
						frame2={toStringOrEmpty(assignedAnimation?.frame2)}
						label="Your assigned animation"
					/>
					<PromptCard
						text={
							activeInputRequest?.request.prompt ||
							"Write a fake title for this flickering animation"
						}
					/>
					<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
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
	const isHost = role === "host";
	const data = sharedData as unknown as VotingSharedData;
	const currentAnimation = data.currentAnimation;
	const voteTitles = toStringArray(currentAnimation?.titles);
	const voteOptions = voteTitles.map((title, index) => ({
		id: String(index),
		text: title,
	}));

	return (
		<PhaseShell
			round={toNumber(data.round)}
			title="Voting"
			subtitle="Pick the real animation title"
			timerSeconds={activeInputRequest?.request.timeLimit}
			accentColor={ACCENT_COLOR}
			isHost={isHost}
		>
			<AnimationFlipPreview
				frame1={toStringOrEmpty(currentAnimation?.frame1)}
				frame2={toStringOrEmpty(currentAnimation?.frame2)}
				label={
					toStringOrEmpty(currentAnimation?.artistName)
						? `Artist: ${toStringOrEmpty(currentAnimation?.artistName)}`
						: "Current animation"
				}
			/>
			{isHost ? (
				<HostWaitCard
					message="Players are voting on titles..."
					accentColor={ACCENT_COLOR}
				/>
			) : (
				<VoteList
					options={voteOptions}
					onVote={(answerId) => {
						const index = Number(answerId);
						if (Number.isFinite(index)) {
							sendInput(index);
						}
					}}
					disabled={!activeInputRequest}
				/>
			)}
		</PhaseShell>
	);
}

function RevealPhase({ sharedData }: PhaseRendererProps) {
	const data = sharedData as unknown as RevealSharedData;
	const results = data.results;

	const answers = useMemo(() => {
		const titles = Array.isArray(results?.titles)
			? (results.titles as RevealTitle[])
			: [];
		const votes = Array.isArray(results?.votes)
			? (results.votes as RevealVote[])
			: [];

		return titles.map((title) => ({
			text: toStringOrEmpty(title.text) || "Untitled",
			authorName: toStringOrEmpty(title.authorName) || "Unknown",
			voteCount: votes.filter(
				(v) => toStringOrEmpty(v.votedText) === toStringOrEmpty(title.text),
			).length,
		}));
	}, [results]);

	return (
		<View className="flex-1 bg-amen-navy">
			<AnimationFlipPreview
				frame1={toStringOrEmpty(results?.animation?.frame1)}
				frame2={toStringOrEmpty(results?.animation?.frame2)}
				label={
					toStringOrEmpty(results?.artistName)
						? `Artist: ${toStringOrEmpty(results?.artistName)}`
						: undefined
				}
			/>
			<AnswerRevealSequence answers={answers} />
		</View>
	);
}

function ScoresPhase({ sharedData }: PhaseRendererProps) {
	const data = sharedData as unknown as ScoresSharedData;
	const scoreboard = mapScoreboard(data.scoreboard);

	const players = scoreboard.map((row) => ({
		name: row.playerName,
		score: row.score,
		scoreDelta: 0,
	}));

	return <RoundScoreBoard players={players} round={toNumber(data.round, 1)} />;
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const router = useRouter();
	const { narrate } = usePartyNarration();
	const narratedRef = useRef(false);
	const isHost = role === "host";
	const data = sharedData as unknown as WinnerSharedData;
	const scoreboard = mapScoreboard(data.scoreboard);

	const players = scoreboard.map((row) => ({
		name: row.playerName,
		score: row.score,
	}));

	useEffect(() => {
		if (!narratedRef.current && isHost) {
			narratedRef.current = true;
			void narrate("Well done, good and faithful servant!");
		}
	}, [isHost, narrate]);

	return (
		<FinalPodium
			players={players}
			onPlayAgain={() => router.replace("/party")}
			onBackToHall={() => router.replace("/")}
		/>
	);
}

function DrawingFrame1Phase(props: PhaseRendererProps) {
	return <DrawingPhase {...props} frameNumber={1} />;
}

function DrawingFrame2Phase(props: PhaseRendererProps) {
	return <DrawingPhase {...props} frameNumber={2} />;
}

export function registerDrawfulAnimatePhases() {
	registerGamePhases("drawful-animate", {
		drawing_f1: DrawingFrame1Phase,
		drawing_f2: DrawingFrame2Phase,
		bluffing: BluffingPhase,
		voting: VotingPhase,
		reveal: RevealPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
