import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { PromptCard } from "@/components/party/PromptCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { VoteList } from "@/components/party/VoteList";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

export function AnsweringPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	return (
		<View className="w-full flex-1 items-center justify-center p-4">
			<Timer
				seconds={(sharedData.timerRemaining as number) || 0}
				size={isHost ? "large" : "normal"}
			/>
			<PromptCard
				text={(sharedData.promptText as string) || "Waiting for prompt..."}
				size={isHost ? "large" : "normal"}
			/>
			{role === "player" ? (
				<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
			) : (
				<View className="mt-12 p-8 bg-theme-surface rounded-2xl border-2 border-theme-border w-full max-w-2xl items-center">
					<Text className="text-theme-text text-4xl font-bold text-center">
						Players are writing...
					</Text>
				</View>
			)}
		</View>
	);
}

export function RevealPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const revealAnswers: Array<{ id: string; text: string }> =
		sharedData.answersJson ? JSON.parse(sharedData.answersJson as string) : [];
	return (
		<View className="w-full flex-1 items-center p-4">
			<PromptCard
				text={(sharedData.promptText as string) || ""}
				size={isHost ? "large" : "normal"}
			/>
			<View className="w-full mt-4 gap-4 items-center">
				{revealAnswers.map((a: { id: string; text: string }) => (
					<View
						key={a.id}
						className={`bg-theme-surface rounded-xl border border-theme-border ${isHost ? "p-8 w-full max-w-3xl" : "p-4 w-full"}`}
					>
						<Text
							className={`text-theme-text ${isHost ? "text-3xl text-center" : "text-base"}`}
						>
							{a.text}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

export function VotingPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	return (
		<View className="w-full flex-1 items-center justify-center p-4">
			<Timer
				seconds={(sharedData.timerRemaining as number) || 0}
				size={isHost ? "large" : "normal"}
			/>
			<PromptCard
				text={(sharedData.promptText as string) || ""}
				size={isHost ? "large" : "normal"}
			/>
			{role === "player" ? (
				<VoteList
					options={
						sharedData.voteOptionsJson
							? JSON.parse(sharedData.voteOptionsJson as string)
							: []
					}
					onVote={sendInput}
					disabled={!activeInputRequest}
				/>
			) : (
				<View className="mt-12 p-8 bg-theme-surface rounded-2xl border-2 border-theme-border w-full max-w-2xl items-center">
					<Text className="text-theme-text text-4xl font-bold text-center">
						Players are voting...
					</Text>
				</View>
			)}
		</View>
	);
}

export function RoundResultsPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const results: Array<{
		text: string;
		authorName: string;
		voteCount: number;
		points: number;
	}> = sharedData.resultsJson
		? JSON.parse(sharedData.resultsJson as string)
		: [];
	return (
		<View className="w-full flex-1 items-center p-4">
			<PromptCard
				text={(sharedData.promptText as string) || ""}
				size={isHost ? "large" : "normal"}
			/>
			<View className="w-full mt-4 gap-4 items-center">
				{results.map((r) => (
					<View
						key={`${r.authorName}-${r.text}`}
						className={`bg-theme-surface rounded-xl border border-theme-border ${isHost ? "p-8 w-full max-w-3xl" : "p-4 w-full"}`}
					>
						<Text
							className={`text-theme-text font-bold ${isHost ? "text-3xl text-center" : "text-base"}`}
						>
							"{r.text}"
						</Text>
						<View className="flex-row justify-between mt-4 items-center">
							<Text
								className={`text-theme-text-secondary ${isHost ? "text-xl" : "text-sm"}`}
							>
								— {r.authorName}
							</Text>
							<Text
								className={`text-purple-400 font-bold ${isHost ? "text-2xl" : "text-sm"}`}
							>
								{r.voteCount} vote
								{r.voteCount !== 1 ? "s" : ""} (+{r.points})
							</Text>
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

export function ScoresPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	return (
		<View className="w-full flex-1 p-4">
			<Text
				className={`font-bold text-theme-text text-center mb-6 ${isHost ? "text-5xl" : "text-2xl"}`}
			>
				Leaderboard
			</Text>
			<Scoreboard
				data={
					sharedData.scoreboardJson
						? JSON.parse(sharedData.scoreboardJson as string)
						: []
				}
				size={isHost ? "large" : "normal"}
			/>
		</View>
	);
}

export function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const router = useRouter();
	const isHost = role === "host";
	return (
		<View className="w-full flex-1 items-center p-4">
			<Text
				className={`font-bold text-theme-primary text-center mb-4 ${isHost ? "text-6xl" : "text-4xl"}`}
			>
				Game Over!
			</Text>
			<Text
				className={`text-theme-text text-center mb-8 ${isHost ? "text-3xl" : "text-xl"}`}
			>
				Final Scores
			</Text>
			<Scoreboard
				data={
					sharedData.scoreboardJson
						? JSON.parse(sharedData.scoreboardJson as string)
						: []
				}
				highlightWinner
				size={isHost ? "large" : "normal"}
			/>
			<View className="w-full gap-3 mt-6 max-w-md">
				<Pressable
					onPress={() => router.replace("/party")}
					className="w-full bg-theme-surface p-4 rounded-xl items-center border border-theme-border active:opacity-90"
				>
					<Text className="text-theme-text text-lg font-bold">Leave Game</Text>
				</Pressable>
			</View>
		</View>
	);
}

export function registerDefaultPhases() {
	registerGamePhases("default", {
		answering: AnsweringPhase,
		reveal: RevealPhase,
		voting: VotingPhase,
		round_results: RoundResultsPhase,
		scores: ScoresPhase,
		winner: WinnerPhase,
	});
}
