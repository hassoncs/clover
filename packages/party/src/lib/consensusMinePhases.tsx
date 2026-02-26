import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { ChoiceGrid } from "../components/ChoiceGrid";
import { HostWaitCard } from "../components/HostWaitCard";
import { PhaseShell } from "../components/PhaseShell";
import { PromptCard } from "../components/PromptCard";
import { ResultRevealCard } from "../components/ResultRevealCard";
import { FinalPodium } from "../components/results/FinalPodium";
import { Scoreboard } from "../components/Scoreboard";
import { Timer } from "../components/Timer";
import { type PhaseRendererProps, registerGamePhases } from "./phaseRegistry";
import { usePartyNarration } from "./usePartyNarration";

const CONSENSUS_MINE_ACCENT = "#f59e0b";

type TeamId = "diggers" | "drillers";

type TeamNames = {
	diggers: string;
	drillers: string;
};

type TeamNumbers = {
	diggers: number;
	drillers: number;
};

type TeamAssignments = {
	diggers: string[];
	drillers: string[];
};

type TurnStatus = "waiting" | "timeout" | "success" | "trap" | "neutral";

type MasterItem = {
	text: string;
	revealed: boolean;
	rank?: number;
	score?: number;
};

type PickedItem = {
	text: string;
	rank: number;
	score: number;
};

function asObject(value: unknown): Record<string, unknown> {
	if (typeof value === "object" && value !== null) {
		return value as Record<string, unknown>;
	}
	return {};
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === "string");
}

function asTeamId(value: unknown): TeamId | null {
	if (value === "diggers" || value === "drillers") {
		return value;
	}
	return null;
}

function parseTeamNames(value: unknown): TeamNames {
	const raw = asObject(value);
	return {
		diggers: asString(raw.diggers, "The Diggers"),
		drillers: asString(raw.drillers, "The Drillers"),
	};
}

function parseTeamNumbers(value: unknown, fallback = 0): TeamNumbers {
	const raw = asObject(value);
	return {
		diggers: asNumber(raw.diggers, fallback),
		drillers: asNumber(raw.drillers, fallback),
	};
}

function parseTeamAssignments(value: unknown): TeamAssignments {
	const raw = asObject(value);
	return {
		diggers: asStringArray(raw.diggers),
		drillers: asStringArray(raw.drillers),
	};
}

function parseItems(value: unknown): string[] {
	return asStringArray(value);
}

function parseMasterList(value: unknown): MasterItem[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const parsed: MasterItem[] = [];
	for (const entry of value) {
		const raw = asObject(entry);
		const text = asString(raw.text);
		if (text.length === 0) {
			continue;
		}

		const rank = typeof raw.rank === "number" ? raw.rank : undefined;
		const score = typeof raw.score === "number" ? raw.score : undefined;
		const revealed = raw.revealed === true || rank != null;
		parsed.push({ text, revealed, rank, score });
	}

	return parsed;
}

function parsePickedItem(value: unknown): PickedItem | null {
	const raw = asObject(value);
	const text = asString(raw.text);
	if (text.length === 0) {
		return null;
	}

	return {
		text,
		rank: asNumber(raw.rank, 0),
		score: asNumber(raw.score, 0),
	};
}

function parseTurnStatus(value: unknown): TurnStatus {
	if (
		value === "waiting" ||
		value === "timeout" ||
		value === "success" ||
		value === "trap" ||
		value === "neutral"
	) {
		return value;
	}
	return "waiting";
}

function requestChoices(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
): string[] {
	if (!activeInputRequest) {
		return [];
	}

	const request = asObject(activeInputRequest.request);
	const choices = parseItems(request.choices);
	if (choices.length > 0) {
		return choices;
	}

	return parseItems(request.options);
}

function requestSubtype(
	activeInputRequest: PhaseRendererProps["activeInputRequest"],
): string {
	if (!activeInputRequest) {
		return "";
	}

	const request = asObject(activeInputRequest.request);
	return asString(request.subtype);
}

function livesGlyph(teamId: TeamId, lives: number): string {
	const count = Math.max(0, Math.floor(lives));
	if (count === 0) {
		return "none";
	}
	const glyph = teamId === "diggers" ? "♥" : "🛡";
	return glyph.repeat(count);
}

function TeamStatusRow({
	teamNames,
	teamLives,
	teamScores,
	activeTeamId,
}: {
	teamNames: TeamNames;
	teamLives: TeamNumbers;
	teamScores: TeamNumbers;
	activeTeamId: TeamId | null;
}) {
	const teams: TeamId[] = ["diggers", "drillers"];

	return (
		<View className="w-full flex-row gap-3 mb-4">
			{teams.map((teamId) => {
				const isActive = activeTeamId === teamId;
				return (
					<View
						key={teamId}
						className="flex-1 rounded-xl border bg-theme-surface p-3"
						style={{
							borderColor: isActive ? CONSENSUS_MINE_ACCENT : "#374151",
						}}
					>
						<Text className="text-center text-theme-text font-bold text-base">
							{teamNames[teamId]}
						</Text>
						<Text className="text-center text-theme-text-secondary mt-1">
							Lives: {livesGlyph(teamId, teamLives[teamId])}
						</Text>
						<Text
							className="text-center mt-1 text-2xl font-black"
							style={{ color: CONSENSUS_MINE_ACCENT }}
						>
							{teamScores[teamId]}
						</Text>
						{isActive && (
							<Text
								className="text-center text-xs mt-1"
								style={{ color: CONSENSUS_MINE_ACCENT }}
							>
								ACTIVE TEAM
							</Text>
						)}
					</View>
				);
			})}
		</View>
	);
}

function SurveyPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const category = asString(sharedData.category, "Consensus Survey");
	const teamNames = parseTeamNames(sharedData.teamNames);
	const teams = parseTeamAssignments(sharedData.teams);
	const itemsFromShared = parseItems(sharedData.items);
	const itemsFromInput = requestChoices(activeInputRequest);
	const items = itemsFromInput.length > 0 ? itemsFromInput : itemsFromShared;
	const canSubmit =
		role === "player" &&
		activeInputRequest?.request.type === "choice" &&
		requestSubtype(activeInputRequest) === "ranking";

	return (
		<PhaseShell
			title="Consensus Mine"
			subtitle="Survey"
			timerSeconds={activeInputRequest?.request.timeLimit}
			accentColor={CONSENSUS_MINE_ACCENT}
			isHost={isHost}
		>
			<PromptCard text={category} size={isHost ? "large" : "normal"} />
			<TeamStatusRow
				teamNames={teamNames}
				teamLives={{
					diggers: teams.diggers.length,
					drillers: teams.drillers.length,
				}}
				teamScores={{ diggers: 0, drillers: 0 }}
				activeTeamId={null}
			/>
			{isHost ? (
				<HostWaitCard
					message="Waiting for all rankings..."
					accentColor={CONSENSUS_MINE_ACCENT}
				/>
			) : canSubmit ? (
				<View className="w-full gap-3">
					<Text className="text-center text-theme-text-secondary text-sm">
						Pick your top-ranked choice.
					</Text>
					<ChoiceGrid
						choices={items}
						onSelect={(index) => sendInput([index])}
						columns={2}
						accentColor={CONSENSUS_MINE_ACCENT}
					/>
				</View>
			) : (
				<HostWaitCard
					message="Waiting for your survey prompt..."
					accentColor={CONSENSUS_MINE_ACCENT}
				/>
			)}
		</PhaseShell>
	);
}

function TeamTurnsPhase({
	sharedData,
	activeInputRequest,
	sendInput,
	role,
}: PhaseRendererProps) {
	const isHost = role === "host";
	const teamNames = parseTeamNames(sharedData.teamNames);
	const teamLives = parseTeamNumbers(sharedData.teamLives, 3);
	const teamScores = parseTeamNumbers(sharedData.teamScores, 0);
	const activeTeamId = asTeamId(sharedData.activeTeamId);
	const turnStatus = parseTurnStatus(sharedData.turnStatus);
	const pickedItem = parsePickedItem(sharedData.pickedItem);
	const masterList = parseMasterList(sharedData.masterList);
	const choices = requestChoices(activeInputRequest);
	const canPick =
		role === "player" && activeInputRequest?.request.type === "choice";

	const toneByStatus: Record<
		TurnStatus,
		{ title: string; detail: string; accent: string }
	> = {
		waiting: {
			title: "Awaiting pick",
			detail: "A team is choosing an item.",
			accent: "#9ca3af",
		},
		timeout: {
			title: "Timeout",
			detail: "No pick in time. A life was lost.",
			accent: "#9ca3af",
		},
		success: {
			title: "Success",
			detail: "Top-ranked pick found.",
			accent: "#22c55e",
		},
		trap: {
			title: "Trap",
			detail: "Danger pick. Team lost a life.",
			accent: "#ef4444",
		},
		neutral: {
			title: "Neutral",
			detail: "Safe pick, but not top 3.",
			accent: "#9ca3af",
		},
	};

	const feedback = toneByStatus[turnStatus];

	return (
		<PhaseShell
			title="Team Turns"
			subtitle={
				activeTeamId
					? `${teamNames[activeTeamId]} are up`
					: "Setting up next turn"
			}
			timerSeconds={activeInputRequest?.request.timeLimit}
			accentColor={CONSENSUS_MINE_ACCENT}
			isHost={isHost}
		>
			<TeamStatusRow
				teamNames={teamNames}
				teamLives={teamLives}
				teamScores={teamScores}
				activeTeamId={activeTeamId}
			/>
			<PromptCard
				text="Mine the top 3 choices. Avoid the bottom traps."
				size={isHost ? "large" : "normal"}
			/>

			<View className="w-full gap-2">
				{masterList.map((item, index) => {
					const showItem = isHost || item.revealed;
					const rankLabel =
						item.rank != null ? `#${item.rank}` : `#${index + 1}`;
					return (
						<View
							key={`${item.text}-${index}`}
							className="rounded-xl border border-theme-border bg-theme-surface p-3"
						>
							<Text className="text-theme-text font-semibold">
								{rankLabel} {showItem ? item.text : `Hidden vein ${index + 1}`}
							</Text>
						</View>
					);
				})}
			</View>

			<View className="w-full mt-4">
				<ResultRevealCard
					title={feedback.title}
					rows={[
						{
							label: pickedItem ? pickedItem.text : "No item revealed",
							detail: pickedItem
								? `Rank ${pickedItem.rank} • Consensus score ${pickedItem.score}`
								: feedback.detail,
							highlight: turnStatus === "success" || turnStatus === "trap",
						},
					]}
					isHost={isHost}
				/>
			</View>

			<View className="w-full mt-4">
				{isHost ? (
					<HostWaitCard
						message="Host sees full board while teams pick."
						accentColor={feedback.accent}
					/>
				) : canPick ? (
					<View className="w-full gap-3">
						<Text className="text-center text-theme-text-secondary text-sm">
							Your team turn: pick an item.
						</Text>
						<ChoiceGrid
							choices={choices}
							onSelect={(index) => sendInput(index)}
							columns={2}
							accentColor={CONSENSUS_MINE_ACCENT}
						/>
					</View>
				) : (
					<HostWaitCard
						message={
							activeTeamId
								? `${teamNames[activeTeamId]} are taking their turn.`
								: "Waiting for next turn."
						}
						accentColor={CONSENSUS_MINE_ACCENT}
					/>
				)}
			</View>

			<View className="w-full mt-4">
				<Timer
					seconds={activeInputRequest?.request.timeLimit ?? 0}
					size={isHost ? "large" : "normal"}
				/>
			</View>

			<View className="w-full mt-4">
				<Scoreboard
					data={[
						{ playerName: teamNames.diggers, score: teamScores.diggers },
						{ playerName: teamNames.drillers, score: teamScores.drillers },
					]}
					size={isHost ? "large" : "normal"}
				/>
			</View>
		</PhaseShell>
	);
}

function WinnerPhase({ sharedData, role }: PhaseRendererProps) {
	const router = useRouter();
	const { narrate } = usePartyNarration();
	const narratedRef = useRef(false);
	const isHost = role === "host";
	const teamNames = parseTeamNames(sharedData.teamNames);
	const teamScores = parseTeamNumbers(sharedData.teamScores, 0);

	const players = [
		{ name: teamNames.diggers, score: teamScores.diggers },
		{ name: teamNames.drillers, score: teamScores.drillers },
	];

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

export function registerConsensusMinePhases() {
	registerGamePhases("consensus-mine", {
		survey: SurveyPhase,
		team_turns: TeamTurnsPhase,
		winner: WinnerPhase,
	});
}
