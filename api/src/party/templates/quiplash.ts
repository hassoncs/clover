import promptsData from "../content/quiplash-prompts.json";
import type { PartyTemplateRunner } from "../PartyRoomDO";
import { DEFAULT_ANSWER_TIMEOUT, DEFAULT_VOTE_TIMEOUT } from "../PartyRoomDO";

interface Prompt {
	id: string;
	text: string;
	category: string;
}

interface Matchup {
	promptText: string;
	playerA: string;
	playerB: string;
	answerA: string;
	answerB: string;
}

interface ScoreEntry {
	playerId: string;
	playerName: string;
	score: number;
}

const ANSWER_TIME_LIMIT = DEFAULT_ANSWER_TIMEOUT / 1000;
const VOTE_TIME_LIMIT = DEFAULT_VOTE_TIMEOUT / 1000;
const REVEAL_DURATION_MS = 5_000;
const SCORES_DURATION_MS = 5_000;
const ROUND_COUNT = 3;
const NO_ANSWER = "(no answer)";

function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function startCountdown(
	room: Parameters<PartyTemplateRunner>[0],
	seconds: number,
): ReturnType<typeof setInterval> {
	let remaining = seconds;
	const interval = setInterval(async () => {
		remaining--;
		if (remaining >= 0) {
			await room.updateSharedData({ timerRemaining: remaining });
		}
	}, 1000);
	return interval;
}

function buildScoreboard(
	scores: Map<string, number>,
	playerNames: Map<string, string>,
): ScoreEntry[] {
	const entries: ScoreEntry[] = [];
	for (const [playerId, score] of scores) {
		entries.push({
			playerId,
			playerName: playerNames.get(playerId) ?? playerId,
			score,
		});
	}
	entries.sort((a, b) => b.score - a.score);
	return entries;
}

function createMatchups(
	playerIds: string[],
	prompts: Prompt[],
): { promptText: string; playerA: string; playerB: string }[] {
	const n = playerIds.length;
	const matchups: { promptText: string; playerA: string; playerB: string }[] =
		[];

	for (let i = 0; i < n; i++) {
		const playerA = playerIds[i];
		const playerB = playerIds[(i + 1) % n];
		const prompt = prompts[i];
		matchups.push({
			promptText: prompt.text,
			playerA,
			playerB,
		});
	}

	return matchups;
}

export const runQuiplash: PartyTemplateRunner = async (room) => {
	await room.setPhase("playing");

	const allPrompts = shuffle(promptsData as Prompt[]);
	let promptIndex = 0;

	const readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready!",
		timeLimit: 5,
	});

	const playerIds = Array.from(readyResponses.keys());

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players",
		});
		await room.setPhase("ended");
		return;
	}

	const playerNames = new Map<string, string>();
	for (const [id, response] of readyResponses) {
		playerNames.set(id, String(response.playerId));
	}

	const scores = new Map<string, number>();
	for (const id of playerIds) {
		scores.set(id, 0);
	}

	for (let round = 1; round <= ROUND_COUNT; round++) {
		const roundMultiplier = round;
		const promptsNeeded = playerIds.length;

		if (promptIndex + promptsNeeded > allPrompts.length) {
			promptIndex = 0;
		}
		const roundPrompts = allPrompts.slice(
			promptIndex,
			promptIndex + promptsNeeded,
		);
		promptIndex += promptsNeeded;

		const matchupDefs = createMatchups(playerIds, roundPrompts);

		const playerAssignments = new Map<
			string,
			{ matchupIndex: number; promptText: string }[]
		>();
		for (const id of playerIds) {
			playerAssignments.set(id, []);
		}
		for (let i = 0; i < matchupDefs.length; i++) {
			const m = matchupDefs[i];
			playerAssignments.get(m.playerA)?.push({
				matchupIndex: i,
				promptText: m.promptText,
			});
			playerAssignments.get(m.playerB)?.push({
				matchupIndex: i,
				promptText: m.promptText,
			});
		}

		const assignmentsJson: Record<
			string,
			{ matchupIndex: number; promptText: string }[]
		> = {};
		for (const [id, assignments] of playerAssignments) {
			assignmentsJson[id] = assignments;
		}

		await room.updateSharedData({
			phase: "answering",
			roundNumber: round,
			roundMultiplier,
			assignmentsJson: JSON.stringify(assignmentsJson),
			timerRemaining: ANSWER_TIME_LIMIT,
			matchupIndex: 0,
			totalMatchups: matchupDefs.length,
		});

		const countdownTimer = startCountdown(room, ANSWER_TIME_LIMIT);

		const answerResponses = await room.requestInput(`answers-r${round}`, {
			type: "text",
			prompt: "Submit your answers",
			timeLimit: ANSWER_TIME_LIMIT,
		});

		clearInterval(countdownTimer);

		const playerAnswers = new Map<string, Record<number, string>>();
		for (const [playerId, response] of answerResponses) {
			try {
				const parsed = JSON.parse(String(response.value)) as Record<
					number,
					string
				>;
				playerAnswers.set(playerId, parsed);
			} catch {
				playerAnswers.set(playerId, {});
			}
		}

		const matchups: Matchup[] = matchupDefs.map((def, i) => {
			const answersA = playerAnswers.get(def.playerA);
			const answersB = playerAnswers.get(def.playerB);
			return {
				promptText: def.promptText,
				playerA: def.playerA,
				playerB: def.playerB,
				answerA: answersA?.[i] ?? NO_ANSWER,
				answerB: answersB?.[i] ?? NO_ANSWER,
			};
		});

		for (let mi = 0; mi < matchups.length; mi++) {
			const matchup = matchups[mi];

			const voters = playerIds.filter(
				(id) => id !== matchup.playerA && id !== matchup.playerB,
			);

			await room.updateSharedData({
				phase: "voting",
				roundNumber: round,
				roundMultiplier,
				promptText: matchup.promptText,
				answerA: matchup.answerA,
				answerB: matchup.answerB,
				matchupIndex: mi + 1,
				totalMatchups: matchups.length,
				timerRemaining: VOTE_TIME_LIMIT,
				votersJson: JSON.stringify(voters),
			});

			const voteCountdownTimer = startCountdown(room, VOTE_TIME_LIMIT);

			const voteResponses = await room.requestInput(`vote-r${round}-m${mi}`, {
				type: "choice",
				prompt: matchup.promptText,
				options: [matchup.answerA, matchup.answerB],
				timeLimit: VOTE_TIME_LIMIT,
			});

			clearInterval(voteCountdownTimer);

			let votesA = 0;
			let votesB = 0;
			for (const [voterId, response] of voteResponses) {
				if (voterId === matchup.playerA || voterId === matchup.playerB) {
					continue;
				}
				const vote = String(response.value);
				if (vote === matchup.answerA || vote === "0") {
					votesA++;
				} else if (vote === matchup.answerB || vote === "1") {
					votesB++;
				}
			}

			const totalVotes = votesA + votesB;
			const percentA =
				totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 0;
			const percentB =
				totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 0;

			let pointsA = 0;
			let pointsB = 0;
			if (totalVotes > 0) {
				pointsA = Math.round((votesA / totalVotes) * 1000 * roundMultiplier);
				pointsB = Math.round((votesB / totalVotes) * 1000 * roundMultiplier);

				if (votesA === totalVotes) {
					pointsA = Math.round(pointsA * 1.25);
				}
				if (votesB === totalVotes) {
					pointsB = Math.round(pointsB * 1.25);
				}
			}

			const currentA = scores.get(matchup.playerA) ?? 0;
			const currentB = scores.get(matchup.playerB) ?? 0;
			scores.set(matchup.playerA, currentA + pointsA);
			scores.set(matchup.playerB, currentB + pointsB);

			await room.updatePlayerScore(matchup.playerA, pointsA);
			await room.updatePlayerScore(matchup.playerB, pointsB);

			const scoreboard = buildScoreboard(scores, playerNames);

			await room.updateSharedData({
				phase: "reveal",
				roundNumber: round,
				roundMultiplier,
				promptText: matchup.promptText,
				answerA: matchup.answerA,
				answerB: matchup.answerB,
				voteResultA: percentA,
				voteResultB: percentB,
				pointsA,
				pointsB,
				quiplashA: votesA === totalVotes && totalVotes > 0,
				quiplashB: votesB === totalVotes && totalVotes > 0,
				matchupIndex: mi + 1,
				totalMatchups: matchups.length,
				scoreboardJson: JSON.stringify(scoreboard),
				timerRemaining: 0,
			});

			await delay(REVEAL_DURATION_MS);
		}

		const scoreboard = buildScoreboard(scores, playerNames);

		await room.updateSharedData({
			phase: "scores",
			roundNumber: round,
			roundMultiplier,
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await delay(SCORES_DURATION_MS);
	}

	const finalScoreboard = buildScoreboard(scores, playerNames);
	const winner = finalScoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		scoreboardJson: JSON.stringify(finalScoreboard),
		winnerName: winner?.playerName ?? "Nobody",
		timerRemaining: 0,
	});

	await delay(10_000);
	await room.setPhase("ended");
};
