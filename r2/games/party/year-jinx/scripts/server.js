var party = require("slopcade/party");
var content = require("slopcade/content");

var GUESS_TIME_LIMIT = 20;
var JINX_TIME_LIMIT = 5;
var REVEAL_DURATION_MS = 4000;
var SCORES_DURATION_MS = 4000;
var WINNER_DURATION_MS = 10000;

var FALLBACK_EVENTS = [
	{ event: "The first iPhone is released", year: 2007, era: "recent" },
	{ event: "The Berlin Wall falls", year: 1989, era: "modern" },
	{ event: "The Magna Carta is signed", year: 1215, era: "ancient" },
	{ event: "First man on the moon", year: 1969, era: "modern" },
	{ event: "World Wide Web is invented", year: 1989, era: "modern" },
	{ event: "The Great Fire of London", year: 1666, era: "ancient" },
	{ event: "The Titanic sinks", year: 1912, era: "modern" },
	{ event: "The French Revolution begins", year: 1789, era: "ancient" },
	{ event: "Facebook is launched", year: 2004, era: "recent" },
	{ event: "The Wright brothers' first flight", year: 1903, era: "modern" },
];

function calculatePoints(guess, actual) {
	var diff = Math.abs(guess - actual);
	if (diff === 0) return -500;
	if (diff <= 2) return 0;
	return diff;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var pool, eraPools;
	var round, era, timeLimit, eventsInRound;
	var eventItem, guessResponses, results;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Year Jinx!",
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

	if (playerIds.length < 1) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 1 player",
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
	}

	pool =
		config && config.contentPack && config.contentPack.length > 0
			? config.contentPack
			: FALLBACK_EVENTS;

	eraPools = {
		recent: pool.filter((e) => e.era === "recent"),
		modern: pool.filter((e) => e.era === "modern"),
		ancient: pool.filter((e) => e.era === "ancient"),
	};

	if (eraPools.recent.length === 0) eraPools.recent = pool;
	if (eraPools.modern.length === 0) eraPools.modern = pool;
	if (eraPools.ancient.length === 0) eraPools.ancient = pool;

	for (round = 1; round <= 3; round++) {
		era = round === 1 ? "recent" : round === 2 ? "modern" : "ancient";
		var eraName =
			round === 1
				? "The Recent Past (1990 - Present)"
				: round === 2
					? "The Modern Era (1900 - 1989)"
					: "Ancient & Medieval (Before 1900)";

		await room.updateSharedData({
			phase: "round_start",
			round: round,
			era: era,
			eraName: eraName,
			isJinx: round === 3,
		});
		await room.delay(3000);

		eventsInRound = round === 3 ? 3 : 1;
		timeLimit = round === 3 ? JINX_TIME_LIMIT : GUESS_TIME_LIMIT;

		for (r = 0; r < eventsInRound; r++) {
			var currentEraPool = eraPools[era];
			eventItem =
				currentEraPool[Math.floor(Math.random() * currentEraPool.length)];

			await room.updateSharedData({
				phase: "guessing",
				event: eventItem.event,
				timeLimit: timeLimit,
				subRound: round === 3 ? r + 1 : null,
			});

			guessResponses = await room.requestInput("guess", {
				type: "text",
				prompt: "What year did this happen: " + eventItem.event + "?",
				timeLimit: timeLimit,
			});

			results = {
				event: eventItem.event,
				actualYear: eventItem.year,
				guesses: [],
				pointsEarned: {},
			};

			playerIds.forEach((id) => {
				var response = guessResponses.get(id);
				var guess = response ? parseInt(response.value) : null;
				var points = 1000;

				if (guess !== null && !isNaN(guess)) {
					points = calculatePoints(guess, eventItem.year);
				}

				scores[id] += points;
				results.pointsEarned[id] = points;
				results.guesses.push({
					playerId: id,
					playerName: playerNames[id],
					guess: guess,
					points: points,
					isPerfect: points === -500,
					isClose: points === 0,
				});
			});

			await room.updateSharedData({
				phase: "reveal",
				results: results,
				scores: scores,
			});
			await room.delay(REVEAL_DURATION_MS);
		}

		scoreboard = playerIds
			.map((id) => ({
				id: id,
				name: playerNames[id],
				score: scores[id],
			}))
			.sort((a, b) => a.score - b.score);

		await room.updateSharedData({
			phase: "scores",
			scoreboard: scoreboard,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
