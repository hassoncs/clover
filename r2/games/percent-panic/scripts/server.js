var party = require("slopcade/party");
var content = require("slopcade/content");

var AGENT_GUESS_TIME_LIMIT = 30;
var GROUP_BET_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 6000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;

var FALLBACK_QUESTIONS = [
	{
		question: "What percentage of people have a fear of spiders?",
		percentage: 6,
		source: "Psychology Today",
	},
	{
		question: "What percentage of the world is left-handed?",
		percentage: 10,
		source: "Scientific American",
	},
	{
		question: "What percentage of people can whistle?",
		percentage: 67,
		source: "General Survey",
	},
	{
		question: "What percentage of the Earth is covered by water?",
		percentage: 71,
		source: "NASA",
	},
	{
		question: "What percentage of people have blue eyes?",
		percentage: 9,
		source: "World Atlas",
	},
	{
		question: "What percentage of people dream in black and white?",
		percentage: 12,
		source: "NYT",
	},
	{
		question: "What percentage of people are 'morning people'?",
		percentage: 25,
		source: "Sleep Foundation",
	},
	{
		question: "What percentage of people have never seen snow?",
		percentage: 50,
		source: "Weather Channel",
	},
];

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function shuffle(array) {
	var i, j, temp;
	for (i = array.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, agentId, others;
	var prompt, actualPercentage;
	var agentResponse, agentGuess;
	var betResponses, results;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to Percent Panic!",
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
	pool =
		config && config.contentPack && config.contentPack.length > 0
			? config.contentPack
			: FALLBACK_QUESTIONS;
	shuffledPool = shuffle([...pool]);
	usedIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		agentId = playerIds[(round - 1) % playerIds.length];
		others = playerIds.filter((id) => id !== agentId);

		prompt = shuffledPool.find((p) => !usedIds.has(p.question));
		if (!prompt) {
			usedIds.clear();
			prompt = shuffledPool[0];
		}
		usedIds.add(prompt.question);
		actualPercentage = prompt.percentage;

		await room.updateSharedData({
			phase: "agent_guess",
			round: round,
			agentId: agentId,
			agentName: playerNames[agentId],
			question: prompt.question,
		});

		agentResponse = await room.requestInputFromSubset(
			"agent_guess",
			{
				type: "choice",
				prompt: prompt.question,
				choices: Array.from({ length: 101 }, (_, i) => i + "%"),
				timeLimit: AGENT_GUESS_TIME_LIMIT,
			},
			[agentId],
		);

		agentGuess = agentResponse.get(agentId)?.value;
		if (agentGuess === undefined) agentGuess = 50;

		await room.updateSharedData({
			phase: "group_bet",
			agentGuess: agentGuess,
			question: prompt.question,
		});

		betResponses = await room.requestInputFromSubset(
			"group_bet",
			{
				type: "choice",
				prompt: "Is the real answer Higher or Lower than " + agentGuess + "%?",
				choices: [
					"Higher (1x)",
					"Higher (2x)",
					"Higher (3x)",
					"Lower (1x)",
					"Lower (2x)",
					"Lower (3x)",
				],
				timeLimit: GROUP_BET_TIME_LIMIT,
			},
			others,
		);

		results = {
			question: prompt.question,
			actualPercentage: actualPercentage,
			agentId: agentId,
			agentGuess: agentGuess,
			bets: [],
			pointsEarned: {},
			source: prompt.source,
		};

		playerIds.forEach((id) => (results.pointsEarned[id] = 0));

		var agentDiff = Math.abs(agentGuess - actualPercentage);
		var agentPoints = Math.max(0, 1000 - agentDiff * 20);
		scores[agentId] += agentPoints;
		results.pointsEarned[agentId] = agentPoints;

		betResponses.forEach((response, guesserId) => {
			var betIndex = response.value;
			var isHigher = betIndex < 3;
			var multiplier = (betIndex % 3) + 1;
			var isCorrect = false;

			if (isHigher && actualPercentage > agentGuess) isCorrect = true;
			if (!isHigher && actualPercentage < agentGuess) isCorrect = true;
			if (actualPercentage === agentGuess) isCorrect = true;

			var points = isCorrect ? 500 * multiplier : 0;
			scores[guesserId] += points;
			results.pointsEarned[guesserId] = points;

			results.bets.push({
				guesserId: guesserId,
				bet: isHigher ? "Higher" : "Lower",
				multiplier: multiplier,
				isCorrect: isCorrect,
				points: points,
			});
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

	winner = finalScoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: finalScoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
