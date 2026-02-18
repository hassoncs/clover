var party = require("slopcade/party");
var content = require("slopcade/content");

var DRAW_TIME_LIMIT = 45;
var SLOGAN_TIME_LIMIT = 30;
var VOTE_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var ASSEMBLY_DURATION_MS = 8000;
var MATCH_RESULT_DURATION_MS = 4000;
var WINNER_DURATION_MS = 10000;
var POINTS_MATCH_WIN = 1000;
var POINTS_TOURNAMENT_WIN = 5000;
var POINTS_STREAK_BONUS = 500;

// Fallback drawing prompts if no content pack provided
var FALLBACK_DRAWING_PROMPTS = [
	{ id: "star", text: "A star" },
	{ id: "cat", text: "A cat face" },
	{ id: "lightning", text: "A lightning bolt" },
	{ id: "heart", text: "A heart" },
	{ id: "sun", text: "A sun" },
	{ id: "moon", text: "A crescent moon" },
	{ id: "tree", text: "A simple tree" },
	{ id: "cloud", text: "A fluffy cloud" },
	{ id: "mountain", text: "A mountain" },
	{ id: "wave", text: "An ocean wave" },
];

// Fallback slogan prompts
var FALLBACK_SLOGAN_PROMPTS = [
	{ id: "slogan1", text: "Write a catchy slogan for a t-shirt" },
	{ id: "slogan2", text: "Write a funny one-liner" },
	{ id: "slogan3", text: "Write something inspirational" },
	{ id: "slogan4", text: "Write a mysterious phrase" },
];

function shuffle(array) {
	var result = [];
	var i;
	for (i = 0; i < array.length; i++) {
		result.push(array[i]);
	}
	for (i = result.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = result[i];
		result[i] = result[j];
		result[j] = temp;
	}
	return result;
}

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function generateBrandName() {
	var adjectives = [
		"Cosmic",
		"Retro",
		"Urban",
		"Neon",
		"Pixel",
		"Chaos",
		"Dream",
		"Electric",
		"Wild",
		"Mystic",
	];
	var nouns = [
		"Threads",
		"Ink",
		"Studio",
		"Collective",
		"Lab",
		"Works",
		"Co",
		"Factory",
		"House",
		"Design",
	];
	var adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	var noun = nouns[Math.floor(Math.random() * nouns.length)];
	return adj + " " + noun;
}

function createBracket(brandCount) {
	var bracket = [];
	var i;

	if (brandCount < 2) {
		return bracket;
	}

	// For simplicity, create a linear tournament (each brand faces one other at a time)
	// Winners advance until we have a champion
	var currentRound = [];
	for (i = 0; i < brandCount; i++) {
		currentRound.push(i);
	}

	while (currentRound.length > 1) {
		var nextRound = [];
		var matchups = [];

		for (i = 0; i < currentRound.length; i += 2) {
			if (i + 1 < currentRound.length) {
				matchups.push({
					brandA: currentRound[i],
					brandB: currentRound[i + 1],
					winner: null,
				});
				nextRound.push(null); // Placeholder for winner
			} else {
				// Odd brand gets a bye
				nextRound.push(currentRound[i]);
			}
		}

		bracket.push({
			matchups: matchups,
			winners: nextRound,
		});

		currentRound = nextRound;
	}

	return bracket;
}

exports.run = async (room, config) => {
	var i, j, p, r;
	var readyResponses, playerIds, playerNames;
	var scores, streaks;
	var drawingPrompts, sloganPrompts;
	var drawings, slogans;
	var brands, bracket;
	var currentRoundIndex, currentMatchupIndex;
	var round, matchup;
	var brandA, brandB;
	var voteResponses, votes, winner;
	var matchWinner, ownerStreak;
	var finalScoreboard, champion;
	var usedDrawingPrompts, usedSloganPrompts;
	var promptIndex, prompt;

	await room.setPhase("playing");

	// Ready check
	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Shirt Clash!",
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

	// Initialize scores and streaks
	scores = {};
	streaks = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
		streaks[playerIds[i]] = 0;
	}

	// Get prompts (use fallback if no content pack)
	drawingPrompts =
		config && config.drawingPrompts
			? config.drawingPrompts
			: FALLBACK_DRAWING_PROMPTS;
	sloganPrompts =
		config && config.sloganPrompts
			? config.sloganPrompts
			: FALLBACK_SLOGAN_PROMPTS;

	// Shuffle prompts
	drawingPrompts = shuffle(drawingPrompts);
	sloganPrompts = shuffle(sloganPrompts);

	usedDrawingPrompts = 0;
	usedSloganPrompts = 0;

	// ========================================
	// PHASE: Creation
	// ========================================
	await room.updateSharedData({
		phase: "creation",
		instructions: "Draw 2 icons and write 2 slogans!",
	});

	drawings = {};
	slogans = {};

	// Each player draws 2 images and writes 2 slogans
	for (i = 0; i < playerIds.length; i++) {
		var playerId = playerIds[i];
		drawings[playerId] = [];
		slogans[playerId] = [];
	}

	// First drawing round
	for (i = 0; i < playerIds.length; i++) {
		var pId = playerIds[i];
		promptIndex = usedDrawingPrompts % drawingPrompts.length;
		prompt = drawingPrompts[promptIndex];
		usedDrawingPrompts++;

		var drawResponse1 = await room.requestInputFromSubset(
			"drawing1-" + pId,
			{
				type: "drawing",
				prompt: "Draw: " + prompt.text,
				timeLimit: DRAW_TIME_LIMIT,
			},
			[pId],
		);

		var drawing1 = drawResponse1.get(pId);
		if (drawing1 && drawing1.value) {
			drawings[pId].push({
				imageData: drawing1.value,
				prompt: prompt.text,
				id: pId + "-drawing-1",
			});
		} else {
			// Fallback empty drawing
			drawings[pId].push({
				imageData: null,
				prompt: prompt.text,
				id: pId + "-drawing-1",
			});
		}
	}

	// Second drawing round
	for (i = 0; i < playerIds.length; i++) {
		pId = playerIds[i];
		promptIndex = usedDrawingPrompts % drawingPrompts.length;
		prompt = drawingPrompts[promptIndex];
		usedDrawingPrompts++;

		var drawResponse2 = await room.requestInputFromSubset(
			"drawing2-" + pId,
			{
				type: "drawing",
				prompt: "Draw: " + prompt.text,
				timeLimit: DRAW_TIME_LIMIT,
			},
			[pId],
		);

		var drawing2 = drawResponse2.get(pId);
		if (drawing2 && drawing2.value) {
			drawings[pId].push({
				imageData: drawing2.value,
				prompt: prompt.text,
				id: pId + "-drawing-2",
			});
		} else {
			drawings[pId].push({
				imageData: null,
				prompt: prompt.text,
				id: pId + "-drawing-2",
			});
		}
	}

	// First slogan round
	for (i = 0; i < playerIds.length; i++) {
		pId = playerIds[i];
		promptIndex = usedSloganPrompts % sloganPrompts.length;
		prompt = sloganPrompts[promptIndex];
		usedSloganPrompts++;

		var sloganResponse1 = await room.requestInputFromSubset(
			"slogan1-" + pId,
			{
				type: "text",
				prompt: prompt.text,
				timeLimit: SLOGAN_TIME_LIMIT,
			},
			[pId],
		);

		var slogan1 = sloganResponse1.get(pId);
		if (slogan1 && slogan1.value) {
			slogans[pId].push({
				text: String(slogan1.value),
				id: pId + "-slogan-1",
			});
		} else {
			slogans[pId].push({
				text: "Insert slogan here",
				id: pId + "-slogan-1",
			});
		}
	}

	// Second slogan round
	for (i = 0; i < playerIds.length; i++) {
		pId = playerIds[i];
		promptIndex = usedSloganPrompts % sloganPrompts.length;
		prompt = sloganPrompts[promptIndex];
		usedSloganPrompts++;

		var sloganResponse2 = await room.requestInputFromSubset(
			"slogan2-" + pId,
			{
				type: "text",
				prompt: prompt.text,
				timeLimit: SLOGAN_TIME_LIMIT,
			},
			[pId],
		);

		var slogan2 = sloganResponse2.get(pId);
		if (slogan2 && slogan2.value) {
			slogans[pId].push({
				text: String(slogan2.value),
				id: pId + "-slogan-2",
			});
		} else {
			slogans[pId].push({
				text: "Be the change",
				id: pId + "-slogan-2",
			});
		}
	}

	// ========================================
	// PHASE: Assembly
	// ========================================
	await room.updateSharedData({
		phase: "assembly",
		instructions: "The Algorithm is creating brands...",
	});

	// Collect all drawings and slogans
	var allDrawings = [];
	var allSlogans = [];

	for (i = 0; i < playerIds.length; i++) {
		pId = playerIds[i];
		for (j = 0; j < drawings[pId].length; j++) {
			allDrawings.push({
				imageData: drawings[pId][j].imageData,
				prompt: drawings[pId][j].prompt,
				id: drawings[pId][j].id,
				ownerId: pId,
			});
		}
		for (j = 0; j < slogans[pId].length; j++) {
			allSlogans.push({
				text: slogans[pId][j].text,
				id: slogans[pId][j].id,
				ownerId: pId,
			});
		}
	}

	// Shuffle to randomize pairings
	allDrawings = shuffle(allDrawings);
	allSlogans = shuffle(allSlogans);

	// Create brands by pairing drawings with slogans from different players
	brands = [];
	var brandCount = Math.min(allDrawings.length, allSlogans.length);

	for (i = 0; i < brandCount; i++) {
		var drawing = allDrawings[i];
		var slogan = allSlogans[i];

		// Try to find a slogan from a different player
		for (j = 0; j < allSlogans.length; j++) {
			var idx = (i + j) % allSlogans.length;
			if (allSlogans[idx].ownerId !== drawing.ownerId) {
				slogan = allSlogans[idx];
				break;
			}
		}

		brands.push({
			id: "brand-" + i,
			name: generateBrandName(),
			image: drawing,
			slogan: slogan,
			imageOwnerId: drawing.ownerId,
			sloganOwnerId: slogan.ownerId,
			wins: 0,
		});
	}

	// Reveal brands
	await room.updateSharedData({
		phase: "assembly",
		brands: brands.map((b) => ({
			id: b.id,
			name: b.name,
			image: b.image.imageData,
			slogan: b.slogan.text,
			imageOwner: playerNames[b.imageOwnerId],
			sloganOwner: playerNames[b.sloganOwnerId],
		})),
	});

	await room.delay(ASSEMBLY_DURATION_MS);

	// ========================================
	// PHASE: Tournament
	// ========================================
	bracket = createBracket(brands.length);
	currentRoundIndex = 0;
	currentMatchupIndex = 0;

	// Process each round
	for (
		currentRoundIndex = 0;
		currentRoundIndex < bracket.length;
		currentRoundIndex++
	) {
		round = bracket[currentRoundIndex];

		for (
			currentMatchupIndex = 0;
			currentMatchupIndex < round.matchups.length;
			currentMatchupIndex++
		) {
			matchup = round.matchups[currentMatchupIndex];

			brandA = brands[matchup.brandA];
			brandB = brands[matchup.brandB];

			// Show matchup
			await room.updateSharedData({
				phase: "tournament_round",
				round: currentRoundIndex + 1,
				matchup: currentMatchupIndex + 1,
				totalMatchups: round.matchups.length,
				brandA: {
					id: brandA.id,
					name: brandA.name,
					image: brandA.image.imageData,
					slogan: brandA.slogan.text,
					imageOwner: playerNames[brandA.imageOwnerId],
					sloganOwner: playerNames[brandA.sloganOwnerId],
				},
				brandB: {
					id: brandB.id,
					name: brandB.name,
					image: brandB.image.imageData,
					slogan: brandB.slogan.text,
					imageOwner: playerNames[brandB.imageOwnerId],
					sloganOwner: playerNames[brandB.sloganOwnerId],
				},
			});

			// Vote
			voteResponses = await room.requestInput(
				"vote-" + currentRoundIndex + "-" + currentMatchupIndex,
				{
					type: "choice",
					prompt: "Which shirt would you wear?",
					choices: [brandA.name, brandB.name],
					timeLimit: VOTE_TIME_LIMIT,
				},
			);

			// Tally votes
			votes = { brandA: 0, brandB: 0 };
			voteResponses.forEach((response, voterId) => {
				if (response.value === 0) {
					votes.brandA++;
				} else {
					votes.brandB++;
				}
			});

			// Determine winner
			if (votes.brandA > votes.brandB) {
				matchWinner = brandA;
				matchup.winner = matchup.brandA;
			} else if (votes.brandB > votes.brandA) {
				matchWinner = brandB;
				matchup.winner = matchup.brandB;
			} else {
				// Tie - random winner
				matchWinner = Math.random() < 0.5 ? brandA : brandB;
				matchup.winner =
					matchWinner === brandA ? matchup.brandA : matchup.brandB;
			}

			// Award points
			scores[matchWinner.imageOwnerId] += POINTS_MATCH_WIN;
			scores[matchWinner.sloganOwnerId] += POINTS_MATCH_WIN;
			matchWinner.wins++;

			// Streak bonus
			ownerStreak = streaks[matchWinner.imageOwnerId] + 1;
			streaks[matchWinner.imageOwnerId] = ownerStreak;
			if (ownerStreak > 1) {
				scores[matchWinner.imageOwnerId] += POINTS_STREAK_BONUS;
			}

			ownerStreak = streaks[matchWinner.sloganOwnerId] + 1;
			streaks[matchWinner.sloganOwnerId] = ownerStreak;
			if (ownerStreak > 1) {
				scores[matchWinner.sloganOwnerId] += POINTS_STREAK_BONUS;
			}

			// Reset streaks for losers
			var loser = matchWinner === brandA ? brandB : brandA;
			streaks[loser.imageOwnerId] = 0;
			streaks[loser.sloganOwnerId] = 0;

			// Show result
			await room.updateSharedData({
				phase: "tournament_round",
				result: {
					winner: matchWinner.name,
					votes: votes,
				},
				scores: scores,
			});

			await room.delay(MATCH_RESULT_DURATION_MS);

			if (currentRoundIndex + 1 < bracket.length) {
				var nextBracketRound = bracket[currentRoundIndex + 1];
				var winnerSlot = currentMatchupIndex;
				var nextMatchupIdx = Math.floor(winnerSlot / 2);
				if (nextMatchupIdx < nextBracketRound.matchups.length) {
					if (winnerSlot % 2 === 0) {
						nextBracketRound.matchups[nextMatchupIdx].brandA = matchup.winner;
					} else {
						nextBracketRound.matchups[nextMatchupIdx].brandB = matchup.winner;
					}
				}
				nextBracketRound.winners[winnerSlot] = matchup.winner;
			}
		}
	}

	// ========================================
	// PHASE: Championship
	// ========================================
	// Find the champion (brand with most wins)
	champion = brands[0];
	for (i = 1; i < brands.length; i++) {
		if (brands[i].wins > champion.wins) {
			champion = brands[i];
		}
	}

	// Award tournament winner bonus
	scores[champion.imageOwnerId] += POINTS_TOURNAMENT_WIN;
	scores[champion.sloganOwnerId] += POINTS_TOURNAMENT_WIN;

	await room.updateSharedData({
		phase: "championship",
		champion: {
			name: champion.name,
			image: champion.image.imageData,
			slogan: champion.slogan.text,
			imageOwner: playerNames[champion.imageOwnerId],
			sloganOwner: playerNames[champion.sloganOwnerId],
		},
	});

	await room.delay(REVEAL_DURATION_MS);

	// ========================================
	// PHASE: Winner
	// ========================================
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
		championBrand: {
			name: champion.name,
			image: champion.image.imageData,
			slogan: champion.slogan.text,
		},
	});

	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
