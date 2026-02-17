var party = require("slopcade/party");
var content = require("slopcade/content");

var REACTION_TIME_LIMIT = 15;
var CHALLENGE_TIME_LIMIT = 5;
var JUSTIFICATION_TIME_LIMIT = 20;
var VOTING_TIME_LIMIT = 15;
var REVEAL_DURATION_MS = 3000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;

var POINTS_LINK = 100;
var POINTS_WIN_CHALLENGE = 500;
var POINTS_LOSE_CHALLENGE = -200;
var POINTS_LAST_STANDING = 1000;

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
	var scores, activePlayers;
	var roundCount, pool, shuffledPool, usedIds;
	var round, turn, currentPlayerId, others;
	var currentWord, nextWordResponse, nextWord;
	var challengeResponse, challengerId;
	var justificationResponse, justification;
	var voteResponses, upVotes, downVotes;
	var scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to the Atomic Lab! Get ready for Chain Reaction.",
		timeLimit: 10,
	});

	playerIds = [];
	playerNames = {};
	readyResponses.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] =
			response && response.playerName
				? String(response.playerName)
				: playerId.slice(0, 6);
	});

	if (playerIds.length < 2) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 2 players",
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	activePlayers = [];
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
		activePlayers.push(playerIds[i]);
	}

	roundCount = (config && config.roundCount) || 3;
	pool = (config && config.contentPack) || [];
	if (pool.length === 0) {
		pool = [
			{ id: "w1", text: "Atom" },
			{ id: "w2", text: "Electron" },
			{ id: "w3", text: "Gravity" },
			{ id: "w4", text: "Radiation" },
			{ id: "w5", text: "Molecule" },
			{ id: "w6", text: "Laboratory" },
			{ id: "w7", text: "Experiment" },
			{ id: "w8", text: "Chemical" },
			{ id: "w9", text: "Reaction" },
			{ id: "w10", text: "Energy" },
		];
	}
	shuffledPool = shuffle([...pool]);
	usedIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		var isMeltdown = round === roundCount;
		var timeMultiplier = isMeltdown ? 0.6 : 1.0;

		p = shuffledPool.find((item) => !usedIds.has(item.id));
		if (!p) {
			usedIds.clear();
			p = shuffledPool[0];
		}
		usedIds.add(p.id);
		currentWord = p.text;

		await room.updateSharedData({
			phase: "round_start",
			round: round,
			isMeltdown: isMeltdown,
			currentWord: currentWord,
			scores: scores,
		});
		await room.delay(2000);

		for (turn = 0; turn < activePlayers.length * 2; turn++) {
			if (activePlayers.length <= 1 && isMeltdown) break;

			currentPlayerId = activePlayers[turn % activePlayers.length];
			others = activePlayers.filter((id) => id !== currentPlayerId);

			await room.updateSharedData({
				phase: "reaction",
				currentPlayerId: currentPlayerId,
				currentPlayerName: playerNames[currentPlayerId],
				currentWord: currentWord,
			});

			nextWordResponse = await room.requestInputFromSubset(
				"next-word",
				{
					type: "text",
					prompt: "Provide a word related to: " + currentWord,
					timeLimit: Math.floor(REACTION_TIME_LIMIT * timeMultiplier),
				},
				[currentPlayerId],
			);

			nextWord = nextWordResponse.get(currentPlayerId)?.value;

			if (!nextWord) {
				if (isMeltdown) {
					activePlayers = activePlayers.filter((id) => id !== currentPlayerId);
					await room.updateSharedData({
						phase: "reveal",
						message: playerNames[currentPlayerId] + " was eliminated!",
					});
					await room.delay(2000);
				} else {
					scores[currentPlayerId] = Math.max(0, scores[currentPlayerId] - 100);
				}
				continue;
			}

			await room.updateSharedData({
				phase: "challenge",
				nextWord: nextWord,
				currentPlayerId: currentPlayerId,
				currentPlayerName: playerNames[currentPlayerId],
			});

			challengeResponse = await room.requestInput("challenge-buzzer", {
				type: "buzzer",
				prompt:
					"Challenge " + playerNames[currentPlayerId] + "'s word: " + nextWord,
				timeLimit: CHALLENGE_TIME_LIMIT,
			});

			challengerId = null;
			challengeResponse.forEach((resp, pid) => {
				if (others.indexOf(pid) !== -1 && !challengerId) {
					challengerId = pid;
				}
			});

			if (challengerId) {
				await room.updateSharedData({
					phase: "justification",
					challengerId: challengerId,
					challengerName: playerNames[challengerId],
					nextWord: nextWord,
					currentWord: currentWord,
				});

				justificationResponse = await room.requestInputFromSubset(
					"justification",
					{
						type: "text",
						prompt:
							"Justify why '" +
							nextWord +
							"' is related to '" +
							currentWord +
							"'",
						timeLimit: JUSTIFICATION_TIME_LIMIT,
					},
					[currentPlayerId],
				);

				justification =
					justificationResponse.get(currentPlayerId)?.value ||
					"No justification provided.";

				await room.updateSharedData({
					phase: "voting",
					justification: justification,
				});

				voteResponses = await room.requestInputFromSubset(
					"vote",
					{
						type: "choice",
						prompt: "Is this justification valid?",
						choices: ["Valid (Scientist Stays)", "Invalid (Scientist Fails)"],
						timeLimit: VOTING_TIME_LIMIT,
					},
					others,
				);

				upVotes = 0;
				downVotes = 0;
				voteResponses.forEach((resp) => {
					if (resp.value === 0) upVotes++;
					else downVotes++;
				});

				if (upVotes >= downVotes) {
					scores[currentPlayerId] += POINTS_LINK;
					scores[challengerId] += POINTS_LOSE_CHALLENGE;
					currentWord = nextWord;
					await room.updateSharedData({
						phase: "reveal",
						message:
							"Justification accepted! " +
							playerNames[currentPlayerId] +
							" stays.",
					});
				} else {
					scores[challengerId] += POINTS_WIN_CHALLENGE;
					scores[currentPlayerId] += POINTS_LOSE_CHALLENGE;
					if (isMeltdown) {
						activePlayers = activePlayers.filter(
							(id) => id !== currentPlayerId,
						);
						await room.updateSharedData({
							phase: "reveal",
							message:
								"Justification rejected! " +
								playerNames[currentPlayerId] +
								" was eliminated!",
						});
					} else {
						await room.updateSharedData({
							phase: "reveal",
							message: "Justification rejected!",
						});
					}
				}
				await room.delay(REVEAL_DURATION_MS);
			} else {
				scores[currentPlayerId] += POINTS_LINK;
				currentWord = nextWord;
			}
		}

		if (isMeltdown && activePlayers.length > 0) {
			winner = activePlayers[0];
			scores[winner] += POINTS_LAST_STANDING;
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

	winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
