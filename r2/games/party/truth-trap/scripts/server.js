var party = require("slopcade/party");
var content = require("slopcade/content");

var WRITING_TIME_LIMIT = 45;
var VOTING_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 7000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;

var POINTS_FIND_TRUTH = 1000;
var POINTS_FOOL_OTHERS = 500;
var PENALTY_HOUSE_TRAP = -250;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, multiplier;
	var prompt, promptText, truth;
	var lieResponses, lies;
	var houseDecoy;
	var allAnswers, shuffledAnswers;
	var voteResponses, results;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Truth Trap!",
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

	if (pool.length === 0) {
		pool = [
			{
				id: "f1",
				question: "In 1923, a man was arrested for trying to sell the ______.",
				answer: "Eiffel Tower",
			},
			{
				id: "f2",
				question: "The first product to have a barcode was ______.",
				answer: "Wrigley's gum",
			},
			{
				id: "f3",
				question: "In Switzerland, it is illegal to own just one ______.",
				answer: "guinea pig",
			},
			{
				id: "f4",
				question: "The state of ______ has the most lighthouses in the US.",
				answer: "Michigan",
			},
			{
				id: "f5",
				question: "A group of flamingos is called a ______.",
				answer: "flamboyance",
			},
			{
				id: "f6",
				question: "The first animal in space was a ______ named Laika.",
				answer: "dog",
			},
			{
				id: "f7",
				question: "The inventor of the ______ was buried in a Pringles can.",
				answer: "Pringles can",
			},
			{
				id: "f8",
				question: "In 2006, a man tried to sell ______ on eBay.",
				answer: "New Zealand",
			},
			{
				id: "f9",
				question: "The fear of long words is called ______.",
				answer: "hippopotomonstrosesquippedaliophobia",
			},
			{
				id: "f10",
				question: "A ______ can hold its breath longer than a dolphin.",
				answer: "sloth",
			},
		];
	}

	shuffledPool = content.shuffle(pool);
	usedIds = {};

	for (round = 1; round <= roundCount; round++) {
		multiplier = 1;
		if (round === 2) multiplier = 1.5;
		if (round === roundCount) multiplier = 2;

		prompt = shuffledPool.find((p) => !usedIds[p.id]);
		if (!prompt) {
			usedIds = {};
			prompt = shuffledPool[0];
		}
		usedIds[prompt.id] = true;
		promptText = prompt.question || prompt.text;
		truth = prompt.answer;

		await room.updateSharedData({
			phase: "writing_lies",
			round: round,
			multiplier: multiplier,
			prompt: promptText,
		});

		lieResponses = await room.requestInput("lies", {
			type: "text",
			prompt: promptText,
			timeLimit: WRITING_TIME_LIMIT,
		});

		lies = [];
		lieResponses.forEach((response, playerId) => {
			var val = response.value || "I'm stumped.";
			if (val.toLowerCase().trim() === truth.toLowerCase().trim()) {
				val = "The actual truth (but I'm lying)";
			}
			lies.push({
				text: val,
				authorId: playerId,
				type: "player",
			});
		});

		houseDecoy =
			(prompt.metadata && prompt.metadata.houseDecoy) ||
			"A very convincing fake";
		lies.push({
			text: houseDecoy,
			authorId: "house",
			type: "house",
		});

		allAnswers = [{ text: truth, authorId: "truth", type: "truth" }];
		lies.forEach((l) => allAnswers.push(l));

		shuffledAnswers = content.shuffle(allAnswers);

		await room.updateSharedData({
			phase: "voting",
			answers: shuffledAnswers.map((a) => a.text),
		});

		voteResponses = await room.requestInput("votes", {
			type: "choice",
			prompt: "Which one is the truth?",
			choices: shuffledAnswers.map((a) => a.text),
			timeLimit: VOTING_TIME_LIMIT,
		});

		results = {
			truth: truth,
			answers: shuffledAnswers,
			votes: [],
			pointsEarned: {},
		};

		playerIds.forEach((id) => (results.pointsEarned[id] = 0));

		voteResponses.forEach((response, voterId) => {
			var voteIndex = response.value;
			var votedAnswer = shuffledAnswers[voteIndex];

			results.votes.push({
				voterId: voterId,
				voteIndex: voteIndex,
				type: votedAnswer.type,
			});

			if (votedAnswer.type === "truth") {
				scores[voterId] += POINTS_FIND_TRUTH * multiplier;
				results.pointsEarned[voterId] += POINTS_FIND_TRUTH * multiplier;
			} else if (votedAnswer.type === "player") {
				var blufferId = votedAnswer.authorId;
				scores[blufferId] += POINTS_FOOL_OTHERS * multiplier;
				results.pointsEarned[blufferId] += POINTS_FOOL_OTHERS * multiplier;
			} else if (votedAnswer.type === "house") {
				scores[voterId] += PENALTY_HOUSE_TRAP * multiplier;
				results.pointsEarned[voterId] += PENALTY_HOUSE_TRAP * multiplier;
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
