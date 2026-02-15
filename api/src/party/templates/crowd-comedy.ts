import { loadContentPack, shufflePrompts } from "../content/prompt-loader";
import type { PartyTemplateRunner } from "../PartyRoomDO";
import {
	buildScoreboard,
	delay,
	generateId,
	shuffle,
	startCountdown,
} from "./utils";

interface AnonymousAnswer {
	id: string;
	text: string;
}

interface AnswerWithAuthor extends AnonymousAnswer {
	authorId: string;
}

interface RoundResult {
	answerId: string;
	text: string;
	authorName: string;
	voteCount: number;
	points: number;
}

const ANSWER_TIME_LIMIT = 30;
const VOTE_TIME_LIMIT = 15;
const REVEAL_DURATION_MS = 3_000;
const RESULTS_DURATION_MS = 5_000;
const SCORES_DURATION_MS = 5_000;
const ROUND_COUNT = 5;
const NO_ANSWER = "(no answer)";
const POINTS_PER_VOTE = 100;
const CLEAN_SWEEP_BONUS = 50;

export const runCrowdComedy: PartyTemplateRunner = async (room) => {
	await room.setPhase("playing");

	const allPrompts = shufflePrompts(loadContentPack("quip"));
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
		playerNames.set(id, String(response.playerId || id.slice(0, 6)));
	}

	const scores = new Map<string, number>();
	for (const id of playerIds) {
		scores.set(id, 0);
	}

	for (let round = 1; round <= ROUND_COUNT; round++) {
		if (promptIndex >= allPrompts.length) {
			promptIndex = 0;
		}
		const prompt = allPrompts[promptIndex];
		promptIndex++;

		// --- ANSWER PHASE ---
		await room.updateSharedData({
			phase: "answering",
			roundNumber: round,
			totalRounds: ROUND_COUNT,
			promptText: prompt.text,
			timerRemaining: ANSWER_TIME_LIMIT,
		});

		const answerCountdown = startCountdown(room, ANSWER_TIME_LIMIT);

		const answerResponses = await room.requestInput(`answer-r${round}`, {
			type: "text",
			prompt: prompt.text,
			timeLimit: ANSWER_TIME_LIMIT,
		});

		clearInterval(answerCountdown);

		// Build answer list with opaque IDs (not player IDs)
		const answersWithAuthors: AnswerWithAuthor[] = [];
		for (const [playerId, response] of answerResponses) {
			const text = String(response.value ?? "").trim();
			answersWithAuthors.push({
				id: generateId(),
				text: text || NO_ANSWER,
				authorId: playerId,
			});
		}

		// Add "(no answer)" for players who didn't respond
		for (const playerId of playerIds) {
			if (!answerResponses.has(playerId)) {
				answersWithAuthors.push({
					id: generateId(),
					text: NO_ANSWER,
					authorId: playerId,
				});
			}
		}

		const shuffledAnswers = shuffle(answersWithAuthors);

		// Build author lookup: answerId → playerId
		const authorMap = new Map<string, string>();
		for (const answer of shuffledAnswers) {
			authorMap.set(answer.id, answer.authorId);
		}

		// --- REVEAL PHASE (anonymous) ---
		const anonymousAnswers: AnonymousAnswer[] = shuffledAnswers.map((a) => ({
			id: a.id,
			text: a.text,
		}));

		await room.updateSharedData({
			phase: "reveal",
			roundNumber: round,
			totalRounds: ROUND_COUNT,
			promptText: prompt.text,
			answersJson: JSON.stringify(anonymousAnswers),
			timerRemaining: 0,
		});

		await delay(REVEAL_DURATION_MS);

		// --- VOTE PHASE ---
		// Each player can vote for any answer except their own
		// Send all options; server will filter self-votes on tally
		await room.updateSharedData({
			phase: "voting",
			roundNumber: round,
			totalRounds: ROUND_COUNT,
			promptText: prompt.text,
			voteOptionsJson: JSON.stringify(anonymousAnswers),
			timerRemaining: VOTE_TIME_LIMIT,
		});

		const voteCountdown = startCountdown(room, VOTE_TIME_LIMIT);

		const voteResponses = await room.requestInput(`vote-r${round}`, {
			type: "choice",
			prompt: prompt.text,
			options: anonymousAnswers.map((a) => a.id),
			timeLimit: VOTE_TIME_LIMIT,
		});

		clearInterval(voteCountdown);

		// Tally votes — reject self-votes
		const voteCounts = new Map<string, number>();
		for (const answer of shuffledAnswers) {
			voteCounts.set(answer.id, 0);
		}

		let totalValidVotes = 0;
		for (const [voterId, response] of voteResponses) {
			const votedAnswerId = String(response.value);
			const answeredAuthor = authorMap.get(votedAnswerId);

			// Reject self-votes
			if (answeredAuthor === voterId) {
				continue;
			}

			// Reject votes for non-existent answers
			if (!voteCounts.has(votedAnswerId)) {
				continue;
			}

			voteCounts.set(votedAnswerId, (voteCounts.get(votedAnswerId) ?? 0) + 1);
			totalValidVotes++;
		}

		// Award points
		const roundResults: RoundResult[] = [];
		for (const answer of shuffledAnswers) {
			const count = voteCounts.get(answer.id) ?? 0;
			let points = count * POINTS_PER_VOTE;

			// Clean sweep bonus: got ALL votes (and there were votes to get)
			if (count === totalValidVotes && totalValidVotes > 0) {
				points += CLEAN_SWEEP_BONUS;
			}

			const authorId = authorMap.get(answer.id) ?? "";
			const currentScore = scores.get(authorId) ?? 0;
			scores.set(authorId, currentScore + points);

			if (points > 0) {
				await room.updatePlayerScore(authorId, points);
			}

			roundResults.push({
				answerId: answer.id,
				text: answer.text,
				authorName: playerNames.get(authorId) ?? authorId,
				voteCount: count,
				points,
			});
		}

		// Sort results by votes descending
		roundResults.sort((a, b) => b.voteCount - a.voteCount);

		const scoreboard = buildScoreboard(scores, playerNames);

		// --- ROUND RESULTS ---
		await room.updateSharedData({
			phase: "round_results",
			roundNumber: round,
			totalRounds: ROUND_COUNT,
			promptText: prompt.text,
			resultsJson: JSON.stringify(roundResults),
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await delay(RESULTS_DURATION_MS);

		// --- SCOREBOARD ---
		await room.updateSharedData({
			phase: "scores",
			roundNumber: round,
			totalRounds: ROUND_COUNT,
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await delay(SCORES_DURATION_MS);
	}

	// --- WINNER ---
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
