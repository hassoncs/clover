var party = require("slopcade/party");
var content = require("slopcade/content");

var TRUTH_TIME_LIMIT = 30;
var BLUFF_TIME_LIMIT = 30;
var GUESS_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;
var POINTS_FIND_TRUTH = 500;
var POINTS_FOOL_OTHERS = 500;
var POINTS_SUBJECT_BONUS = 100;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, subjectId, others;
	var prompt, promptText;
	var truthResponse, truth;
	var bluffResponses, bluffs;
	var allAnswers, shuffledAnswers;
	var guessResponses, results;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for About You Bluff!",
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
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
	}

	roundCount = toNumber(config && config.roundCount, DEFAULT_ROUND_COUNT);
	pool = config && config.contentPack ? config.contentPack : [];
	shuffledPool = [...pool];
	for (i = shuffledPool.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		p = shuffledPool[i];
		shuffledPool[i] = shuffledPool[j];
		shuffledPool[j] = p;
	}
	usedIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		subjectId = playerIds[(round - 1) % playerIds.length];
		others = playerIds.filter((id) => id !== subjectId);

		prompt = shuffledPool.find((p) => !usedIds.has(p.id));
		if (!prompt) {
			usedIds.clear();
			prompt = shuffledPool[0];
		}
		usedIds.add(prompt.id);
		promptText = prompt.text.replace("{{player}}", playerNames[subjectId]);

		await room.updateSharedData({
			phase: "truth_writing",
			round: round,
			subjectId: subjectId,
			subjectName: playerNames[subjectId],
			prompt: promptText,
		});

		truthResponse = await room.requestInputFromSubset(
			"truth",
			{
				type: "text",
				prompt: promptText,
				timeLimit: TRUTH_TIME_LIMIT,
			},
			[subjectId],
		);

		truth = truthResponse.get(subjectId)?.value || "I have no secrets.";

		await room.updateSharedData({
			phase: "bluff_writing",
			prompt: promptText,
		});

		bluffResponses = await room.requestInputFromSubset(
			"bluff",
			{
				type: "text",
				prompt: "Write a fake answer for " + playerNames[subjectId],
				timeLimit: BLUFF_TIME_LIMIT,
			},
			others,
		);

		bluffs = [];
		bluffResponses.forEach((response, playerId) => {
			bluffs.push({
				text: response.value || "I'm a mystery.",
				authorId: playerId,
			});
		});

		allAnswers = [{ text: truth, authorId: subjectId, isTruth: true }];
		bluffs.forEach((b) => allAnswers.push(b));

		shuffledAnswers = [...allAnswers];
		for (i = shuffledAnswers.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			p = shuffledAnswers[i];
			shuffledAnswers[i] = shuffledAnswers[j];
			shuffledAnswers[j] = p;
		}

		await room.updateSharedData({
			phase: "guessing",
			answers: shuffledAnswers.map((a) => a.text),
		});

		guessResponses = await room.requestInputFromSubset(
			"guess",
			{
				type: "choice",
				prompt: "Which one is the truth?",
				choices: shuffledAnswers.map((a) => a.text),
				timeLimit: GUESS_TIME_LIMIT,
			},
			others,
		);

		results = {
			truth: truth,
			subjectId: subjectId,
			guesses: [],
			pointsEarned: {},
		};

		playerIds.forEach((id) => (results.pointsEarned[id] = 0));

		guessResponses.forEach((response, guesserId) => {
			var guessIndex = response.value;
			var guessedAnswer = shuffledAnswers[guessIndex];

			results.guesses.push({
				guesserId: guesserId,
				guessIndex: guessIndex,
				isCorrect: guessedAnswer.isTruth,
			});

			if (guessedAnswer.isTruth) {
				scores[guesserId] += POINTS_FIND_TRUTH;
				results.pointsEarned[guesserId] += POINTS_FIND_TRUTH;
			} else {
				var blufferId = guessedAnswer.authorId;
				scores[blufferId] += POINTS_FOOL_OTHERS;
				results.pointsEarned[blufferId] += POINTS_FOOL_OTHERS;

				scores[subjectId] += POINTS_SUBJECT_BONUS;
				results.pointsEarned[subjectId] += POINTS_SUBJECT_BONUS;
			}
		});

		await room.updateSharedData({
			phase: "reveal",
			results: results,
			scores: scores,
		});
		await room.delay(REVEAL_DURATION_MS);

		scoreboard = playerIds
			.map((id) => ({
				id: id,
				name: playerNames[id],
				score: scores[id],
			}))
			.sort((a, b) => b.score - a.score);

		await room.updateSharedData({
			phase: "scores",
			scoreboard: scoreboard,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	var finalScoreboard = playerIds
		.map((id) => ({
			id: id,
			name: playerNames[id],
			score: scores[id],
		}))
		.sort((a, b) => b.score - a.score);

	var winner = finalScoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: finalScoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
