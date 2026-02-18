import { lazy, Suspense } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { AnswerInput } from "@/components/party/AnswerInput";
import { ChoiceGrid } from "@/components/party/ChoiceGrid";

const DrawingInput = lazy(() => import("@/components/party/DrawingInput"));

import { HostWaitCard } from "@/components/party/HostWaitCard";
import { PhaseShell } from "@/components/party/PhaseShell";
import { PromptCard } from "@/components/party/PromptCard";
import { ResultRevealCard } from "@/components/party/ResultRevealCard";
import { Scoreboard } from "@/components/party/Scoreboard";
import { Timer } from "@/components/party/Timer";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";

const SHIRT_CLASH_ACCENT = "#f97316";

type ShirtBrand = {
	id?: unknown;
	name?: unknown;
	image?: unknown;
	slogan?: unknown;
	imageOwner?: unknown;
	sloganOwner?: unknown;
};

type ScoreboardEntry = {
	id?: unknown;
	name?: unknown;
	score?: unknown;
};

type MatchResult = {
	winner?: unknown;
	votes?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((item): item is Record<string, unknown> =>
		isRecord(item),
	);
}

function toShirtBrand(value: unknown): ShirtBrand | null {
	if (!isRecord(value)) {
		return null;
	}
	return {
		id: value.id,
		name: value.name,
		image: value.image,
		slogan: value.slogan,
		imageOwner: value.imageOwner,
		sloganOwner: value.sloganOwner,
	};
}

function scoreRowsFromMap(
	scores: unknown,
	players: PhaseRendererProps["roomState"]["players"],
): Array<{ playerName: string; score: number }> {
	if (!isRecord(scores)) {
		return [];
	}

	return players
		.map((player) => {
			return {
				playerName: player.name,
				score: asNumber(scores[player.id]),
			};
		})
		.filter((row) => row.score > 0);
}

function scoreRowsFromScoreboard(
	scoreboard: unknown,
): Array<{ playerName: string; score: number }> {
	return asObjectArray(scoreboard).map((row) => {
		const entry = row as ScoreboardEntry;
		return {
			playerName: asString(entry.name) || asString(entry.id, "Unknown"),
			score: asNumber(entry.score),
		};
	});
}

function BrandCredits({ brand }: { brand: ShirtBrand }) {
	const imageOwner = asString(brand.imageOwner);
	const sloganOwner = asString(brand.sloganOwner);

	if (!imageOwner && !sloganOwner) {
		return null;
	}

	return (
		<Text className="text-theme-text-tertiary text-xs mt-2 text-center">
			{imageOwner ? `Art: ${imageOwner}` : ""}
			{imageOwner && sloganOwner ? "  •  " : ""}
			{sloganOwner ? `Slogan: ${sloganOwner}` : ""}
		</Text>
	);
}

function ShirtCard({ brand, isHost }: { brand: ShirtBrand; isHost: boolean }) {
	const imageUri = asString(brand.image);
	const cardPadding = isHost ? "p-5" : "p-3";
	const imageHeight = isHost ? "h-52" : "h-36";
	const titleSize = isHost ? "text-2xl" : "text-lg";
	const sloganSize = isHost ? "text-lg" : "text-sm";

	return (
		<View
			className={`rounded-2xl border bg-theme-surface ${cardPadding}`}
			style={{ borderColor: SHIRT_CLASH_ACCENT }}
		>
			<Text
				className={`font-bold text-theme-text text-center mb-3 ${titleSize}`}
			>
				{asString(brand.name, "Untitled Brand")}
			</Text>
			<View
				className={`w-full rounded-xl border border-theme-border bg-theme-background overflow-hidden ${imageHeight}`}
			>
				{imageUri ? (
					<Image
						source={{ uri: imageUri }}
						resizeMode="contain"
						style={{ width: "100%", height: "100%" }}
					/>
				) : (
					<View className="w-full h-full items-center justify-center">
						<Text className="text-theme-text-secondary">
							No design uploaded
						</Text>
					</View>
				)}
			</View>
			<Text
				className={`text-theme-text mt-3 text-center font-semibold ${sloganSize}`}
			>
				{asString(brand.slogan, "No slogan")}
			</Text>
			<BrandCredits brand={brand} />
		</View>
	);
}

function CreationPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const requestType = activeInputRequest?.request.type;
	const title =
		requestType === "drawing"
			? "Draw Icon"
			: requestType === "text"
				? "Write Slogan"
				: "Creation";
	const hostMessage =
		requestType === "drawing"
			? "Players are drawing icons..."
			: requestType === "text"
				? "Players are writing slogans..."
				: "Waiting for the next creation prompt...";

	return (
		<PhaseShell
			title={title}
			subtitle={asString(
				sharedData.instructions,
				"Draw and write in alternating rounds",
			)}
			accentColor={SHIRT_CLASH_ACCENT}
			isHost={isHost}
		>
			{activeInputRequest?.request.timeLimit ? (
				<Timer
					seconds={activeInputRequest.request.timeLimit}
					size={isHost ? "large" : "normal"}
				/>
			) : null}
			{isHost ? (
				<HostWaitCard message={hostMessage} accentColor={SHIRT_CLASH_ACCENT} />
			) : requestType === "drawing" ? (
				<View className="w-full flex-1">
					<PromptCard
						text={
							activeInputRequest?.request.prompt ||
							"Draw an icon for your shirt brand"
						}
					/>
					<Suspense fallback={<ActivityIndicator />}>
						<DrawingInput onSubmit={sendInput} />
					</Suspense>
				</View>
			) : requestType === "text" ? (
				<View className="w-full flex-1">
					<PromptCard
						text={
							activeInputRequest?.request.prompt ||
							"Write a slogan players will vote for"
						}
					/>
					<AnswerInput onSubmit={sendInput} disabled={!activeInputRequest} />
				</View>
			) : (
				<HostWaitCard
					message="Waiting for your next creation turn..."
					accentColor={SHIRT_CLASH_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function AssemblyPhase({ sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const brands = asObjectArray(sharedData.brands)
		.map(toShirtBrand)
		.filter((brand): brand is ShirtBrand => brand !== null);

	return (
		<PhaseShell
			title="Assembly"
			subtitle="The algorithm paired drawings and slogans into brands"
			accentColor={SHIRT_CLASH_ACCENT}
			isHost={isHost}
		>
			<PromptCard
				text={
					brands.length > 0
						? "Fresh t-shirt brands are ready for the bracket"
						: "Assembling brands..."
				}
				size={isHost ? "large" : "normal"}
			/>
			{brands.length === 0 ? (
				<HostWaitCard
					message="Assembling brand mashups..."
					accentColor={SHIRT_CLASH_ACCENT}
				/>
			) : (
				<View className="w-full gap-3">
					{brands.map((brand) => (
						<ShirtCard
							key={asString(brand.id, asString(brand.name, "brand"))}
							brand={brand}
							isHost={isHost}
						/>
					))}
				</View>
			)}
		</PhaseShell>
	);
}

function TournamentMatchup({
	roomState,
	sharedData,
	activeInputRequest,
	sendInput,
	role,
	phaseTitle,
}: PhaseRendererProps & { phaseTitle: string }) {
	const isHost = role === "host";
	const brandA = toShirtBrand(sharedData.brandA);
	const brandB = toShirtBrand(sharedData.brandB);
	const round = asNumber(sharedData.round);
	const matchup = asNumber(sharedData.matchup);
	const totalMatchups = asNumber(sharedData.totalMatchups);
	const hasChoiceRequest = activeInputRequest?.request.type === "choice";
	const options = activeInputRequest?.request.options ?? [
		asString(brandA?.name, "Brand A"),
		asString(brandB?.name, "Brand B"),
	];
	const result = isRecord(sharedData.result)
		? (sharedData.result as MatchResult)
		: null;
	const votes = isRecord(result?.votes)
		? (result?.votes as Record<string, unknown>)
		: null;
	const scoreRows = scoreRowsFromMap(sharedData.scores, roomState.players);

	return (
		<PhaseShell
			round={round || undefined}
			totalRounds={totalMatchups || undefined}
			title={phaseTitle}
			subtitle={
				totalMatchups > 0
					? `Matchup ${matchup} of ${totalMatchups}`
					: "Vote for the shirt you would wear"
			}
			accentColor={SHIRT_CLASH_ACCENT}
			isHost={isHost}
		>
			{activeInputRequest?.request.timeLimit ? (
				<Timer
					seconds={activeInputRequest.request.timeLimit}
					size={isHost ? "large" : "normal"}
				/>
			) : null}
			{brandA && brandB ? (
				<View className="w-full flex-row gap-3">
					<View className="flex-1">
						<ShirtCard brand={brandA} isHost={isHost} />
					</View>
					<View className="flex-1">
						<ShirtCard brand={brandB} isHost={isHost} />
					</View>
				</View>
			) : (
				<HostWaitCard
					message="Preparing matchup cards..."
					accentColor={SHIRT_CLASH_ACCENT}
				/>
			)}
			{isHost ? (
				<HostWaitCard
					message="Players are voting on this matchup..."
					accentColor={SHIRT_CLASH_ACCENT}
				/>
			) : hasChoiceRequest ? (
				<View className="w-full mt-4">
					<ChoiceGrid
						choices={options}
						onSelect={(index) => sendInput(index)}
						columns={2}
						disabled={!activeInputRequest}
						accentColor={SHIRT_CLASH_ACCENT}
					/>
				</View>
			) : (
				<HostWaitCard
					message="Waiting for the vote window to open..."
					accentColor={SHIRT_CLASH_ACCENT}
				/>
			)}
			{result ? (
				<View className="w-full mt-4">
					<ResultRevealCard
						title="Match Result"
						rows={[
							{
								label: `Winner: ${asString(result.winner, "TBD")}`,
								highlight: true,
							},
							{
								label: asString(brandA?.name, "Brand A"),
								detail: `${asNumber(votes?.brandA)} vote(s)`,
							},
							{
								label: asString(brandB?.name, "Brand B"),
								detail: `${asNumber(votes?.brandB)} vote(s)`,
							},
						]}
						isHost={isHost}
					/>
				</View>
			) : null}
			{scoreRows.length > 0 ? (
				<View className="w-full mt-4">
					<Scoreboard data={scoreRows} size={isHost ? "large" : "normal"} />
				</View>
			) : null}
		</PhaseShell>
	);
}

function TournamentRoundPhase(props: PhaseRendererProps) {
	return <TournamentMatchup {...props} phaseTitle="Tournament Round" />;
}

function ChampionshipPhase(props: PhaseRendererProps) {
	return <TournamentMatchup {...props} phaseTitle="Championship" />;
}

function WinnerPhase({ roomState, sharedData, role }: PhaseRendererProps) {
	const isHost = role === "host";
	const champion = isRecord(sharedData.champion)
		? sharedData.champion
		: isRecord(sharedData.winner)
			? sharedData.winner
			: null;
	const championBrand = toShirtBrand(sharedData.championBrand);
	const leaderboard = scoreRowsFromScoreboard(sharedData.scoreboard);
	const fallbackScores = scoreRowsFromMap(sharedData.scores, roomState.players);
	const scoreRows = leaderboard.length > 0 ? leaderboard : fallbackScores;

	return (
		<PhaseShell
			title="Winner"
			subtitle="The bracket is settled"
			accentColor={SHIRT_CLASH_ACCENT}
			isHost={isHost}
		>
			<Text
				className={`font-bold text-center text-theme-primary ${isHost ? "text-4xl" : "text-2xl"}`}
			>
				🎉 CHAMPION BRAND 🎉
			</Text>
			<ResultRevealCard
				title="Top Designer"
				rows={[
					{
						label: asString(champion?.name, "Unknown Champion"),
						detail: `${asNumber(champion?.score)} points`,
						highlight: true,
					},
				]}
				isHost={isHost}
			/>
			{championBrand ? <ShirtCard brand={championBrand} isHost={true} /> : null}
			{scoreRows.length > 0 ? (
				<View className="w-full mt-4">
					<Scoreboard
						data={scoreRows}
						highlightWinner
						size={isHost ? "large" : "normal"}
					/>
				</View>
			) : null}
		</PhaseShell>
	);
}

export function registerShirtClashPhases() {
	registerGamePhases("shirt-clash", {
		creation: CreationPhase,
		assembly: AssemblyPhase,
		tournament_round: TournamentRoundPhase,
		championship: ChampionshipPhase,
		winner: WinnerPhase,
	});
}
