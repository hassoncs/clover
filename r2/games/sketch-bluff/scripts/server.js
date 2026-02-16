var party = require("slopcade/party");
var content = require("slopcade/content");

var DRAWING_TIME_LIMIT = 45;
var BLUFFING_TIME_LIMIT = 30;
var VOTING_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 2;
var POINTS_ARTIST_GUESSED = 1000;
var POINTS_PER_BLUFF_VOTE = 500;
var POINTS_CORRECT_GUESS = 1000;

var FALLBACK_PROMPTS = [
	{ id: "fb1", prompt: "A haunted toaster", category: "surreal" },
	{ id: "fb2", prompt: "A depressed robot", category: "surreal" },
	{ id: "fb3", prompt: "A cat wearing a business suit", category: "funny" },
	{ id: "fb4", prompt: "An alien's first day at work", category: "funny" },
	{ id: "fb5", prompt: "A dinosaur at a tea party", category: "funny" },
	{
		id: "fb6",
		prompt: "A cloud that's afraid of heights",
		category: "surreal",
	},
	{ id: "fb7", prompt: "A penguin's nightmare", category: "surreal" },
	{ id: "fb8", prompt: "A sandwich that hates being eaten", category: "funny" },
	{
		id: "fb9",
		prompt: "A ghost trying to use a smartphone",
		category: "funny",
	},
	{
		id: "fb10",
		prompt: "A tree that wants to become a boat",
		category: "surreal",
	},
];

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function shuffle(array) {
	var i, j, temp;
	var result = array.slice();
	for (i = result.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		temp = result[i];
		result[i] = result[j];
		result[j] = temp;
	}
	return result;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores;
	var roundCount, pool, shuffledPool, usedIds;
	var round, roundAssignments;
	var drawingResponses, drawings;
	var bluffResponses, bluffs;
	var drawingIndex, drawing, artistId, realPrompt;
	var allTitles, shuffledTitles;
	var votingResponses, results;
	var scoreboard, winner;
	var drawingPrompts, shuffledDrawings, bluffAssignments, availableDrawings;
	var assignedDrawing,
		playerId,
		promptItem,
		voters,
		voteIndex,
		votedTitle,
		guesserId,
		blufferId;
	var finalScoreboard;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Sketch Bluff!",
		timeLimit: 5,
	});

	playerIds = [];
	playerNames = {};

	readyResponses.forEach((response, pid) => {
		playerIds.push(pid);
		playerNames[pid] =
			response && response.playerId
				? String(response.playerId)
				: pid.slice(0, 6);
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
			: FALLBACK_PROMPTS;
	shuffledPool = shuffle(pool);
	usedIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		await room.updateSharedData({
			phase: "drawing",
			round: round,
			totalRounds: roundCount,
		});

		roundAssignments = {};
		for (i = 0; i < playerIds.length; i++) {
			promptItem = null;
			for (j = 0; j < shuffledPool.length; j++) {
				if (!usedIds.has(shuffledPool[j].id)) {
					promptItem = shuffledPool[j];
					break;
				}
			}
			if (!promptItem) {
				usedIds.clear();
				promptItem = shuffledPool[0];
			}
			usedIds.add(promptItem.id);
			roundAssignments[playerIds[i]] = promptItem;
		}

		drawingPrompts = {};
		playerIds.forEach((pid) => {
			drawingPrompts[pid] = roundAssignments[pid].prompt;
		});

		drawingResponses = await room.requestInput("drawing", {
			type: "drawing",
			prompt: "Draw your assigned prompt!",
			timeLimit: DRAWING_TIME_LIMIT,
			metadata: {
				assignments: drawingPrompts,
			},
		});

		drawings = [];
		drawingResponses.forEach((response, pid) => {
			drawings.push({
				artistId: pid,
				artistName: playerNames[pid],
				prompt: roundAssignments[pid].prompt,
				promptId: roundAssignments[pid].id,
				imageData: response.value,
			});
		});

		await room.updateSharedData({
			phase: "bluffing",
			round: round,
		});

		shuffledDrawings = shuffle(drawings);
		bluffAssignments = {};
		availableDrawings = shuffledDrawings.slice();

		for (i = 0; i < playerIds.length; i++) {
			playerId = playerIds[i];
			assignedDrawing = null;
			for (j = 0; j < availableDrawings.length; j++) {
				if (availableDrawings[j].artistId !== playerId) {
					assignedDrawing = availableDrawings[j];
					availableDrawings.splice(j, 1);
					break;
				}
			}
			if (!assignedDrawing && shuffledDrawings.length > 0) {
				for (j = 0; j < shuffledDrawings.length; j++) {
					if (shuffledDrawings[j].artistId !== playerId) {
						assignedDrawing = shuffledDrawings[j];
						break;
					}
				}
			}
			if (assignedDrawing) {
				bluffAssignments[playerId] = assignedDrawing;
			}
		}

		bluffResponses = await room.requestInput("bluff", {
			type: "text",
			prompt: "Write a fake title for this drawing!",
			timeLimit: BLUFFING_TIME_LIMIT,
			metadata: {
				assignments: bluffAssignments,
			},
		});

		for (drawingIndex = 0; drawingIndex < drawings.length; drawingIndex++) {
			drawing = drawings[drawingIndex];
			artistId = drawing.artistId;
			realPrompt = drawing.prompt;

			bluffs = [];
			bluffResponses.forEach((response, pid) => {
				var assignment = bluffAssignments[pid];
				if (assignment && assignment.artistId === artistId) {
					bluffs.push({
						text: response.value || "Untitled Masterpiece",
						authorId: pid,
						authorName: playerNames[pid],
					});
				}
			});

			allTitles = [
				{
					text: realPrompt,
					authorId: artistId,
					authorName: playerNames[artistId],
					isReal: true,
				},
			];
			for (i = 0; i < bluffs.length; i++) {
				allTitles.push(bluffs[i]);
			}

			shuffledTitles = shuffle(allTitles);

			await room.updateSharedData({
				phase: "voting",
				round: round,
				currentDrawing: {
					imageData: drawing.imageData,
					artistName: drawing.artistName,
					titles: shuffledTitles.map((t) => t.text),
				},
			});

			voters = playerIds.filter((id) => id !== artistId);

			votingResponses = await room.requestInputFromSubset(
				"vote",
				{
					type: "choice",
					prompt: "Which is the real title?",
					choices: shuffledTitles.map((t) => t.text),
					timeLimit: VOTING_TIME_LIMIT,
				},
				voters,
			);

			results = {
				drawing: drawing,
				realPrompt: realPrompt,
				artistId: artistId,
				artistName: playerNames[artistId],
				titles: shuffledTitles,
				votes: [],
				pointsEarned: {},
			};

			playerIds.forEach((id) => {
				results.pointsEarned[id] = 0;
			});

			votingResponses.forEach((response, gId) => {
				voteIndex = response.value;
				votedTitle = shuffledTitles[voteIndex];

				results.votes.push({
					guesserId: gId,
					guesserName: playerNames[gId],
					votedText: votedTitle.text,
					isCorrect: votedTitle.isReal,
				});

				if (votedTitle.isReal) {
					scores[gId] += POINTS_CORRECT_GUESS;
					results.pointsEarned[gId] += POINTS_CORRECT_GUESS;
					scores[artistId] += POINTS_ARTIST_GUESSED;
					results.pointsEarned[artistId] += POINTS_ARTIST_GUESSED;
				} else {
					blufferId = votedTitle.authorId;
					scores[blufferId] += POINTS_PER_BLUFF_VOTE;
					results.pointsEarned[blufferId] += POINTS_PER_BLUFF_VOTE;
				}
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
			round: round,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	finalScoreboard = playerIds
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
