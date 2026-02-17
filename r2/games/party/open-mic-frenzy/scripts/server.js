var party = require("slopcade/party");
var content = require("slopcade/content");

var ANSWER_TIME_LIMIT = 30;
var VOTE_TIME_LIMIT = 15;
var REVEAL_DURATION_MS = 3000;
var RESULTS_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;
var NO_ANSWER = "(no answer)";
var POINTS_PER_VOTE = 250;
var CONSISTENT_BONUS = 500;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async (room, config) => {
	var i, p, r;
	var readyResponses, playerIds, playerNames;
	var scores, votesInRounds;
	var roundCount, pool, shuffledPool, usedIds;
	var round, isFinale, promptsPerRound, selectedPrompts;
	var prompt, promptText;
	var answerResponses, answers, authorMap, answerIndex;
	var shuffledAnswers, anonymousAnswers;
	var voteResponses, normalizedVotes, voteCounts;
	var roundResults, scoreboard;
	var finalScoreboard, winner;
	var pid, consistent;
	var playerId, answerId, authorId, count, points, answer;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready!",
		timeLimit: 5,
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
			phase: "error",
			errorMessage: "Need at least 3 players",
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	votesInRounds = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
		votesInRounds[playerIds[i]] = {};
	}

	roundCount = toNumber(config && config.roundCount, DEFAULT_ROUND_COUNT);
	pool = Array.isArray(config && config.contentPack) ? config.contentPack : [];
	shuffledPool = content.shuffle(pool);
	usedIds = {};

	for (round = 1; round <= roundCount; round++) {
		isFinale = round === roundCount;
		promptsPerRound = isFinale ? 3 : 1;
		selectedPrompts = content.selectForRound(
			shuffledPool,
			promptsPerRound,
			usedIds,
		);

		if (selectedPrompts.length < promptsPerRound) {
			usedIds = {};
			shuffledPool = content.shuffle(pool);
			selectedPrompts = content.selectForRound(
				shuffledPool,
				promptsPerRound,
				usedIds,
			);
		}

		if (selectedPrompts.length > 0) {
			content.markUsed(usedIds, selectedPrompts);
		}

		prompt = selectedPrompts.length > 0 ? selectedPrompts[0] : null;
		promptText =
			prompt && prompt.text ? String(prompt.text) : "Say something funny.";

		if (isFinale) {
			promptText = "[FINALE] " + promptText;
		}

		await room.updateSharedData({
			phase: "answering",
			roundNumber: round,
			totalRounds: roundCount,
			promptText: promptText,
			timerRemaining: ANSWER_TIME_LIMIT,
		});

		answerResponses = await room.requestInput("answer-r" + round, {
			type: "text",
			prompt: promptText,
			timeLimit: ANSWER_TIME_LIMIT,
		});

		answers = [];
		authorMap = {};
		answerIndex = 0;

		answerResponses.forEach((response, playerId) => {
			var answerId = "r" + round + "-a" + answerIndex;
			answerIndex += 1;
			var text = String(
				response && response.value !== undefined ? response.value : "",
			).trim();
			answers.push({
				id: answerId,
				text: text || NO_ANSWER,
				authorId: playerId,
			});
			authorMap[answerId] = playerId;
		});

		for (i = 0; i < playerIds.length; i++) {
			playerId = playerIds[i];
			if (!answerResponses.has(playerId)) {
				answerId = "r" + round + "-a" + answerIndex;
				answerIndex += 1;
				answers.push({
					id: answerId,
					text: NO_ANSWER,
					authorId: playerId,
				});
				authorMap[answerId] = playerId;
			}
		}

		shuffledAnswers = content.shuffle(answers);
		anonymousAnswers = shuffledAnswers.map((answer) => ({
			id: answer.id,
			text: answer.text,
		}));

		await room.updateSharedData({
			phase: "reveal",
			roundNumber: round,
			totalRounds: roundCount,
			promptText: promptText,
			answersJson: JSON.stringify(anonymousAnswers),
			timerRemaining: 0,
		});

		await room.delay(REVEAL_DURATION_MS);

		await room.updateSharedData({
			phase: "voting",
			roundNumber: round,
			totalRounds: roundCount,
			promptText: promptText,
			voteOptionsJson: JSON.stringify(anonymousAnswers),
			timerRemaining: VOTE_TIME_LIMIT,
		});

		voteResponses = await room.requestInput("vote-r" + round, {
			type: "choice",
			prompt: promptText,
			options: anonymousAnswers.map((answer) => answer.id),
			timeLimit: VOTE_TIME_LIMIT,
		});

		normalizedVotes = {};
		voteResponses.forEach((response, playerId) => {
			normalizedVotes[playerId] = {
				value: String(
					response && response.value !== undefined ? response.value : "",
				),
			};
		});

		voteCounts = party.tallyVotes(normalizedVotes, true, authorMap);

		roundResults = [];
		for (i = 0; i < shuffledAnswers.length; i++) {
			answer = shuffledAnswers[i];
			count = Number(voteCounts[answer.id]) || 0;
			points = count * POINTS_PER_VOTE;

			authorId = authorMap[answer.id] || "";
			scores[authorId] = (scores[authorId] || 0) + points;

			if (count > 0) {
				votesInRounds[authorId][round] = true;
			}

			if (points > 0) {
				await room.updatePlayerScore(authorId, points);
			}

			roundResults.push({
				answerId: answer.id,
				text: answer.text,
				authorName: playerNames[authorId] || authorId,
				voteCount: count,
				points: points,
			});
		}

		roundResults.sort((a, b) => b.voteCount - a.voteCount);

		scoreboard = party.createScoreboard(scores, playerNames);

		await room.updateSharedData({
			phase: "round_results",
			roundNumber: round,
			totalRounds: roundCount,
			promptText: promptText,
			resultsJson: JSON.stringify(roundResults),
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await room.delay(RESULTS_DURATION_MS);

		await room.updateSharedData({
			phase: "scores",
			roundNumber: round,
			totalRounds: roundCount,
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await room.delay(SCORES_DURATION_MS);
	}

	for (p = 0; p < playerIds.length; p++) {
		pid = playerIds[p];
		consistent = true;
		for (r = 1; r <= roundCount; r++) {
			if (!votesInRounds[pid][r]) {
				consistent = false;
				break;
			}
		}
		if (consistent) {
			scores[pid] += CONSISTENT_BONUS;
			await room.updatePlayerScore(pid, CONSISTENT_BONUS);
		}
	}

	finalScoreboard = party.createScoreboard(scores, playerNames);
	winner = finalScoreboard.length > 0 ? finalScoreboard[0] : null;

	await room.updateSharedData({
		phase: "winner",
		scoreboardJson: JSON.stringify(finalScoreboard),
		winnerName: winner ? winner.playerName : "Nobody",
		timerRemaining: 0,
	});

	await room.delay(WINNER_DURATION_MS);
	await room.setPhase("ended");
};
