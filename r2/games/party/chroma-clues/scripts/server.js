var party = require("slopcade/party");

var CLUE_TIME_LIMIT = 30;
var GUESS_TIME_LIMIT = 45;
var REVEAL_DURATION_MS = 6000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;
var GRID_SIZE = 20;
var POINTS_EXACT = 3;
var POINTS_ADJACENT = 2;
var POINTS_FRAME = 1;
var POINTS_CUE_GIVER_PER_MARKER = 1;

function chebyshevDistance(pos1, pos2) {
	var dx = Math.abs(pos1.col - pos2.col);
	var dy = Math.abs(pos1.row - pos2.row);
	return Math.max(dx, dy);
}

function calculateGuesserPoints(guess, target) {
	var distance = chebyshevDistance(guess, target);
	if (distance === 0) return POINTS_EXACT;
	if (distance <= 1) return POINTS_ADJACENT;
	if (distance === 2) return POINTS_FRAME;
	return 0;
}

function countMarkersInFrame(markers, target) {
	var count = 0;
	var i, distance;
	for (i = 0; i < markers.length; i++) {
		distance = chebyshevDistance(markers[i].position, target);
		if (distance <= 2) count++;
	}
	return count;
}

function indexToPosition(index) {
	return {
		row: Math.floor(index / GRID_SIZE),
		col: index % GRID_SIZE,
	};
}

function generateGridChoices() {
	var choices = [];
	var i;
	for (i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
		choices.push(i.toString());
	}
	return choices;
}

function generateRandomTarget() {
	return {
		row: Math.floor(Math.random() * GRID_SIZE),
		col: Math.floor(Math.random() * GRID_SIZE),
	};
}

function formatPosition(pos) {
	var colLetter = String.fromCharCode(65 + pos.col);
	var rowNum = GRID_SIZE - pos.row;
	return colLetter + rowNum;
}

exports.run = async (room, config) => {
	var i, round;
	var readyResponses, playerIds, playerNames, scores, roundCount;
	var cueGiverId, guessers, targetPosition, clueResponse, clueText;
	var guessResponses, markers, results, scoreboard, winner;
	var markersInFrame, cueGiverBonus, index, points, distance;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to Chroma Clues! Get ready to guess colors!",
		timeLimit: 5,
	});

	playerIds = [];
	playerNames = {};
	scores = {};

	readyResponses.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] = response.playerName || playerId.slice(0, 6);
		scores[playerId] = 0;
	});

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players to play Chroma Clues.",
		});
		await room.setPhase("ended");
		return;
	}

	roundCount = (config && config.roundCount) || DEFAULT_ROUND_COUNT;

	for (round = 1; round <= roundCount; round++) {
		cueGiverId = playerIds[(round - 1) % playerIds.length];
		guessers = playerIds.filter((id) => id !== cueGiverId);

		targetPosition = generateRandomTarget();

		await room.sendToPlayer(cueGiverId, {
			type: "target_position",
			row: targetPosition.row,
			col: targetPosition.col,
			positionLabel: formatPosition(targetPosition),
		});

		await room.updateSharedData({
			phase: "clue_giving",
			round: round,
			roundCount: roundCount,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			gridSize: GRID_SIZE,
		});

		clueResponse = await room.requestInputFromSubset(
			"clue",
			{
				type: "text",
				prompt:
					"Give a one-word clue for position " +
					formatPosition(targetPosition) +
					" on the color grid!",
				timeLimit: CLUE_TIME_LIMIT,
			},
			[cueGiverId],
		);

		clueText = clueResponse.get(cueGiverId)?.value || "color";

		await room.updateSharedData({
			phase: "first_guess",
			round: round,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			clue: clueText,
			gridSize: GRID_SIZE,
			markerNumber: 1,
			markers: [],
		});

		guessResponses = await room.requestInputFromSubset(
			"first_guess",
			{
				type: "choice",
				prompt: "Place your first marker! Clue: " + clueText,
				choices: generateGridChoices(),
				timeLimit: GUESS_TIME_LIMIT,
			},
			guessers,
		);

		markers = [];
		guessResponses.forEach((response, guesserId) => {
			index = parseInt(response.value, 10);
			if (!isNaN(index) && index >= 0 && index < GRID_SIZE * GRID_SIZE) {
				markers.push({
					playerId: guesserId,
					playerName: playerNames[guesserId],
					markerNumber: 1,
					position: indexToPosition(index),
				});
			}
		});

		await room.updateSharedData({
			phase: "second_guess",
			round: round,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			clue: clueText,
			gridSize: GRID_SIZE,
			markerNumber: 2,
			markers: markers,
		});

		guessResponses = await room.requestInputFromSubset(
			"second_guess",
			{
				type: "choice",
				prompt: "Place your second marker! Clue: " + clueText,
				choices: generateGridChoices(),
				timeLimit: GUESS_TIME_LIMIT,
			},
			guessers,
		);

		guessResponses.forEach((response, guesserId) => {
			index = parseInt(response.value, 10);
			if (!isNaN(index) && index >= 0 && index < GRID_SIZE * GRID_SIZE) {
				markers.push({
					playerId: guesserId,
					playerName: playerNames[guesserId],
					markerNumber: 2,
					position: indexToPosition(index),
				});
			}
		});

		results = {
			targetPosition: targetPosition,
			targetLabel: formatPosition(targetPosition),
			clue: clueText,
			cueGiverId: cueGiverId,
			cueGiverName: playerNames[cueGiverId],
			markers: markers,
			markerResults: [],
			pointsEarned: {},
		};

		playerIds.forEach((id) => {
			results.pointsEarned[id] = 0;
		});

		markers.forEach((marker) => {
			points = calculateGuesserPoints(marker.position, targetPosition);
			distance = chebyshevDistance(marker.position, targetPosition);

			results.markerResults.push({
				playerId: marker.playerId,
				playerName: marker.playerName,
				markerNumber: marker.markerNumber,
				position: marker.position,
				positionLabel: formatPosition(marker.position),
				distance: distance,
				points: points,
			});

			scores[marker.playerId] += points;
			results.pointsEarned[marker.playerId] += points;
		});

		markersInFrame = countMarkersInFrame(markers, targetPosition);
		cueGiverBonus = markersInFrame * POINTS_CUE_GIVER_PER_MARKER;
		scores[cueGiverId] += cueGiverBonus;
		results.pointsEarned[cueGiverId] += cueGiverBonus;
		results.cueGiverBonus = cueGiverBonus;
		results.markersInFrame = markersInFrame;

		await room.updateSharedData({
			phase: "reveal",
			round: round,
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
			round: round,
		});
		await room.delay(SCORES_DURATION_MS);
	}

	scoreboard = playerIds
		.map((id) => ({
			id: id,
			name: playerNames[id],
			score: scores[id],
		}))
		.sort((a, b) => b.score - a.score);

	winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
