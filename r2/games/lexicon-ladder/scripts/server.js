var party = require("slopcade/party");
var content = require("slopcade/content");

var DEFINING_TIME_LIMIT = 60;
var SENTENCING_TIME_LIMIT = 60;
var VOTING_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 8000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;

var POINTS_DEFINITION_VOTE = 400;
var POINTS_SENTENCE_VOTE = 200;
var POINTS_ACADEMIC_BONUS = 100;

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
	var i, j, k, p, r;
	var playerIds, playerNames, scores;
	var roundCount, wordPool, usedWordIds;
	var round, words, assignments, definitions, sentences;
	var scoreboard, winner;

	await room.setPhase("playing");

	playerIds = Array.from((await room.getPlayers()).keys());
	playerNames = {};
	scores = {};

	for (i = 0; i < playerIds.length; i++) {
		p = playerIds[i];
		playerNames[p] = (await room.getPlayer(p)).name || "Scholar " + (i + 1);
		scores[p] = 0;
	}

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players",
		});
		await room.setPhase("ended");
		return;
	}

	roundCount = (config && config.roundCount) || 2;
	wordPool = shuffle([...(config.contentPack || [])]);
	usedWordIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		words = [];
		for (i = 0; i < playerIds.length; i++) {
			var word = wordPool.find((w) => !usedWordIds.has(w.id));
			if (!word) {
				usedWordIds.clear();
				word = wordPool[0];
			}
			usedWordIds.add(word.id);
			words.push(word);
		}

		assignments = [];
		for (i = 0; i < words.length; i++) {
			assignments.push({
				word: words[i],
				definers: [playerIds[i], playerIds[(i + 1) % playerIds.length]],
			});
		}

		await room.updateSharedData({
			phase: "defining",
			round: round,
		});

		var definingPromises = playerIds.map(async (playerId) => {
			var playerAssignments = assignments.filter(
				(a) => a.definers.indexOf(playerId) !== -1,
			);
			var responses = [];
			for (var idx = 0; idx < playerAssignments.length; idx++) {
				var a = playerAssignments[idx];
				var resp = await room.requestInputFromSubset(
					"define-" + a.word.id,
					{
						type: "text",
						prompt:
							"Define the word: " + a.word.word + " (" + a.word.phonetic + ")",
						timeLimit: DEFINING_TIME_LIMIT,
					},
					[playerId],
				);
				responses.push({
					wordId: a.word.id,
					definition: resp.get(playerId)?.value || "A very mysterious thing.",
				});
			}
			return { playerId: playerId, responses: responses };
		});

		var definingResults = await Promise.all(definingPromises);
		definitions = {};
		definingResults.forEach((res) => {
			res.responses.forEach((r) => {
				if (!definitions[r.wordId]) definitions[r.wordId] = [];
				definitions[r.wordId].push({
					playerId: res.playerId,
					text: r.definition,
				});
			});
		});

		await room.updateSharedData({
			phase: "sentencing",
		});

		var sentencingAssignments = [];
		for (i = 0; i < assignments.length; i++) {
			var a = assignments[i];
			var defs = definitions[a.word.id];
			sentencingAssignments.push({
				word: a.word,
				definition: defs[0],
				sentencerId: playerIds[(i + 2) % playerIds.length],
			});
			sentencingAssignments.push({
				word: a.word,
				definition: defs[1],
				sentencerId: playerIds[(i + 3) % playerIds.length],
			});
		}

		var sentencingPromises = playerIds.map(async (playerId) => {
			var playerSents = sentencingAssignments.filter(
				(s) => s.sentencerId === playerId,
			);
			var responses = [];
			for (var idx = 0; idx < playerSents.length; idx++) {
				var s = playerSents[idx];
				var resp = await room.requestInputFromSubset(
					"sentence-" + s.word.id + "-" + s.definition.playerId,
					{
						type: "text",
						prompt:
							"Use this definition in a sentence: " +
							s.word.word +
							" - " +
							s.definition.text,
						timeLimit: SENTENCING_TIME_LIMIT,
					},
					[playerId],
				);
				responses.push({
					wordId: s.word.id,
					definerId: s.definition.playerId,
					sentence:
						resp.get(playerId)?.value ||
						"The " + s.word.word + " was quite remarkable.",
				});
			}
			return { playerId: playerId, responses: responses };
		});

		var sentencingResults = await Promise.all(sentencingPromises);
		sentences = {};
		sentencingResults.forEach((res) => {
			res.responses.forEach((r) => {
				if (!sentences[r.wordId]) sentences[r.wordId] = {};
				sentences[r.wordId][r.definerId] = {
					sentencerId: res.playerId,
					text: r.sentence,
				};
			});
		});

		for (i = 0; i < assignments.length; i++) {
			var a = assignments[i];
			var defs = definitions[a.word.id];
			var combo1 = {
				definerId: defs[0].playerId,
				definerName: playerNames[defs[0].playerId],
				definition: defs[0].text,
				sentencerId: sentences[a.word.id][defs[0].playerId].sentencerId,
				sentencerName:
					playerNames[sentences[a.word.id][defs[0].playerId].sentencerId],
				sentence: sentences[a.word.id][defs[0].playerId].text,
			};
			var combo2 = {
				definerId: defs[1].playerId,
				definerName: playerNames[defs[1].playerId],
				definition: defs[1].text,
				sentencerId: sentences[a.word.id][defs[1].playerId].sentencerId,
				sentencerName:
					playerNames[sentences[a.word.id][defs[1].playerId].sentencerId],
				sentence: sentences[a.word.id][defs[1].playerId].text,
			};

			var voters = playerIds.filter(
				(id) =>
					id !== combo1.definerId &&
					id !== combo1.sentencerId &&
					id !== combo2.definerId &&
					id !== combo2.sentencerId,
			);
			if (voters.length === 0) {
				voters = playerIds.filter(
					(id) => id !== combo1.definerId && id !== combo2.definerId,
				);
			}

			await room.updateSharedData({
				phase: "voting",
				word: a.word,
				combo1: combo1,
				combo2: combo2,
			});

			var voteResponse = await room.requestInputFromSubset(
				"vote-" + a.word.id,
				{
					type: "choice",
					prompt: "Which Lexicon entry is superior?",
					choices: ["Option 1", "Option 2"],
					timeLimit: VOTING_TIME_LIMIT,
				},
				voters,
			);

			var votes1 = 0;
			var votes2 = 0;
			voteResponse.forEach((v) => {
				if (v.value === 0) votes1++;
				else if (v.value === 1) votes2++;
			});

			if (votes1 > votes2) {
				scores[combo1.definerId] += POINTS_DEFINITION_VOTE;
				scores[combo1.sentencerId] += POINTS_SENTENCE_VOTE;
			} else if (votes2 > votes1) {
				scores[combo2.definerId] += POINTS_DEFINITION_VOTE;
				scores[combo2.sentencerId] += POINTS_SENTENCE_VOTE;
			} else {
				scores[combo1.definerId] += POINTS_DEFINITION_VOTE / 2;
				scores[combo1.sentencerId] += POINTS_SENTENCE_VOTE / 2;
				scores[combo2.definerId] += POINTS_DEFINITION_VOTE / 2;
				scores[combo2.sentencerId] += POINTS_SENTENCE_VOTE / 2;
			}

			await room.updateSharedData({
				phase: "reveal",
				word: a.word,
				combo1: combo1,
				combo2: combo2,
				votes1: votes1,
				votes2: votes2,
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
