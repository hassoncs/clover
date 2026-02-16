var party = require("slopcade/party");
var content = require("slopcade/content");

var WORDBANK_TIME = 30;
var SETUP_TIME = 45;
var FORCED_WORD_TIME = 30;
var PUNCHLINE_TIME = 45;
var SHOW_DURATION = 8000;
var VOTE_TIME = 20;
var WINNER_DURATION = 10000;

var POINTS_SETUP = 200;
var POINTS_BRIDGE = 300;
var POINTS_PUNCHLINE = 500;
var POINTS_TOKEN_USAGE = 100;
var POINTS_PERFORMANCE = 200;

var FALLBACK_TEMPLATES = [
	{
		id: "t1",
		template: "Why did the [BLANK] cross the road?",
		blankPosition: 0,
	},
	{ id: "t2", template: "A [BLANK] walks into a bar...", blankPosition: 0 },
	{
		id: "t3",
		template: "What do you call a [BLANK] that [BLANK]?",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{
		id: "t4",
		template: "I told my [BLANK] that [BLANK]...",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{
		id: "t5",
		template: "Knock knock. Who's there? [BLANK].",
		blankPosition: 0,
	},
	{
		id: "t6",
		template: "What's the difference between [BLANK] and [BLANK]?",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{
		id: "t7",
		template: "Why don't [BLANK] ever [BLANK]?",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{
		id: "t8",
		template: "How many [BLANK] does it take to change a lightbulb?",
		blankPosition: 0,
	},
	{
		id: "t9",
		template: "My [BLANK] is so [BLANK] that...",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{ id: "t10", template: "You might be a [BLANK] if...", blankPosition: 0 },
	{
		id: "t11",
		template: "What did the [BLANK] say to the [BLANK]?",
		blankPosition: 0,
		hasSecondBlank: true,
	},
	{
		id: "t12",
		template: "A priest, a rabbi, and a [BLANK] walk into...",
		blankPosition: 0,
	},
];

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

function pickRandom(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function fillTemplate(template, blank) {
	return template.replace("[BLANK]", blank);
}

exports.run = async (room, config) => {
	var i, j, k, p, r;
	var playerIds, playerNames, scores;
	var roundCount, round;
	var templates, usedTemplateIds;
	var tokenBank, allWords;
	var currentTemplate, setupPlayer, bridgePlayer, punchlinePlayer;
	var setupResponse, forcedWord, bridgeResponse;
	var punchlineResponse, performedLive, audioBlobId;
	var joke, jokes;
	var voteResponses, voteCounts, maxVotes, winningJokeIndex;
	var scoreboard, winner;
	var initialPlayers;
	var contentPack;

	await room.setPhase("playing");

	playerIds = [];
	playerNames = {};
	scores = {};
	tokenBank = [];
	jokes = [];

	initialPlayers = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt:
			"Welcome to Guffaw Galleon! Board the Comedy Ferry and prepare to craft the perfect joke together!",
		timeLimit: 10,
	});

	initialPlayers.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] = response.playerName || playerId.slice(0, 6);
		scores[playerId] = 0;
	});

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players to play Guffaw Galleon.",
		});
		await room.setPhase("ended");
		return;
	}

	roundCount = (config && config.roundCount) || 3;
	contentPack = (config && config.contentPack) || [];
	templates = contentPack.length > 0 ? contentPack : FALLBACK_TEMPLATES;
	usedTemplateIds = new Set();

	await room.updateSharedData({
		phase: "wordbank",
		instructions:
			"Submit 3 funny words to the Token Bank! These will be used as forced words later.",
	});

	var wordBankResponses = await room.requestInput("wordbank", {
		type: "text",
		prompt: "Enter 3 funny words (separate with commas):",
		timeLimit: WORDBANK_TIME,
		multiline: false,
	});

	wordBankResponses.forEach((response, playerId) => {
		var words = (response.value || "")
			.split(",")
			.map((w) => w.trim().toLowerCase())
			.filter((w) => w.length > 0 && w.length < 20);
		for (i = 0; i < words.length && i < 3; i++) {
			tokenBank.push({
				word: words[i],
				submittedBy: playerId,
			});
		}
	});

	if (tokenBank.length < 3) {
		tokenBank = tokenBank.concat([
			{ word: "banana", submittedBy: "system" },
			{ word: "spork", submittedBy: "system" },
			{ word: "giggle", submittedBy: "system" },
			{ word: "noodle", submittedBy: "system" },
			{ word: "wobble", submittedBy: "system" },
		]);
	}

	tokenBank = shuffle(tokenBank);

	for (round = 1; round <= roundCount; round++) {
		var playerOrder = shuffle([...playerIds]);
		setupPlayer = playerOrder[0];
		bridgePlayer = playerOrder[1 % playerIds.length];
		punchlinePlayer = playerOrder[2 % playerIds.length];

		if (playerIds.length >= 3) {
			while (bridgePlayer === setupPlayer) {
				bridgePlayer =
					playerOrder[Math.floor(Math.random() * playerIds.length)];
			}
			while (
				punchlinePlayer === setupPlayer ||
				punchlinePlayer === bridgePlayer
			) {
				punchlinePlayer =
					playerOrder[Math.floor(Math.random() * playerIds.length)];
			}
		}

		var availableTemplates = templates.filter(
			(t) => !usedTemplateIds.has(t.id),
		);
		if (availableTemplates.length === 0) {
			usedTemplateIds.clear();
			availableTemplates = templates;
		}
		currentTemplate = pickRandom(availableTemplates);
		usedTemplateIds.add(currentTemplate.id);

		await room.updateSharedData({
			phase: "setup",
			round: round,
			roundCount: roundCount,
			template: currentTemplate.template,
			setupPlayerId: setupPlayer,
			setupPlayerName: playerNames[setupPlayer],
		});

		setupResponse = await room.requestInputFromSubset(
			"setup",
			{
				type: "text",
				prompt: "Fill in the blank: " + currentTemplate.template,
				timeLimit: SETUP_TIME,
			},
			[setupPlayer],
		);

		var setupText = setupResponse.get(setupPlayer)?.value || "something";
		var filledSetup = fillTemplate(currentTemplate.template, setupText);

		forcedWord = tokenBank.pop();
		if (!forcedWord) {
			forcedWord = { word: "pickle", submittedBy: "system" };
		}

		await room.updateSharedData({
			phase: "forcedword",
			template: filledSetup,
			forcedWord: forcedWord.word,
			bridgePlayerId: bridgePlayer,
			bridgePlayerName: playerNames[bridgePlayer],
		});

		bridgeResponse = await room.requestInputFromSubset(
			"forcedword",
			{
				type: "text",
				prompt:
					'The setup is: "' +
					filledSetup +
					'"\n\nNow write a bridge sentence that incorporates the word: "' +
					forcedWord.word +
					'"',
				timeLimit: FORCED_WORD_TIME,
			},
			[bridgePlayer],
		);

		var bridgeText =
			bridgeResponse.get(bridgePlayer)?.value || "And then something happened.";

		await room.updateSharedData({
			phase: "punchline",
			setup: filledSetup,
			bridge: bridgeText,
			punchlinePlayerId: punchlinePlayer,
			punchlinePlayerName: playerNames[punchlinePlayer],
		});

		punchlineResponse = await room.requestInputFromSubset(
			"punchline",
			{
				type: "text",
				prompt:
					'Setup: "' +
					filledSetup +
					'"\nBridge: "' +
					bridgeText +
					'"\n\nWrite the punchline!',
				timeLimit: PUNCHLINE_TIME,
			},
			[punchlinePlayer],
		);

		var punchlineText =
			punchlineResponse.get(punchlinePlayer)?.value ||
			"And that's how it ended.";
		performedLive = false;
		audioBlobId = null;

		var micResponse = await room.requestInputFromSubset(
			"punchline-mic",
			{
				type: "mic",
				prompt: "Want to perform your punchline live? Record up to 5 seconds!",
				timeLimit: 15,
				optional: true,
			},
			[punchlinePlayer],
		);

		var micData = micResponse.get(punchlinePlayer);
		if (micData && micData.audioBlobId) {
			performedLive = true;
			audioBlobId = micData.audioBlobId;
		}

		joke = {
			round: round,
			setup: filledSetup,
			bridge: bridgeText,
			punchline: punchlineText,
			setupPlayer: setupPlayer,
			setupPlayerName: playerNames[setupPlayer],
			bridgePlayer: bridgePlayer,
			bridgePlayerName: playerNames[bridgePlayer],
			punchlinePlayer: punchlinePlayer,
			punchlinePlayerName: playerNames[punchlinePlayer],
			forcedWord: forcedWord.word,
			performedLive: performedLive,
			audioBlobId: audioBlobId,
		};
		jokes.push(joke);

		await room.updateSharedData({
			phase: "theshow",
			joke: joke,
		});
		await room.delay(SHOW_DURATION);
	}

	await room.updateSharedData({
		phase: "voting",
		jokes: jokes.map((j, idx) => ({
			index: idx,
			setup: j.setup,
			bridge: j.bridge,
			punchline: j.punchline,
			setupPlayerName: j.setupPlayerName,
			bridgePlayerName: j.bridgePlayerName,
			punchlinePlayerName: j.punchlinePlayerName,
			performedLive: j.performedLive,
		})),
	});

	var voteChoices = jokes.map(
		(j, idx) => "Joke " + (idx + 1) + ": " + j.setup.slice(0, 30) + "...",
	);

	voteResponses = await room.requestInput("vote", {
		type: "choice",
		prompt: "Which joke was the funniest?",
		choices: voteChoices,
		timeLimit: VOTE_TIME,
	});

	voteCounts = [];
	for (i = 0; i < jokes.length; i++) {
		voteCounts[i] = 0;
	}

	voteResponses.forEach((response, voterId) => {
		var voteIndex = response.value;
		if (voteIndex >= 0 && voteIndex < jokes.length) {
			voteCounts[voteIndex]++;
		}
	});

	maxVotes = 0;
	winningJokeIndex = 0;
	for (i = 0; i < voteCounts.length; i++) {
		if (voteCounts[i] > maxVotes) {
			maxVotes = voteCounts[i];
			winningJokeIndex = i;
		}
	}

	var winningJoke = jokes[winningJokeIndex];
	if (winningJoke) {
		scores[winningJoke.setupPlayer] =
			(scores[winningJoke.setupPlayer] || 0) + POINTS_SETUP;
		scores[winningJoke.bridgePlayer] =
			(scores[winningJoke.bridgePlayer] || 0) + POINTS_BRIDGE;
		scores[winningJoke.punchlinePlayer] =
			(scores[winningJoke.punchlinePlayer] || 0) + POINTS_PUNCHLINE;

		scores[winningJoke.bridgePlayer] =
			(scores[winningJoke.bridgePlayer] || 0) + POINTS_TOKEN_USAGE;

		if (winningJoke.performedLive) {
			scores[winningJoke.punchlinePlayer] =
				(scores[winningJoke.punchlinePlayer] || 0) + POINTS_PERFORMANCE;
		}
	}

	scoreboard = playerIds
		.map((id) => ({
			id: id,
			name: playerNames[id],
			score: scores[id] || 0,
		}))
		.sort((a, b) => b.score - a.score);

	winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
		winningJoke: winningJoke,
		voteCounts: voteCounts,
	});
	await room.delay(WINNER_DURATION);

	await room.setPhase("ended");
};
