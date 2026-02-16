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
	{ id: "fb1", prompt: "A cat chasing a laser pointer", category: "action" },
	{ id: "fb2", prompt: "A person sneezing explosively", category: "action" },
	{ id: "fb3", prompt: "A dog wagging its tail excitedly", category: "action" },
	{ id: "fb4", prompt: "Someone jumping rope", category: "action" },
	{ id: "fb5", prompt: "A bird flapping its wings", category: "action" },
	{ id: "fb6", prompt: "A person blinking slowly", category: "action" },
	{ id: "fb7", prompt: "A fish swimming upstream", category: "action" },
	{ id: "fb8", prompt: "Someone clapping their hands", category: "action" },
	{ id: "fb9", prompt: "A frog catching a fly", category: "action" },
	{ id: "fb10", prompt: "A person waving hello", category: "action" },
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
	var frame1Responses, frame2Responses, animations;
	var bluffResponses, bluffs;
	var animationIndex, animation, artistId, realPrompt;
	var allTitles, shuffledTitles;
	var votingResponses, results;
	var scoreboard, winner;
	var animationPrompts,
		shuffledAnimations,
		bluffAssignments,
		availableAnimations;
	var assignedAnimation,
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
		prompt: "Get ready for Flicker Frames!",
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

		animationPrompts = {};
		playerIds.forEach((pid) => {
			animationPrompts[pid] = roundAssignments[pid].prompt;
		});

		await room.updateSharedData({
			phase: "drawing_f1",
			round: round,
			totalRounds: roundCount,
		});

		frame1Responses = await room.requestInput("drawing-frame1", {
			type: "drawing",
			prompt: "Draw Frame 1 of your animation!",
			timeLimit: DRAWING_TIME_LIMIT,
			metadata: {
				assignments: animationPrompts,
				frameNumber: 1,
			},
		});

		var frame1Drawings = {};
		frame1Responses.forEach((response, pid) => {
			frame1Drawings[pid] = response.value;
		});

		await room.updateSharedData({
			phase: "drawing_f2",
			round: round,
			totalRounds: roundCount,
		});

		var frame2Metadata = {
			assignments: animationPrompts,
			frameNumber: 2,
			onionSkinFrame1: frame1Drawings,
		};

		frame2Responses = await room.requestInput("drawing-frame2", {
			type: "drawing",
			prompt: "Draw Frame 2 (with onion skin of Frame 1)!",
			timeLimit: DRAWING_TIME_LIMIT,
			metadata: frame2Metadata,
		});

		animations = [];
		frame2Responses.forEach((response, pid) => {
			animations.push({
				artistId: pid,
				artistName: playerNames[pid],
				prompt: roundAssignments[pid].prompt,
				promptId: roundAssignments[pid].id,
				frame1: frame1Drawings[pid],
				frame2: response.value,
			});
		});

		await room.updateSharedData({
			phase: "bluffing",
			round: round,
		});

		shuffledAnimations = shuffle(animations);
		bluffAssignments = {};
		availableAnimations = shuffledAnimations.slice();

		for (i = 0; i < playerIds.length; i++) {
			playerId = playerIds[i];
			assignedAnimation = null;
			for (j = 0; j < availableAnimations.length; j++) {
				if (availableAnimations[j].artistId !== playerId) {
					assignedAnimation = availableAnimations[j];
					availableAnimations.splice(j, 1);
					break;
				}
			}
			if (!assignedAnimation && shuffledAnimations.length > 0) {
				for (j = 0; j < shuffledAnimations.length; j++) {
					if (shuffledAnimations[j].artistId !== playerId) {
						assignedAnimation = shuffledAnimations[j];
						break;
					}
				}
			}
			if (assignedAnimation) {
				bluffAssignments[playerId] = assignedAnimation;
			}
		}

		bluffResponses = await room.requestInput("bluff", {
			type: "text",
			prompt: "Write a fake title for this flickering animation!",
			timeLimit: BLUFFING_TIME_LIMIT,
			metadata: {
				assignments: bluffAssignments,
			},
		});

		for (
			animationIndex = 0;
			animationIndex < animations.length;
			animationIndex++
		) {
			animation = animations[animationIndex];
			artistId = animation.artistId;
			realPrompt = animation.prompt;

			bluffs = [];
			bluffResponses.forEach((response, pid) => {
				var assignment = bluffAssignments[pid];
				if (assignment && assignment.artistId === artistId) {
					bluffs.push({
						text: response.value || "Untitled Animation",
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
				currentAnimation: {
					frame1: animation.frame1,
					frame2: animation.frame2,
					artistName: animation.artistName,
					titles: shuffledTitles.map((t) => t.text),
				},
			});

			voters = playerIds.filter((id) => id !== artistId);

			votingResponses = await room.requestInputFromSubset(
				"vote",
				{
					type: "choice",
					prompt: "Which is the real title of this flickering animation?",
					choices: shuffledTitles.map((t) => t.text),
					timeLimit: VOTING_TIME_LIMIT,
				},
				voters,
			);

			results = {
				animation: animation,
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
