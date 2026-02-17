var party = require("slopcade/party");
var content = require("slopcade/content");

var CAPTION_TIME_LIMIT = 45;
var CONTEXT_TIME_LIMIT = 30;
var GUESS_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 3;

var POINTS_FOOL_OTHERS = 500;
var POINTS_FIND_TRUTH = 250;
var POINTS_FUNNIEST_CAPTION = 100;

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
	var i, j, p, r, k;
	var readyResponses, playerIds, playerNames;
	var scores, captionVotes;
	var roundCount, pool, shuffledPool, usedIds;
	var round, roundPrompts, playerPrompts;
	var captionResponses, playerCaptions;
	var subjectId, others, artifact, realContext, playerCaption;
	var contextResponses, fakeContexts, allContexts, shuffledContexts;
	var guessResponses, results, scoreboard, winner;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to the Cyber-Archaeology Site. Initialize Scanners?",
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

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players for Cyber-Archaeology",
		});
		await room.setPhase("ended");
		return;
	}

	scores = {};
	captionVotes = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
		captionVotes[playerIds[i]] = 0;
	}

	roundCount = (config && config.roundCount) || DEFAULT_ROUND_COUNT;
	pool = (config && config.contentPack) || [];

	if (pool.length === 0) {
		pool = [
			{
				id: "a1",
				imageUrl: "https://placehold.co/600x400?text=Toaster",
				context: "A toaster used for browning bread.",
			},
			{
				id: "a2",
				imageUrl: "https://placehold.co/600x400?text=Floppy+Disk",
				context: "A 3.5-inch floppy disk used for data storage.",
			},
			{
				id: "a3",
				imageUrl: "https://placehold.co/600x400?text=Rotary+Phone",
				context: "A telephone with a rotating dial for numbers.",
			},
			{
				id: "a4",
				imageUrl: "https://placehold.co/600x400?text=Cassette+Tape",
				context: "An analog magnetic tape recording format for audio.",
			},
			{
				id: "a5",
				imageUrl: "https://placehold.co/600x400?text=Typewriter",
				context: "A mechanical machine for writing characters on paper.",
			},
			{
				id: "a6",
				imageUrl: "https://placehold.co/600x400?text=Game+Boy",
				context: "A handheld game console released by Nintendo in 1989.",
			},
			{
				id: "a7",
				imageUrl: "https://placehold.co/600x400?text=Fax+Machine",
				context: "A device used to send documents over telephone lines.",
			},
			{
				id: "a8",
				imageUrl: "https://placehold.co/600x400?text=Tamagotchi",
				context: "A handheld digital pet created in Japan.",
			},
			{
				id: "a9",
				imageUrl: "https://placehold.co/600x400?text=Walkman",
				context: "A portable audio cassette player.",
			},
			{
				id: "a10",
				imageUrl: "https://placehold.co/600x400?text=Pager",
				context:
					"A wireless telecommunications device that receives alphanumeric messages.",
			},
		];
	}
	shuffledPool = shuffle([...pool]);
	usedIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		roundPrompts = [];
		for (i = 0; i < playerIds.length; i++) {
			p = shuffledPool.find((item) => !usedIds.has(item.id));
			if (!p) {
				usedIds.clear();
				p = shuffledPool[0];
			}
			usedIds.add(p.id);
			roundPrompts.push(p);
		}

		playerPrompts = {};
		for (i = 0; i < playerIds.length; i++) {
			playerPrompts[playerIds[i]] = roundPrompts[i];
		}

		await room.updateSharedData({
			phase: "captioning",
			round: round,
			playerPrompts: playerPrompts,
		});

		captionResponses = await room.requestInput("caption", {
			type: "text",
			prompt: "Analyze the artifact. Provide a caption for the future.",
			timeLimit: CAPTION_TIME_LIMIT,
		});

		playerCaptions = {};
		playerIds.forEach((id) => {
			playerCaptions[id] =
				captionResponses.get(id)?.value || "A mysterious relic of the past.";
		});

		var artifactOrder = shuffle([...playerIds]);

		for (k = 0; k < artifactOrder.length; k++) {
			subjectId = artifactOrder[k];
			others = playerIds.filter((id) => id !== subjectId);
			artifact = playerPrompts[subjectId];
			realContext = artifact.context;
			playerCaption = playerCaptions[subjectId];

			await room.updateSharedData({
				phase: "contextualizing",
				subjectId: subjectId,
				subjectName: playerNames[subjectId],
				imageUrl: artifact.imageUrl,
				caption: playerCaption,
			});

			contextResponses = await room.requestInputFromSubset(
				"fake-context",
				{
					type: "text",
					prompt: "What is this artifact? Write a fake context to fool others.",
					timeLimit: CONTEXT_TIME_LIMIT,
				},
				others,
			);

			fakeContexts = [];
			contextResponses.forEach((resp, pid) => {
				fakeContexts.push({
					text: resp.value || "An ancient ritual object.",
					authorId: pid,
				});
			});

			allContexts = [{ text: realContext, isTruth: true, authorId: "system" }];
			fakeContexts.forEach((fc) => allContexts.push(fc));
			shuffledContexts = shuffle([...allContexts]);

			await room.updateSharedData({
				phase: "guessing",
				choices: shuffledContexts.map((c) => c.text),
			});

			guessResponses = await room.requestInputFromSubset(
				"guess",
				{
					type: "choice",
					prompt: "Which context is the historical truth?",
					choices: shuffledContexts.map((c) => c.text),
					timeLimit: GUESS_TIME_LIMIT,
				},
				others,
			);

			results = {
				subjectId: subjectId,
				caption: playerCaption,
				realContext: realContext,
				guesses: [],
				pointsEarned: {},
				funniestVoteId: null,
			};
			playerIds.forEach((id) => (results.pointsEarned[id] = 0));

			guessResponses.forEach((resp, guesserId) => {
				var choiceIndex = resp.value;
				var chosen = shuffledContexts[choiceIndex];

				results.guesses.push({
					guesserId: guesserId,
					choiceIndex: choiceIndex,
					isCorrect: chosen.isTruth,
				});

				if (chosen.isTruth) {
					scores[guesserId] += POINTS_FIND_TRUTH;
					results.pointsEarned[guesserId] += POINTS_FIND_TRUTH;
				} else {
					var blufferId = chosen.authorId;
					if (blufferId !== "system") {
						scores[blufferId] += POINTS_FOOL_OTHERS;
						results.pointsEarned[blufferId] += POINTS_FOOL_OTHERS;
					}
				}
			});

			var correctCount = results.guesses.filter((g) => g.isCorrect).length;
			if (correctCount < others.length / 2) {
				scores[subjectId] += POINTS_FUNNIEST_CAPTION;
				results.pointsEarned[subjectId] += POINTS_FUNNIEST_CAPTION;
				results.funniestCaptionBonus = true;
			}

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
