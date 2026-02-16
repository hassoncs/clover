var party = require("slopcade/party");
var content = require("slopcade/content");

var DRAFT_TIME_LIMIT = 45;
var VOTE_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 2;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async (room, config) => {
	var i, j, p, r, turn;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, drafterId, others;
	var prompt, promptText;
	var draftResponses, draft;
	var voteResponses, votes;
	var countA, countB, totalVotes;
	var points, diffPercent, ratio;
	var results, minorityValue;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Half and Half!",
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
		for (turn = 0; turn < playerIds.length; turn++) {
			drafterId = playerIds[turn];
			others = playerIds.filter((id) => id !== drafterId);

			prompt = shuffledPool.find((p) => !usedIds.has(p.id));
			if (!prompt) {
				usedIds.clear();
				prompt = shuffledPool[0];
			}
			usedIds.add(prompt.id);
			promptText = prompt.text;

			await room.updateSharedData({
				phase: "drafting",
				round: round,
				drafterId: drafterId,
				drafterName: playerNames[drafterId],
				prompt: promptText,
			});

			draftResponses = await room.requestInputFromSubset(
				"draft",
				{
					type: "text",
					prompt: promptText + " ...",
					timeLimit: DRAFT_TIME_LIMIT,
				},
				[drafterId],
			);

			draft = draftResponses.get(drafterId)?.value || "BUT nothing happens.";

			await room.updateSharedData({
				phase: "voting",
				drafterId: drafterId,
				drafterName: playerNames[drafterId],
				prompt: promptText,
				draft: draft,
			});

			voteResponses = await room.requestInputFromSubset(
				"vote",
				{
					type: "choice",
					prompt: promptText + " " + draft + "?",
					choices: ["I'm in!", "No way!"],
					timeLimit: VOTE_TIME_LIMIT,
				},
				others,
			);

			countA = 0;
			countB = 0;
			voteResponses.forEach((response) => {
				if (response.value === 0) countA++;
				else countB++;
			});

			totalVotes = others.length;
			if (totalVotes > 0) {
				diffPercent = Math.abs(countA - countB) / totalVotes;
				if (countA === countB) {
					points = 1000;
				} else if (diffPercent <= 0.25) {
					points = 500;
				} else if (diffPercent >= 0.8) {
					points = 0;
				} else {
					points = 200;
				}
			} else {
				points = 0;
			}

			scores[drafterId] += points;

			results = {
				drafterId: drafterId,
				prompt: promptText,
				draft: draft,
				countA: countA,
				countB: countB,
				pointsEarned: points,
				voters: [],
			};

			minorityValue = -1;
			if (countA < countB) minorityValue = 0;
			else if (countB < countA) minorityValue = 1;

			voteResponses.forEach((response, voterId) => {
				var earned = 0;
				if (minorityValue !== -1 && response.value === minorityValue) {
					earned = 200;
					scores[voterId] += earned;
				}
				results.voters.push({
					id: voterId,
					name: playerNames[voterId],
					choice: response.value,
					earned: earned,
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
			.sort((a, b) => b.score - a.score);

		await room.updateSharedData({
			phase: "scores",
			scoreboard: scoreboard,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	var winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
