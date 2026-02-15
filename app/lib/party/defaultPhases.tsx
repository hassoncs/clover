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
	return (
		<View className="w-full flex-1 items-center">
			<Timer seconds={(sharedData.timerRemaining as number) || 0} />
			<PromptCard
				text={(sharedData.promptText as string) || "Waiting for prompt..."}
			/>
			{role === "player" ? (
				<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
			) : (
				<View className="mt-8 p-6 bg-theme-surface rounded-xl border border-theme-border">
					<Text className="text-theme-text text-xl text-center">
						Players are writing their answers...
					</Text>
				</View>
			)}
		</View>
	);
}

export function RevealPhase({ sharedData }: PhaseRendererProps) {
	const revealAnswers: Array<{ id: string; text: string }> =
		sharedData.answersJson ? JSON.parse(sharedData.answersJson as string) : [];
	return (
		<View className="w-full flex-1 items-center">
			<PromptCard text={(sharedData.promptText as string) || ""} />
			<View className="w-full mt-4 gap-2">
				{revealAnswers.map((a: { id: string; text: string }) => (
					<View
						key={a.id}
						className="bg-theme-surface p-4 rounded-xl border border-theme-border"
					>
						<Text className="text-theme-text text-base">{a.text}</Text>
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
	return (
		<View className="w-full flex-1 items-center">
			<Timer seconds={(sharedData.timerRemaining as number) || 0} />
			<PromptCard text={(sharedData.promptText as string) || ""} />
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
				<View className="mt-8 p-6 bg-theme-surface rounded-xl border border-theme-border">
					<Text className="text-theme-text text-xl text-center">
						Players are voting...
					</Text>
				</View>
			)}
		</View>
	);
}

export function RoundResultsPhase({ sharedData }: PhaseRendererProps) {
	const results: Array<{
		text: string;
		authorName: string;
		voteCount: number;
		points: number;
	}> = sharedData.resultsJson
		? JSON.parse(sharedData.resultsJson as string)
		: [];
	return (
		<View className="w-full flex-1">
			<PromptCard text={(sharedData.promptText as string) || ""} />
			<View className="w-full mt-4 gap-2">
				{results.map((r) => (
					<View
						key={`${r.authorName}-${r.text}`}
						className="bg-theme-surface p-4 rounded-xl border border-theme-border"
					>
						<Text className="text-theme-text text-base font-bold">
							"{r.text}"
						</Text>
						<View className="flex-row justify-between mt-2">
							<Text className="text-theme-text-secondary text-sm">
								— {r.authorName}
							</Text>
							<Text className="text-purple-400 text-sm font-bold">
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

export function ScoresPhase({ sharedData }: PhaseRendererProps) {
	return (
		<View className="w-full flex-1">
			<Text className="text-2xl font-bold text-theme-text text-center mb-6">
				Leaderboard
			</Text>
			<Scoreboard
				data={
					sharedData.scoreboardJson
						? JSON.parse(sharedData.scoreboardJson as string)
						: []
				}
			/>
		</View>
	);
}

export function WinnerPhase({ sharedData }: PhaseRendererProps) {
	const router = useRouter();
	return (
		<View className="w-full flex-1 items-center">
			<Text className="text-4xl font-bold text-theme-primary text-center mb-2">
				Game Over!
			</Text>
			<Text className="text-xl text-theme-text text-center mb-8">
				Final Scores
			</Text>
			<Scoreboard
				data={
					sharedData.scoreboardJson
						? JSON.parse(sharedData.scoreboardJson as string)
						: []
				}
				highlightWinner
			/>
			<View className="w-full gap-3 mt-6">
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
