import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerInput } from "@/components/party/AnswerInput";
import { PromptCard } from "@/components/party/PromptCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { VoteList } from "@/components/party/VoteList";
import { PartyProvider, useParty } from "@/lib/party/PartyContext";

function GameContent() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { roomState, activeInputRequest, sendInput, role, connectionStatus } =
		useParty();

	if (!roomState) {
		return (
			<View className="flex-1 items-center justify-center bg-theme-background">
				<ActivityIndicator size="large" color="#A855F7" />
				<Text className="text-theme-text mt-4">Connecting...</Text>
			</View>
		);
	}

	const roomPhase = roomState.phase;
	const sharedData = (roomState.sharedData || {}) as any;
	const gamePhase = sharedData.phase;

	if (roomPhase === "lobby") {
		return (
			<View className="flex-1 items-center justify-center">
				<Text className="text-theme-text text-lg">
					Waiting for host to start...
				</Text>
			</View>
		);
	}

	const renderPhaseContent = () => {
		switch (gamePhase) {
			case "answering":
				return (
					<View className="w-full flex-1 items-center">
						<Timer seconds={sharedData.timerRemaining || 0} />
						<PromptCard
							text={sharedData.promptText || "Waiting for prompt..."}
						/>
						{role === "player" ? (
							<AnswerInput
								onSubmit={sendInput}
								disabled={!activeInputRequest}
							/>
						) : (
							<View className="mt-8 p-6 bg-theme-surface rounded-xl border border-theme-border">
								<Text className="text-theme-text text-xl text-center">
									Players are writing their answers...
								</Text>
							</View>
						)}
					</View>
				);

			case "reveal": {
				const revealAnswers: Array<{ id: string; text: string }> =
					sharedData.answersJson ? JSON.parse(sharedData.answersJson) : [];
				return (
					<View className="w-full flex-1 items-center">
						<PromptCard text={sharedData.promptText || ""} />
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

			case "voting":
				return (
					<View className="w-full flex-1 items-center">
						<Timer seconds={sharedData.timerRemaining || 0} />
						<PromptCard text={sharedData.promptText || ""} />
						{role === "player" ? (
							<VoteList
								options={
									sharedData.voteOptionsJson
										? JSON.parse(sharedData.voteOptionsJson)
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

			case "round_results": {
				const results: Array<{
					text: string;
					authorName: string;
					voteCount: number;
					points: number;
				}> = sharedData.resultsJson ? JSON.parse(sharedData.resultsJson) : [];
				return (
					<View className="w-full flex-1">
						<PromptCard text={sharedData.promptText || ""} />
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
											{r.voteCount !== 1 ? "s" : ""} (+
											{r.points})
										</Text>
									</View>
								</View>
							))}
						</View>
					</View>
				);
			}

			case "scores":
				return (
					<View className="w-full flex-1">
						<Text className="text-2xl font-bold text-theme-text text-center mb-6">
							Leaderboard
						</Text>
						<Scoreboard
							data={
								sharedData.scoreboardJson
									? JSON.parse(sharedData.scoreboardJson)
									: []
							}
						/>
					</View>
				);

			case "winner":
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
									? JSON.parse(sharedData.scoreboardJson)
									: []
							}
							highlightWinner
						/>
						<View className="w-full gap-3 mt-6">
							<Pressable
								onPress={() => router.replace("/party")}
								className="w-full bg-theme-surface p-4 rounded-xl items-center border border-theme-border active:opacity-90"
							>
								<Text className="text-theme-text text-lg font-bold">
									Leave Game
								</Text>
							</Pressable>
						</View>
					</View>
				);

			default:
				return (
					<View className="flex-1 items-center justify-center">
						<Text className="text-theme-text text-lg">
							Waiting for game to start...
						</Text>
					</View>
				);
		}
	};

	return (
		<View
			className="flex-1 bg-theme-background p-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View className="w-full flex-row justify-between items-center mb-6">
				<Pressable
					onPress={() => router.replace("/party")}
					className="p-2 rounded-full bg-theme-surface active:opacity-80"
				>
					<Ionicons name="close" size={24} color="white" />
				</Pressable>
				<View
					className={`px-3 py-1 rounded-full ${connectionStatus === "connected" ? "bg-green-500/20" : "bg-red-500/20"}`}
				>
					<Text
						className={`text-xs font-bold ${connectionStatus === "connected" ? "text-green-400" : "text-red-400"}`}
					>
						{connectionStatus.toUpperCase()}
					</Text>
				</View>
			</View>

			{renderPhaseContent()}
		</View>
	);
}

export default function PartyPlayScreen() {
	const params = useLocalSearchParams<{
		code: string;
		name?: string;
		role: "host" | "player";
		hostToken?: string;
	}>();

	if (!params.code || !params.role) {
		return (
			<View className="flex-1 bg-theme-background items-center justify-center">
				<Text className="text-theme-error">Missing game info</Text>
			</View>
		);
	}

	return (
		// eslint-disable-next-line jsx-a11y/aria-role
		<PartyProvider
			code={params.code}
			role={params.role}
			name={params.name}
			hostToken={params.hostToken}
		>
			<GameContent />
		</PartyProvider>
	);
}
