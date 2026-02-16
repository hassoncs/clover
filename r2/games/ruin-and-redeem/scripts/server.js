var party = require("slopcade/party");
var content = require("slopcade/content");

var RUIN_TIME_LIMIT = 45;
var REDEEM_TIME_LIMIT = 45;
var VOTE_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 7000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;
var POINTS_REDEMPTION_VOTE = 300;
var POINTS_RUINER_BONUS = 100;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async (room, config) => {
	var i, j, k, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round;
	var prompts;
	var ruinResponses, ruins;
	var shuffledRuins, redeemResponses, redemptions;
	var voteResponses, results;
	var scoreboard, winner;
	var current, others, voteIdx, redeemerId, ruinerId, maxVotes;
	var finalScoreboard;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Ruin and Redeem!",
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
		prompts = [];
		for (i = 0; i < playerIds.length; i++) {
			p = shuffledPool.find((item) => !usedIds.has(item.id));
			if (!p) {
				usedIds.clear();
				p = shuffledPool[i % shuffledPool.length];
			}
			usedIds.add(p.id);
			prompts.push(p);
		}

		await room.updateSharedData({
			phase: "ruining",
			round: round,
			prompts: playerIds.map((id, idx) => ({
				playerId: id,
				text: prompts[idx].text,
			})),
		});

		ruinResponses = await room.requestInput("ruin", {
			type: "text",
			prompt: "Ruin this blessing!",
			timeLimit: RUIN_TIME_LIMIT,
		});

		ruins = [];
		playerIds.forEach((id, idx) => {
			ruins.push({
				originalPrompt: prompts[idx].text,
				ruinerId: id,
				ruinText: ruinResponses.get(id)?.value || "It just got worse.",
			});
		});

		shuffledRuins = [...ruins];
		for (i = shuffledRuins.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			p = shuffledRuins[i];
			shuffledRuins[i] = shuffledRuins[j];
			shuffledRuins[j] = p;
		}

		for (i = 0; i < shuffledRuins.length; i++) {
			if (shuffledRuins[i].ruinerId === playerIds[i]) {
				j = (i + 1) % shuffledRuins.length;
				p = shuffledRuins[i];
				shuffledRuins[i] = shuffledRuins[j];
				shuffledRuins[j] = p;
			}
		}

		await room.updateSharedData({
			phase: "redeeming",
			ruins: playerIds.map((id, idx) => ({
				playerId: id,
				text: shuffledRuins[idx].ruinText,
			})),
		});

		redeemResponses = await room.requestInput("redeem", {
			type: "text",
			prompt: "Redeem this disaster!",
			timeLimit: REDEEM_TIME_LIMIT,
		});

		redemptions = [];
		playerIds.forEach((id, idx) => {
			redemptions.push({
				originalPrompt: shuffledRuins[idx].originalPrompt,
				ruinerId: shuffledRuins[idx].ruinerId,
				ruinText: shuffledRuins[idx].ruinText,
				redeemerId: id,
				redeemText: redeemResponses.get(id)?.value || "But then it was okay.",
			});
		});

		await room.updateSharedData({
			phase: "voting",
			redemptions: redemptions.map((r, idx) => ({
				id: idx,
				text: r.redeemText,
				ruin: r.ruinText,
				original: r.originalPrompt,
			})),
		});

		voteResponses = await room.requestInput("vote", {
			type: "choice",
			prompt: "Vote for the best redemption!",
			choices: redemptions.map((r) => r.redeemText),
			timeLimit: VOTE_TIME_LIMIT,
		});

		results = {
			redemptions: redemptions,
			votes: {},
			voters: {},
			pointsEarned: {},
		};

		playerIds.forEach((id) => (results.pointsEarned[id] = 0));
		for (j = 0; j < redemptions.length; j++) results.votes[j] = 0;

		voteResponses.forEach((response, voterId) => {
			voteIdx = response.value;
			if (voteIdx >= 0 && voteIdx < redemptions.length) {
				results.votes[voteIdx]++;
				results.voters[voterId] = voteIdx;

				redeemerId = redemptions[voteIdx].redeemerId;
				scores[redeemerId] += POINTS_REDEMPTION_VOTE;
				results.pointsEarned[redeemerId] += POINTS_REDEMPTION_VOTE;
			}
		});

		maxVotes = 0;
		for (j = 0; j < redemptions.length; j++) {
			if (results.votes[j] > maxVotes) maxVotes = results.votes[j];
		}

		if (maxVotes > 0) {
			for (j = 0; j < redemptions.length; j++) {
				if (results.votes[j] === maxVotes) {
					ruinerId = redemptions[j].ruinerId;
					scores[ruinerId] += POINTS_RUINER_BONUS;
					results.pointsEarned[ruinerId] += POINTS_RUINER_BONUS;
				}
			}
		}

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
