var party = require("slopcade/party");
var content = require("slopcade/content");

var TRAIT_ASSIGNMENT_TIME = 10;
var CONFESSIONAL_TIME = 45;
var GUESS_TIME = 25;
var VOTE_TIME = 15;
var REVEAL_DURATION = 5000;
var SCORES_DURATION = 5000;
var WINNER_DURATION = 10000;

var POINTS_CORRECT_GUESS = 300;
var POINTS_FOOL_OTHERS = 200;
var POINTS_ACTING_BONUS = 100;

var TRAITS = [
	{
		trait: "Obsessed with spoons",
		description:
			"You find spoons fascinating and try to bring them up in every conversation.",
	},
	{
		trait: "Thinks they are a cat",
		description:
			"You are convinced you are a feline. You might hiss, purr, or mention your nine lives.",
	},
	{
		trait: "Secretly a ghost",
		description:
			"You are dead but trying to act like you're still alive. You might mention being cold or 'passing through' things.",
	},
	{
		trait: "Afraid of their own shadow",
		description:
			"You are extremely jumpy and suspicious of everything, especially shadows.",
	},
	{
		trait: "Thinks the cameras are eyes",
		description:
			"You are paranoid that the reality show cameras are actually giant eyeballs watching your soul.",
	},
	{
		trait: "Believes they are the only real person",
		description:
			"You think everyone else is a simulation or a robot. You are the only 'main character'.",
	},
	{
		trait: "Obsessed with finding a 'secret room'",
		description:
			"You are convinced there is a hidden treasure room in the mansion and you're looking for it.",
	},
	{
		trait: "Always hears a faint violin",
		description:
			"You are haunted by music that only you can hear. It influences your mood dramatically.",
	},
	{
		trait: "Thinks they are in a musical",
		description:
			"You feel like breaking into song at any moment and describe your life in theatrical terms.",
	},
	{
		trait: "Convinced everyone is a robot",
		description:
			"You keep looking for charging ports or 'glitches' in your fellow contestants.",
	},
	{
		trait: "Can only speak in rhymes",
		description:
			"You try to make your sentences rhyme, or at least mention how poetic everything is.",
	},
	{
		trait: "Thinks they are the host",
		description:
			"You believe you are actually running the show and everyone else is just a guest.",
	},
	{
		trait: "Afraid of the color purple",
		description:
			"You are terrified of anything purple and will react strongly if you see it (or imagine it).",
	},
	{
		trait: "Talks to furniture",
		description:
			"You believe the chairs and tables have feelings and you consult them for advice.",
	},
	{
		trait: "Famous detective",
		description:
			"You think you are here to solve a murder mystery that hasn't even happened yet.",
	},
	{
		trait: "Convinced they are invisible",
		description:
			"You think people can't see you unless you make a loud noise or touch them.",
	},
	{
		trait: "Obsessed with mirrors",
		description:
			"You can't stop talking about your own reflection or how mirrors are portals.",
	},
	{
		trait: "Thinks they are a vampire",
		description:
			"You avoid 'sunlight', crave 'red drinks', and mention your 'eternal youth'.",
	},
	{
		trait: "Afraid of silence",
		description:
			"You must keep talking or making noise because silence feels like it's 'closing in'.",
	},
	{
		trait: "Time traveler",
		description:
			"You are from the year 2144 and find everything in this 'primitive' era hilarious or confusing.",
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

exports.run = async (room, config) => {
	var i, j, k, p, r;
	var playerIds, playerNames, scores;
	var roundCount, round;
	var pool, shuffledPool, usedPromptIds;
	var currentTraits, playerTraits;
	var prompt, promptText;
	var confessionalResponses, playerAnswers;
	var subjectId, others, subjectAnswer, subjectTrait;
	var decoys, guessChoices, guessResponses;
	var results, guesserId, guessIndex, guessedTrait;
	var voteResponses, voteCounts, maxVotes, winnerId;
	var scoreboard, winner;
	var initialPlayers;

	await room.setPhase("playing");

	playerIds = [];
	playerNames = {};
	scores = {};

	initialPlayers = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to Role Replay! Get ready for the Spooky Reality TV show.",
		timeLimit: 5,
	});

	initialPlayers.forEach((response, playerId) => {
		playerIds.push(playerId);
		playerNames[playerId] = response.playerName || playerId.slice(0, 6);
		scores[playerId] = 0;
	});

	if (playerIds.length < 3) {
		await room.updateSharedData({
			phase: "error",
			errorMessage: "Need at least 3 players to play Role Replay.",
		});
		await room.setPhase("ended");
		return;
	}

	roundCount = (config && config.roundCount) || 2;
	pool = (config && config.contentPack) || [];
	shuffledPool = shuffle([...pool]);
	usedPromptIds = new Set();

	for (round = 1; round <= roundCount; round++) {
		currentTraits = shuffle([...TRAITS]);
		playerTraits = {};

		for (i = 0; i < playerIds.length; i++) {
			p = playerIds[i];
			playerTraits[p] = currentTraits[i % currentTraits.length];

			await room.sendToPlayer(p, "private_info", {
				trait: playerTraits[p].trait,
				description: playerTraits[p].description,
			});
		}

		await room.updateSharedData({
			phase: "trait_assignment",
			round: round,
			roundCount: roundCount,
		});
		await room.delay(TRAIT_ASSIGNMENT_TIME * 1000);

		prompt =
			shuffledPool.find((p) => !usedPromptIds.has(p.id)) || shuffledPool[0];
		usedPromptIds.add(prompt.id);
		promptText =
			prompt.text || "Tell us how you're feeling about the mansion so far.";

		await room.updateSharedData({
			phase: "confessional",
			prompt: promptText,
		});

		confessionalResponses = await room.requestInput("confessional", {
			type: "text",
			prompt: promptText,
			timeLimit: CONFESSIONAL_TIME,
		});

		playerAnswers = {};
		playerIds.forEach((id) => {
			playerAnswers[id] =
				confessionalResponses.get(id)?.value || "I'm just here for the drama.";
		});

		for (i = 0; i < playerIds.length; i++) {
			subjectId = playerIds[i];
			others = playerIds.filter((id) => id !== subjectId);
			subjectAnswer = playerAnswers[subjectId];
			subjectTrait = playerTraits[subjectId];

			decoys = shuffle(
				TRAITS.filter((t) => t.trait !== subjectTrait.trait),
			).slice(0, 3);
			guessChoices = shuffle([
				subjectTrait.trait,
				...decoys.map((d) => d.trait),
			]);

			await room.updateSharedData({
				phase: "guessing",
				subjectId: subjectId,
				subjectName: playerNames[subjectId],
				subjectAnswer: subjectAnswer,
				choices: guessChoices,
			});

			guessResponses = await room.requestInputFromSubset(
				"guess",
				{
					type: "choice",
					prompt: "What is " + playerNames[subjectId] + "'s secret trait?",
					choices: guessChoices,
					timeLimit: GUESS_TIME,
				},
				others,
			);

			results = {
				subjectId: subjectId,
				correctTrait: subjectTrait.trait,
				guesses: [],
				pointsEarned: {},
			};
			playerIds.forEach((id) => (results.pointsEarned[id] = 0));

			guessResponses.forEach((response, guesserId) => {
				guessIndex = response.value;
				guessedTrait = guessChoices[guessIndex];

				results.guesses.push({
					guesserId: guesserId,
					guessedTrait: guessedTrait,
					isCorrect: guessedTrait === subjectTrait.trait,
				});

				if (guessedTrait === subjectTrait.trait) {
					scores[guesserId] += POINTS_CORRECT_GUESS;
					results.pointsEarned[guesserId] += POINTS_CORRECT_GUESS;
				} else {
					scores[subjectId] += POINTS_FOOL_OTHERS;
					results.pointsEarned[subjectId] += POINTS_FOOL_OTHERS;
				}
			});

			await room.updateSharedData({
				phase: "reveal",
				results: results,
				scores: scores,
			});
			await room.delay(REVEAL_DURATION);
		}

		await room.updateSharedData({
			phase: "voting",
			answers: playerIds.map((id) => ({
				id: id,
				name: playerNames[id],
				answer: playerAnswers[id],
			})),
		});

		voteResponses = await room.requestInput("vote", {
			type: "choice",
			prompt: "Who stayed in character the best?",
			choices: playerIds.map((id) => playerNames[id]),
			timeLimit: VOTE_TIME,
		});

		voteCounts = {};
		playerIds.forEach((id) => (voteCounts[id] = 0));
		voteResponses.forEach((response, voterId) => {
			winnerId = playerIds[response.value];
			if (winnerId && winnerId !== voterId) {
				voteCounts[winnerId]++;
			}
		});

		maxVotes = 0;
		playerIds.forEach((id) => {
			if (voteCounts[id] > maxVotes) maxVotes = voteCounts[id];
		});

		if (maxVotes > 0) {
			playerIds.forEach((id) => {
				if (voteCounts[id] === maxVotes) {
					scores[id] += POINTS_ACTING_BONUS;
				}
			});
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
			voteCounts: voteCounts,
		});
		await room.delay(SCORES_DURATION);
	}

	scoreboard = playerIds
		.map((id) => ({
			id: id,
			name: playerNames[id],
			score: scores[id],
		}))
		.sort((a, b) => b.score - a.score);

	var winner = scoreboard[0];

	await room.updateSharedData({
		phase: "winner",
		winner: winner,
		scoreboard: scoreboard,
	});
	await room.delay(WINNER_DURATION);

	await room.setPhase("ended");
};
