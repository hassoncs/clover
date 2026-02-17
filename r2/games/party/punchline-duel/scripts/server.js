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

exports.run = async (room, config) => {
	var i;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round;
	var selectedPrompts, promptAssignments;
	var answerResponses, playerAnswers;
	var scoreboard, finalScoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for the Duel!",
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
			phase: "error",
			errorMessage: "Need at least 3 players for a Duel",
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
		playerIds.forEach((pid) => {
			promptAssignments[pid] = [];
		});

		for (i = 0; i < playerIds.length; i++) {
			var p1 = playerIds[i];
			var p2 = playerIds[(i + 1) % playerIds.length];
			var prompt = selectedPrompts[i] || {
				id: "fallback-" + i,
				text: "Write something funny!",
			};
			promptAssignments[p1].push(prompt);
			promptAssignments[p2].push(prompt);
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
		playerIds.forEach((pid) => {
			promptAssignments[pid].forEach((p) => {
				if (p && p.id) {
					playerAnswers[p.id] = {};
				}
			});
		});

		answerResponses.forEach((response, playerId) => {
			var answers = {};
			try {
				answers = JSON.parse(response.value);
			} catch (e) {
				answers = {};
			}
			for (var promptId in answers) {
				if (playerAnswers[promptId]) {
					playerAnswers[promptId][playerId] = answers[promptId];
				}
			}
		});

		for (i = 0; i < playerIds.length; i++) {
			var pid = playerIds[i];
			promptAssignments[pid].forEach((p) => {
				if (!playerAnswers[p.id][pid]) {
					playerAnswers[p.id][pid] = NO_ANSWER;
				}
			});
		}

		for (i = 0; i < selectedPrompts.length; i++) {
			var prompt = selectedPrompts[i];
			var promptAnswers = playerAnswers[prompt.id];
			var authors = Object.keys(promptAnswers);
			var p1 = authors[0];
			var p2 = authors[1];

			var voteOptions = [
				{ id: "a1", text: promptAnswers[p1], authorId: p1 },
				{ id: "a2", text: promptAnswers[p2], authorId: p2 },
			];

			await room.updateSharedData({
				phase: "reveal",
				promptText: prompt.text,
				answersJson: JSON.stringify(
					voteOptions.map((o) => ({ id: o.id, text: o.text })),
				),
			});
			await room.delay(REVEAL_DURATION_MS);

			await room.updateSharedData({
				phase: "voting",
				promptText: prompt.text,
				voteOptionsJson: JSON.stringify(
					voteOptions.map((o) => ({ id: o.id, text: o.text })),
				),
				timerRemaining: VOTE_TIME_LIMIT,
			});

			var voteResponses = await room.requestInput("vote-r" + round + "-p" + i, {
				type: "choice",
				prompt: prompt.text,
				options: ["a1", "a2"],
				timeLimit: VOTE_TIME_LIMIT,
			});

			var voteCounts = { a1: 0, a2: 0 };
			var totalVotes = 0;
			voteResponses.forEach((resp, voterId) => {
				if (voterId !== p1 && voterId !== p2) {
					if (resp.value === "a1") {
						voteCounts.a1++;
						totalVotes++;
					} else if (resp.value === "a2") {
						voteCounts.a2++;
						totalVotes++;
					}
				}
			});

			var points1 =
				totalVotes > 0
					? Math.round((voteCounts.a1 / totalVotes) * POINTS_PER_VOTE)
					: 0;
			var points2 =
				totalVotes > 0
					? Math.round((voteCounts.a2 / totalVotes) * POINTS_PER_VOTE)
					: 0;

			if (voteCounts.a1 === totalVotes && totalVotes > 0)
				points1 += QUIPLASH_BONUS;
			if (voteCounts.a2 === totalVotes && totalVotes > 0)
				points2 += QUIPLASH_BONUS;

			scores[p1] += points1;
			scores[p2] += points2;
			if (points1 > 0) await room.updatePlayerScore(p1, points1);
			if (points2 > 0) await room.updatePlayerScore(p2, points2);

			var results = [
				{
					text: promptAnswers[p1],
					authorName: playerNames[p1],
					voteCount: voteCounts.a1,
					points: points1,
				},
				{
					text: promptAnswers[p2],
					authorName: playerNames[p2],
					voteCount: voteCounts.a2,
					points: points2,
				},
			];

			await room.updateSharedData({
				phase: "round_results",
				promptText: prompt.text,
				resultsJson: JSON.stringify(results),
				scoreboardJson: JSON.stringify(
					party.createScoreboard(scores, playerNames),
				),
			});
			await room.delay(RESULTS_DURATION_MS);
		}

		scoreboard = party.createScoreboard(scores, playerNames);
		await room.updateSharedData({
			phase: "scores",
			scoreboardJson: JSON.stringify(scoreboard),
		});
		await room.delay(SCORES_DURATION_MS);
	}
	selectedPrompts = content.selectForRound(shuffledPool, 1, usedIds);
	var finalePrompt =
		selectedPrompts.length > 0
			? selectedPrompts[0]
			: { text: "The ultimate punchline:", id: "finale" };

	await room.updateSharedData({
		phase: "answering",
		roundNumber: roundCount + 1,
		totalRounds: roundCount + 1,
		promptText: "[FINALE] " + finalePrompt.text,
		timerRemaining: ANSWER_TIME_LIMIT,
	});

	answerResponses = await room.requestInput("answer-finale", {
		type: "text",
		prompt: finalePrompt.text,
		timeLimit: ANSWER_TIME_LIMIT,
	});

	var finaleAnswers = [];
	var finaleAuthorMap = {};
	answerResponses.forEach((resp, pid) => {
		var aid = "f-" + pid;
		finaleAnswers.push({
			id: aid,
			text: resp.value || NO_ANSWER,
			authorId: pid,
		});
		finaleAuthorMap[aid] = pid;
	});
	playerIds.forEach((pid) => {
		if (!answerResponses.has(pid)) {
			var aid = "f-" + pid;
			finaleAnswers.push({ id: aid, text: NO_ANSWER, authorId: pid });
			finaleAuthorMap[aid] = pid;
		}
	});

	var shuffledFinale = content.shuffle(finaleAnswers);

	await room.updateSharedData({
		phase: "voting",
		promptText: finalePrompt.text,
		voteOptionsJson: JSON.stringify(
			shuffledFinale.map((a) => ({ id: a.id, text: a.text })),
		),
		timerRemaining: VOTE_TIME_LIMIT,
	});

	var finaleVotes = await room.requestInput("vote-finale", {
		type: "choice",
		prompt: finalePrompt.text,
		options: shuffledFinale.map((a) => a.id),
		timeLimit: VOTE_TIME_LIMIT,
	});

	var finaleVoteCounts = {};
	finaleVotes.forEach((resp, voterId) => {
		var choiceId = resp.value;
		if (finaleAuthorMap[choiceId] !== voterId) {
			finaleVoteCounts[choiceId] = (finaleVoteCounts[choiceId] || 0) + 1;
		}
	});

	var finaleResults = shuffledFinale.map((a) => {
		var count = finaleVoteCounts[a.id] || 0;
		var points = count * FINALE_POINTS_PER_VOTE;
		scores[a.authorId] += points;
		if (points > 0) room.updatePlayerScore(a.authorId, points);
		return {
			text: a.text,
			authorName: playerNames[a.authorId],
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
	});

	await room.delay(WINNER_DURATION_MS);
	await room.setPhase("ended");
};
