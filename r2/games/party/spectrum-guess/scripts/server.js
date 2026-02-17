var party = require("slopcade/party");
var content = require("slopcade/content");

var CALIBRATION_TIME_LIMIT = 45;
var GUESS_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 6000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;

var FALLBACK_SCALES = [
	{ left: "Cute", right: "Terrifying" },
	{ left: "Cheap", right: "Expensive" },
	{ left: "Boring", right: "Exciting" },
	{ left: "Weak", right: "Powerful" },
	{ left: "Simple", right: "Complex" },
	{ left: "Old", right: "New" },
	{ left: "Cold", right: "Hot" },
	{ left: "Quiet", right: "Loud" },
	{ left: "Small", right: "Large" },
	{ left: "Easy", right: "Hard" },
];

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function calculateGuesserPoints(guess, target) {
	var diff = Math.abs(guess - target);
	var points = Math.max(0, 1000 - diff * 15);
	if (diff <= 5) {
		points += 200;
	}
	return Math.round(points);
}

function calculateCreatorPoints(avgGuess, target) {
	var diff = Math.abs(avgGuess - target);
	var points = Math.max(0, 1000 - diff * 10);
	return Math.round(points);
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, subjectId, others;
	var scale, target;
	var calibrationResponse, responseText;
	var guessResponses, guesses, totalGuess, avgGuess;
	var results, scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to The Calibration Lab!",
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
	pool = config && config.contentPack ? config.contentPack : FALLBACK_SCALES;
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

		scale = shuffledPool.find((p) => !usedIds.has(p.id || p.left + p.right));
		if (!scale) {
			usedIds.clear();
			scale = shuffledPool[0];
		}
		usedIds.add(scale.id || scale.left + scale.right);

		target = Math.floor(Math.random() * 101);

		await room.updateSharedData({
			phase: "calibration",
			round: round,
			subjectId: subjectId,
			subjectName: playerNames[subjectId],
			scale: scale,
			target: target,
		});

		calibrationResponse = await room.requestInputFromSubset(
			"calibration",
			{
				type: "text",
				prompt:
					"Represent " +
					target +
					"% on the scale: " +
					scale.left +
					" to " +
					scale.right,
				timeLimit: CALIBRATION_TIME_LIMIT,
			},
			[subjectId],
		);

		responseText =
			calibrationResponse.get(subjectId)?.value || "I'm calibrated!";

		await room.updateSharedData({
			phase: "guessing",
			scale: scale,
			responseText: responseText,
			subjectName: playerNames[subjectId],
		});

		guessResponses = await room.requestInputFromSubset(
			"guess",
			{
				type: "choice",
				prompt: "Guess the target percentage (0-100)",
				choices: Array.from({ length: 101 }, (_, i) => i.toString()),
				timeLimit: GUESS_TIME_LIMIT,
			},
			others,
		);

		guesses = [];
		totalGuess = 0;
		guessResponses.forEach((response, guesserId) => {
			var val = parseInt(response.value, 10);
			if (isNaN(val)) val = 50;
			guesses.push({
				guesserId: guesserId,
				value: val,
				points: calculateGuesserPoints(val, target),
			});
			totalGuess += val;
		});

		avgGuess = guesses.length > 0 ? totalGuess / guesses.length : 0;
		var creatorPoints = calculateCreatorPoints(avgGuess, target);

		results = {
			target: target,
			scale: scale,
			responseText: responseText,
			subjectId: subjectId,
			guesses: guesses,
			avgGuess: avgGuess,
			creatorPoints: creatorPoints,
			pointsEarned: {},
		};

		playerIds.forEach((id) => (results.pointsEarned[id] = 0));

		guesses.forEach((g) => {
			scores[g.guesserId] += g.points;
			results.pointsEarned[g.guesserId] += g.points;
		});

		scores[subjectId] += creatorPoints;
		results.pointsEarned[subjectId] += creatorPoints;

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

	winner = finalScoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: finalScoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
