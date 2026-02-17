var party = require("slopcade/party");
var content = require("slopcade/content");

var ANSWER_TIME_LIMIT = 45;
var VOTE_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 3000;
var RESULTS_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 2;
var NO_ANSWER = "(no answer)";
var POINTS_PER_VOTE = 100;
var QUIPLASH_BONUS = 500;
var FINALE_POINTS_PER_VOTE = 200;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseAnswerMap(rawValue) {
	var parsed;

	if (typeof rawValue !== "string") {
		return {};
	}

	try {
		parsed = JSON.parse(rawValue);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (e) {
		return {};
	}
}

exports.run = async (room, config) => {
	var i;
	var readyResponses;
	var playerIds;
	var playerNames;
	var scores;
	var roundCount;
	var pool;
	var shuffledPool;
	var usedIds;
	var round;
	var selectedPrompts;
	var promptAssignments;
	var roundMatchups;
	var answerResponses;
	var playerAnswers;
	var scoreboard;
	var finalScoreboard;
	var winner;
	var authorA;
	var authorB;
	var prompt;
	var answers;
	var promptId;
	var matchup;
	var currentMatchup;
	var promptText;
	var answersForPrompt;
	var p1;
	var p2;
	var answerA;
	var answerB;
	var voteOptions;
	var voteResponses;
	var normalizedVotes;
	var voteCounts;
	var countA;
	var countB;
	var totalVotes;
	var pointsA;
	var pointsB;
	var finalePrompt;
	var finaleAnswers;
	var finaleAuthorMap;
	var answerId;
	var answerText;
	var playerId;
	var missingAnswerId;
	var shuffledFinaleAnswers;
	var finaleVoteResponses;
	var normalizedFinaleVotes;
	var finaleVoteCounts;
	var finaleResults;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Quiplash!",
		timeLimit: 10,
	});

	playerIds = [];
	playerNames = {};

	readyResponses.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] =
			response && response.playerId
				? String(response.playerId)
				: playerId.slice(0, 6);
	});

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "winner",
			winnerName: "Need at least 3 players for Quiplash",
			scoreboardJson: JSON.stringify([]),
			resultsJson: JSON.stringify([]),
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
	}

	roundCount = toNumber(config && config.roundCount, DEFAULT_ROUND_COUNT);
	pool = Array.isArray(config && config.contentPack) ? config.contentPack : [];
	shuffledPool = content.shuffle(pool);
	usedIds = {};

	for (round = 1; round <= roundCount; round++) {
		selectedPrompts = content.selectForRound(
			shuffledPool,
			playerIds.length,
			usedIds,
		);

		if (selectedPrompts.length < playerIds.length) {
			usedIds = {};
			shuffledPool = content.shuffle(pool);
			selectedPrompts = content.selectForRound(
				shuffledPool,
				playerIds.length,
				usedIds,
			);
		}

		content.markUsed(usedIds, selectedPrompts);

		promptAssignments = {};
		roundMatchups = [];
		playerIds.forEach((pid) => {
			promptAssignments[pid] = [];
		});

		for (i = 0; i < playerIds.length; i++) {
			authorA = playerIds[i];
			authorB = playerIds[(i + 1) % playerIds.length];
			prompt = selectedPrompts[i] || {
				id: "fallback-" + round + "-" + i,
				text: "Write something funny!",
			};

			promptAssignments[authorA].push(prompt);
			promptAssignments[authorB].push(prompt);
			roundMatchups.push({
				prompt: prompt,
				authorA: authorA,
				authorB: authorB,
			});
		}

		await room.updateSharedData({
			phase: "answering",
			roundNumber: round,
			totalRounds: roundCount + 1,
			timerRemaining: ANSWER_TIME_LIMIT,
		});

		answerResponses = await room.requestInput("answer-r" + round, {
			type: "text",
			prompt: "Answer your prompts!",
			timeLimit: ANSWER_TIME_LIMIT,
			assignments: promptAssignments,
		});

		playerAnswers = {};
		for (i = 0; i < roundMatchups.length; i++) {
			playerAnswers[roundMatchups[i].prompt.id] = {};
		}

		answerResponses.forEach((response, playerId) => {
			answers = parseAnswerMap(response && response.value);
			for (promptId in answers) {
				if (playerAnswers[promptId]) {
					playerAnswers[promptId][playerId] = String(
						answers[promptId] || "",
					).trim();
				}
			}
		});

		for (i = 0; i < roundMatchups.length; i++) {
			matchup = roundMatchups[i];
			promptId = matchup.prompt.id;
			if (!playerAnswers[promptId][matchup.authorA]) {
				playerAnswers[promptId][matchup.authorA] = NO_ANSWER;
			}
			if (!playerAnswers[promptId][matchup.authorB]) {
				playerAnswers[promptId][matchup.authorB] = NO_ANSWER;
			}
		}

		for (i = 0; i < roundMatchups.length; i++) {
			currentMatchup = roundMatchups[i];
			promptText = currentMatchup.prompt.text;
			answersForPrompt = playerAnswers[currentMatchup.prompt.id];
			p1 = currentMatchup.authorA;
			p2 = currentMatchup.authorB;
			answerA = answersForPrompt[p1] || NO_ANSWER;
			answerB = answersForPrompt[p2] || NO_ANSWER;

			voteOptions = [
				{ id: "a1", text: answerA, authorId: p1 },
				{ id: "a2", text: answerB, authorId: p2 },
			];

			await room.updateSharedData({
				phase: "reveal",
				roundNumber: round,
				totalRounds: roundCount + 1,
				promptText: promptText,
				answersJson: JSON.stringify(
					voteOptions.map((option) => ({ id: option.id, text: option.text })),
				),
				timerRemaining: 0,
			});
			await room.delay(REVEAL_DURATION_MS);

			await room.updateSharedData({
				phase: "voting",
				roundNumber: round,
				totalRounds: roundCount + 1,
				promptText: promptText,
				voteOptionsJson: JSON.stringify(
					voteOptions.map((option) => ({ id: option.id, text: option.text })),
				),
				timerRemaining: VOTE_TIME_LIMIT,
			});

			voteResponses = await room.requestInput("vote-r" + round + "-p" + i, {
				type: "choice",
				prompt: promptText,
				options: ["a1", "a2"],
				timeLimit: VOTE_TIME_LIMIT,
			});

			normalizedVotes = {};
			voteResponses.forEach((response, voterId) => {
				normalizedVotes[voterId] = {
					value: String(response && response.value ? response.value : ""),
				};
			});

			voteCounts = party.tallyVotes(normalizedVotes, true, {
				a1: p1,
				a2: p2,
			});
			countA = Number(voteCounts.a1) || 0;
			countB = Number(voteCounts.a2) || 0;
			totalVotes = countA + countB;

			pointsA =
				totalVotes > 0
					? Math.round((countA / totalVotes) * POINTS_PER_VOTE)
					: 0;
			pointsB =
				totalVotes > 0
					? Math.round((countB / totalVotes) * POINTS_PER_VOTE)
					: 0;

			if (countA === totalVotes && totalVotes > 0) {
				pointsA += QUIPLASH_BONUS;
			}
			if (countB === totalVotes && totalVotes > 0) {
				pointsB += QUIPLASH_BONUS;
			}

			scores[p1] = (scores[p1] || 0) + pointsA;
			scores[p2] = (scores[p2] || 0) + pointsB;

			if (pointsA > 0) {
				await room.updatePlayerScore(p1, pointsA);
			}
			if (pointsB > 0) {
				await room.updatePlayerScore(p2, pointsB);
			}

			await room.updateSharedData({
				phase: "round_results",
				roundNumber: round,
				totalRounds: roundCount + 1,
				promptText: promptText,
				resultsJson: JSON.stringify([
					{
						text: answerA,
						authorName: playerNames[p1] || p1,
						voteCount: countA,
						points: pointsA,
					},
					{
						text: answerB,
						authorName: playerNames[p2] || p2,
						voteCount: countB,
						points: pointsB,
					},
				]),
				scoreboardJson: JSON.stringify(
					party.createScoreboard(scores, playerNames),
				),
				timerRemaining: 0,
			});
			await room.delay(RESULTS_DURATION_MS);
		}

		scoreboard = party.createScoreboard(scores, playerNames);
		await room.updateSharedData({
			phase: "scores",
			roundNumber: round,
			totalRounds: roundCount + 1,
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	selectedPrompts = content.selectForRound(shuffledPool, 1, usedIds);
	if (selectedPrompts.length < 1) {
		usedIds = {};
		shuffledPool = content.shuffle(pool);
		selectedPrompts = content.selectForRound(shuffledPool, 1, usedIds);
	}
	content.markUsed(usedIds, selectedPrompts);

	finalePrompt =
		selectedPrompts.length > 0
			? selectedPrompts[0]
			: { id: "finale", text: "The final Quiplash prompt:" };

	await room.updateSharedData({
		phase: "answering",
		roundNumber: roundCount + 1,
		totalRounds: roundCount + 1,
		promptText: "[FINAL] " + finalePrompt.text,
		timerRemaining: ANSWER_TIME_LIMIT,
	});

	answerResponses = await room.requestInput("answer-finale", {
		type: "text",
		prompt: finalePrompt.text,
		timeLimit: ANSWER_TIME_LIMIT,
	});

	finaleAnswers = [];
	finaleAuthorMap = {};

	answerResponses.forEach((response, playerId) => {
		answerId = "f-" + playerId;
		answerText = String(
			response && response.value ? response.value : "",
		).trim();
		finaleAnswers.push({
			id: answerId,
			text: answerText || NO_ANSWER,
			authorId: playerId,
		});
		finaleAuthorMap[answerId] = playerId;
	});

	for (i = 0; i < playerIds.length; i++) {
		playerId = playerIds[i];
		if (!answerResponses.has(playerId)) {
			missingAnswerId = "f-" + playerId;
			finaleAnswers.push({
				id: missingAnswerId,
				text: NO_ANSWER,
				authorId: playerId,
			});
			finaleAuthorMap[missingAnswerId] = playerId;
		}
	}

	shuffledFinaleAnswers = content.shuffle(finaleAnswers);

	await room.updateSharedData({
		phase: "voting",
		roundNumber: roundCount + 1,
		totalRounds: roundCount + 1,
		promptText: finalePrompt.text,
		voteOptionsJson: JSON.stringify(
			shuffledFinaleAnswers.map((answer) => ({
				id: answer.id,
				text: answer.text,
			})),
		),
		timerRemaining: VOTE_TIME_LIMIT,
	});

	finaleVoteResponses = await room.requestInput("vote-finale", {
		type: "choice",
		prompt: finalePrompt.text,
		options: shuffledFinaleAnswers.map((answer) => answer.id),
		timeLimit: VOTE_TIME_LIMIT,
	});

	normalizedFinaleVotes = {};
	finaleVoteResponses.forEach((response, voterId) => {
		normalizedFinaleVotes[voterId] = {
			value: String(response && response.value ? response.value : ""),
		};
	});

	finaleVoteCounts = party.tallyVotes(
		normalizedFinaleVotes,
		true,
		finaleAuthorMap,
	);

	finaleResults = shuffledFinaleAnswers.map((answer) => {
		var count = Number(finaleVoteCounts[answer.id]) || 0;
		var points = count * FINALE_POINTS_PER_VOTE;
		scores[answer.authorId] = (scores[answer.authorId] || 0) + points;
		if (points > 0) {
			room.updatePlayerScore(answer.authorId, points);
		}

		return {
			text: answer.text,
			authorName: playerNames[answer.authorId] || answer.authorId,
			voteCount: count,
			points: points,
		};
	});

	finaleResults.sort((a, b) => b.voteCount - a.voteCount);

	finalScoreboard = party.createScoreboard(scores, playerNames);
	winner = finalScoreboard.length > 0 ? finalScoreboard[0] : null;

	await room.updateSharedData({
		phase: "winner",
		resultsJson: JSON.stringify(finaleResults),
		scoreboardJson: JSON.stringify(finalScoreboard),
		winnerName: winner ? winner.playerName : "Nobody",
		timerRemaining: 0,
	});

	await room.delay(WINNER_DURATION_MS);
	await room.setPhase("ended");
};
