var party = require("slopcade/party");
var content = require("slopcade/content");

var READY_TIME_LIMIT = 8;
var TURN_TIME_LIMIT = 60;
var ROUND_RESULTS_DURATION_MS = 6000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_MIN_PLAYERS = 2;
var DEFAULT_MAX_PLAYERS = 12;
var POINTS_PER_CORRECT = 100;

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeDecks(contentPack) {
	var decks = [];
	var i;
	var item;
	var deckId;

	if (!Array.isArray(contentPack)) {
		return decks;
	}

	for (i = 0; i < contentPack.length; i++) {
		item = contentPack[i];
		if (!item) {
			continue;
		}

		if (Array.isArray(item.words) && item.words.length > 0) {
			deckId = item.id ? String(item.id) : "deck-" + i;
			decks.push({
				id: deckId,
				name: item.name ? String(item.name) : "Deck " + (i + 1),
				words: item.words.map((word, wordIndex) => ({
					id: deckId + "-w" + wordIndex,
					text: String(word),
				})),
			});
			continue;
		}

		if (item.text) {
			decks.push({
				id: "single-deck",
				name: "Mixed",
				words: [
					{ id: String(item.id || "single-" + i), text: String(item.text) },
				],
			});
		}
	}

	return decks;
}

function flattenWords(decks) {
	var words = [];
	var i;
	for (i = 0; i < decks.length; i++) {
		if (!decks[i] || !Array.isArray(decks[i].words)) {
			continue;
		}
		words = words.concat(decks[i].words);
	}
	return words;
}

function nextWord(state) {
	if (!state.pool.length) {
		return null;
	}

	if (state.index >= state.pool.length) {
		state.pool = content.shuffle(state.pool.slice());
		state.index = 0;
	}

	var word = state.pool[state.index];
	state.index += 1;
	return word;
}

async function resolvePlayerName(room, playerId, fallbackName) {
	var player;

	try {
		player = await room.getPlayer(playerId);
		if (player && player.name) {
			return String(player.name);
		}
	} catch (err) {}

	return fallbackName;
}

exports.run = async (room, config) => {
	var i;
	var readyResponses;
	var playerIds;
	var playerNames;
	var pid;
	var minPlayers;
	var maxPlayers;
	var scores;
	var roundCount;
	var decks;
	var words;
	var wordState;
	var round;
	var guesserId;
	var guesserName;
	var turnEndsAt;
	var roundCorrect;
	var roundPasses;
	var history;
	var currentWord;
	var now;
	var remaining;
	var actionResponses;
	var actionResponse;
	var action;
	var scoreboard;
	var finalScoreboard;
	var winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Heads Up! Buzz in when your team is ready.",
		timeLimit: READY_TIME_LIMIT,
	});

	playerIds = [];
	playerNames = {};

	readyResponses.forEach((_response, playerId) => {
		playerIds.push(playerId);
	});

	for (i = 0; i < playerIds.length; i++) {
		pid = playerIds[i];
		playerNames[pid] = await resolvePlayerName(room, pid, "Player " + (i + 1));
	}

	minPlayers = toNumber(config && config.minPlayers, DEFAULT_MIN_PLAYERS);
	maxPlayers = toNumber(config && config.maxPlayers, DEFAULT_MAX_PLAYERS);

	if (playerIds.length < minPlayers) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least " + minPlayers + " players",
		});
		await room.setPhase("ended");
		return;
	}

	if (playerIds.length > maxPlayers) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Max players is " + maxPlayers,
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
	}

	roundCount = toNumber(config && config.roundCount, playerIds.length);
	roundCount = Math.min(roundCount, playerIds.length);

	decks = normalizeDecks(config && config.contentPack);
	words = flattenWords(decks);

	if (words.length === 0) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "No Heads Up words available",
		});
		await room.setPhase("ended");
		return;
	}

	wordState = {
		pool: content.shuffle(words.slice()),
		index: 0,
	};

	for (round = 1; round <= roundCount; round++) {
		guesserId = playerIds[(round - 1) % playerIds.length];
		guesserName = playerNames[guesserId] || "Player";
		turnEndsAt = Date.now() + TURN_TIME_LIMIT * 1000;
		roundCorrect = 0;
		roundPasses = 0;
		history = [];
		currentWord = nextWord(wordState);

		if (!currentWord) {
			break;
		}

		while (Date.now() < turnEndsAt) {
			now = Date.now();
			remaining = Math.max(0, Math.ceil((turnEndsAt - now) / 1000));

			await room.updateSharedData({
				phase: "guessing",
				roundNumber: round,
				totalRounds: roundCount,
				activeGuesserId: guesserId,
				activeGuesserName: guesserName,
				currentWord: currentWord.text,
				timerRemaining: remaining,
				roundCorrect: roundCorrect,
				roundPasses: roundPasses,
			});

			actionResponses = await room.requestInputFromSubset(
				"round-action-r" + round + "-w" + wordState.index,
				{
					type: "choice",
					prompt: "Got it or pass?",
					options: ["correct", "pass"],
					timeLimit: remaining,
				},
				[guesserId],
			);

			if (!actionResponses.has(guesserId)) {
				break;
			}

			actionResponse = actionResponses.get(guesserId);
			action = String(
				actionResponse && actionResponse.value ? actionResponse.value : "pass",
			);

			if (action === "correct") {
				roundCorrect += 1;
				scores[guesserId] = (scores[guesserId] || 0) + POINTS_PER_CORRECT;
				await room.updatePlayerScore(guesserId, POINTS_PER_CORRECT);
				history.push({
					word: currentWord.text,
					outcome: "correct",
				});
			} else {
				roundPasses += 1;
				history.push({
					word: currentWord.text,
					outcome: "pass",
				});
			}

			currentWord = nextWord(wordState);
			if (!currentWord) {
				break;
			}
		}

		if (Date.now() >= turnEndsAt && currentWord) {
			history.push({
				word: currentWord.text,
				outcome: "time",
			});
		}

		scoreboard = party.createScoreboard(scores, playerNames);

		await room.updateSharedData({
			phase: "round_results",
			roundNumber: round,
			totalRounds: roundCount,
			activeGuesserId: guesserId,
			activeGuesserName: guesserName,
			roundCorrect: roundCorrect,
			roundPasses: roundPasses,
			historyJson: JSON.stringify(history),
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await room.delay(ROUND_RESULTS_DURATION_MS);

		await room.updateSharedData({
			phase: "scores",
			roundNumber: round,
			totalRounds: roundCount,
			scoreboardJson: JSON.stringify(scoreboard),
			timerRemaining: 0,
		});

		await room.delay(SCORES_DURATION_MS);
	}

	finalScoreboard = party.createScoreboard(scores, playerNames);
	winner = finalScoreboard.length > 0 ? finalScoreboard[0] : null;

	await room.updateSharedData({
		phase: "winner",
		scoreboardJson: JSON.stringify(finalScoreboard),
		winnerName: winner ? winner.playerName : "Nobody",
		winnerScore: winner ? winner.score : 0,
		timerRemaining: 0,
	});

	await room.delay(WINNER_DURATION_MS);
	await room.setPhase("ended");
};
