var party = require("slopcade/party");
var content = require("slopcade/content");

var SURVEY_TIME_LIMIT = 45;
var TURN_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 3000;
var WINNER_DURATION_MS = 10000;

var FALLBACK_CATEGORIES = [
	{
		category: "Best Pizza Toppings",
		items: [
			"Pepperoni",
			"Mushrooms",
			"Onions",
			"Sausage",
			"Bacon",
			"Extra Cheese",
			"Black Olives",
			"Green Peppers",
		],
	},
	{
		category: "Best Superpowers",
		items: [
			"Flight",
			"Invisibility",
			"Super Strength",
			"Teleportation",
			"Time Travel",
			"Mind Reading",
			"Telekinesis",
			"Shapeshifting",
		],
	},
	{
		category: "Worst Chores",
		items: [
			"Doing Dishes",
			"Laundry",
			"Vacuuming",
			"Cleaning Bathroom",
			"Taking Out Trash",
			"Mowing Lawn",
			"Dusting",
			"Ironing",
		],
	},
	{
		category: "Best Ice Cream Flavors",
		items: [
			"Vanilla",
			"Chocolate",
			"Strawberry",
			"Mint Chip",
			"Cookie Dough",
			"Rocky Road",
			"Coffee",
			"Pistachio",
		],
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
	var i, j, k, p, id;
	var playerIds, playerNames, readyResponses;
	var teams, teamNames, teamLives, teamScores, teamFoundTop3;
	var pool, categoryData, items, masterList;
	var surveyResponses, bordaScores;
	var currentTeamIndex, activeTeamId, otherTeamId;
	var turnResult, pickedItemIndex, pickedItem;
	var gameOver, winnerTeamId;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Welcome to The Hive Mind!",
		timeLimit: 5,
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

	shuffle(playerIds);
	teams = {
		diggers: [],
		drillers: [],
	};
	for (i = 0; i < playerIds.length; i++) {
		if (i % 2 === 0) {
			teams.diggers.push(playerIds[i]);
		} else {
			teams.drillers.push(playerIds[i]);
		}
	}

	teamNames = {
		diggers: "The Diggers",
		drillers: "The Drillers",
	};
	teamLives = {
		diggers: 3,
		drillers: 3,
	};
	teamScores = {
		diggers: 0,
		drillers: 0,
	};
	teamFoundTop3 = {
		diggers: [],
		drillers: [],
	};

	pool = config && config.contentPack ? config.contentPack : [];
	if (pool.length === 0) {
		pool = FALLBACK_CATEGORIES;
	}
	categoryData = pool[Math.floor(Math.random() * pool.length)];
	items = categoryData.items;

	await room.updateSharedData({
		phase: "survey",
		category: categoryData.category,
		items: items,
		teams: teams,
		teamNames: teamNames,
	});

	surveyResponses = await room.requestInput("survey", {
		type: "choice",
		subtype: "ranking",
		prompt: "Rank these from BEST to WORST: " + categoryData.category,
		choices: items,
		timeLimit: SURVEY_TIME_LIMIT,
	});

	bordaScores = items.map(() => 0);
	surveyResponses.forEach((response) => {
		var ranking = response.value;
		if (Array.isArray(ranking)) {
			for (i = 0; i < ranking.length; i++) {
				bordaScores[ranking[i]] += items.length - i;
			}
		}
	});

	masterList = items
		.map((text, index) => ({
			text: text,
			index: index,
			score: bordaScores[index],
		}))
		.sort((a, b) => b.score - a.score);

	for (i = 0; i < masterList.length; i++) {
		masterList[i].rank = i + 1;
	}

	await room.updateSharedData({
		phase: "team_turns",
		masterList: masterList.map((m) => ({ text: m.text, revealed: false })),
		teamLives: teamLives,
		teamScores: teamScores,
	});

	currentTeamIndex = 0;
	gameOver = false;
	winnerTeamId = null;

	while (!gameOver) {
		activeTeamId = currentTeamIndex === 0 ? "diggers" : "drillers";
		otherTeamId = activeTeamId === "diggers" ? "drillers" : "diggers";

		await room.updateSharedData({
			activeTeamId: activeTeamId,
			turnStatus: "waiting",
		});

		turnResult = await room.requestInputFromSubset(
			"pick",
			{
				type: "choice",
				prompt:
					teamNames[activeTeamId] + ", pick an item you think is popular!",
				choices: items,
				timeLimit: TURN_TIME_LIMIT,
			},
			teams[activeTeamId],
		);

		pickedItemIndex = -1;
		turnResult.forEach((response) => {
			if (pickedItemIndex === -1) pickedItemIndex = response.value;
		});

		if (pickedItemIndex === -1) {
			teamLives[activeTeamId]--;
			await room.updateSharedData({
				turnStatus: "timeout",
				teamLives: teamLives,
			});
		} else {
			pickedItem = masterList.find((m) => m.index === pickedItemIndex);

			if (pickedItem.rank <= 3) {
				teamScores[activeTeamId] += pickedItem.rank === 1 ? 2000 : 1000;
				if (!teamFoundTop3[activeTeamId].includes(pickedItem.rank)) {
					teamFoundTop3[activeTeamId].push(pickedItem.rank);
				}
				await room.updateSharedData({
					turnStatus: "success",
					pickedItem: pickedItem,
					teamScores: teamScores,
				});
			} else if (pickedItem.rank >= items.length - 1) {
				teamLives[activeTeamId]--;
				await room.updateSharedData({
					turnStatus: "trap",
					pickedItem: pickedItem,
					teamLives: teamLives,
				});
			} else {
				await room.updateSharedData({
					turnStatus: "neutral",
					pickedItem: pickedItem,
				});
			}
		}

		await room.delay(REVEAL_DURATION_MS);

		if (teamFoundTop3[activeTeamId].length === 3) {
			gameOver = true;
			winnerTeamId = activeTeamId;
		} else if (teamLives.diggers <= 0) {
			gameOver = true;
			winnerTeamId = "drillers";
		} else if (teamLives.drillers <= 0) {
			gameOver = true;
			winnerTeamId = "diggers";
		}

		currentTeamIndex = 1 - currentTeamIndex;
	}

	await room.updateSharedData({
		phase: "winner",
		winnerTeamId: winnerTeamId,
		winnerTeamName: teamNames[winnerTeamId],
		masterList: masterList,
		teamScores: teamScores,
	});

	await room.delay(WINNER_DURATION_MS);
	await room.setPhase("ended");
};
