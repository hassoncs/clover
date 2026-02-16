var party = require("slopcade/party");
var content = require("slopcade/content");

var DRAW_TIME_LIMIT = 60;
var VOTE_TIME_LIMIT = 20;
var REVEAL_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 2;
var POINTS_BATTLE_VICTORY = 1000;
var POINTS_UNDERDOG_BONUS = 500;

var FALLBACK_TITLES = [
	{ id: "title1", prompt: "The God of Damp Socks", category: "absurd" },
	{ id: "title2", prompt: "The Whispering Walrus", category: "mysterious" },
	{
		id: "title3",
		prompt: "The Queen of Forgotten Leftovers",
		category: "absurd",
	},
	{ id: "title4", prompt: "The Shadow That Pays Rent", category: "mysterious" },
	{ id: "title5", prompt: "The Duke of Awkward Silences", category: "absurd" },
	{ id: "title6", prompt: "The Last Pizza Slice Guardian", category: "absurd" },
	{
		id: "title7",
		prompt: "The Phantom of the Laundromat",
		category: "mysterious",
	},
	{ id: "title8", prompt: "The Baron of Bad Hair Days", category: "absurd" },
	{
		id: "title9",
		prompt: "The Spirit of Unfinished Projects",
		category: "mysterious",
	},
	{
		id: "title10",
		prompt: "The Lord of Lost Remote Controls",
		category: "absurd",
	},
];

function toNumber(value, fallback) {
	var n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function shuffle(array) {
	var i, j, temp;
	var arr = array.slice();
	for (i = arr.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

exports.run = async (room, config) => {
	var i, j, p, r, round, pairIdx;
	var readyResponses, playerIds, playerNames;
	var scores, roundCount, pool, shuffledPool, usedIds;
	var title, titleText;
	var halfCount, champions, challengers;
	var championIds, challengerIds;
	var championResponses, challengerResponses;
	var battles, battle, championDrawing, challengerDrawing;
	var voteResponses, votes, championVotes, challengerVotes;
	var winner, winnerId, isChallengerWin;
	var scoreboard, finalScoreboard;

	await room.setPhase("playing");

	readyResponses = await room.requestInput("ready-check", {
		type: "buzzer",
		prompt: "Get ready for Rival Roster!",
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

	scores = {};
	for (i = 0; i < playerIds.length; i++) {
		scores[playerIds[i]] = 0;
	}

	roundCount = toNumber(config && config.roundCount, DEFAULT_ROUND_COUNT);
	pool =
		config && config.contentPack && config.contentPack.length > 0
			? config.contentPack
			: FALLBACK_TITLES;
	shuffledPool = shuffle(pool);
	usedIds = new Set();

	battles = [];

	for (round = 1; round <= roundCount; round++) {
		title = null;
		for (i = 0; i < shuffledPool.length; i++) {
			if (!usedIds.has(shuffledPool[i].id)) {
				title = shuffledPool[i];
				break;
			}
		}
		if (!title) {
			usedIds.clear();
			title = shuffledPool[0];
		}
		usedIds.add(title.id);
		titleText = title.prompt || title.text;

		halfCount = Math.floor(playerIds.length / 2);
		if (halfCount < 1) {
			halfCount = 1;
		}

		championIds = playerIds.slice(0, halfCount);
		challengerIds = playerIds.slice(halfCount, halfCount * 2);

		if (championIds.length === 0 || challengerIds.length === 0) {
			championIds = [playerIds[0]];
			challengerIds = playerIds.length > 1 ? [playerIds[1]] : [playerIds[0]];
		}

		await room.updateSharedData({
			phase: "champion_phase",
			round: round,
			title: titleText,
		});

		championResponses = await room.requestInputFromSubset(
			"champion-drawing-" + round,
			{
				type: "drawing",
				prompt: "Draw a Champion for: " + titleText,
				timeLimit: DRAW_TIME_LIMIT,
			},
			championIds,
		);

		champions = {};
		championResponses.forEach((response, playerId) => {
			champions[playerId] = response.value;
		});

		await room.updateSharedData({
			phase: "challenger_phase",
			round: round,
		});

		challengerResponses = await room.requestInputFromSubset(
			"challenger-drawing-" + round,
			{
				type: "drawing",
				prompt: "Draw a Challenger to defeat this Champion!",
				timeLimit: DRAW_TIME_LIMIT,
				metadata: {
					championDrawings: champions,
				},
			},
			challengerIds,
		);

		challengers = {};
		challengerResponses.forEach((response, playerId) => {
			challengers[playerId] = response.value;
		});

		for (
			pairIdx = 0;
			pairIdx < championIds.length && pairIdx < challengerIds.length;
			pairIdx++
		) {
			var champId = championIds[pairIdx];
			var challId = challengerIds[pairIdx];

			battle = {
				round: round,
				title: titleText,
				championId: champId,
				championName: playerNames[champId],
				championDrawing: champions[champId],
				challengerId: challId,
				challengerName: playerNames[challId],
				challengerDrawing: challengers[challId],
				votes: [],
				winnerId: null,
			};

			await room.updateSharedData({
				phase: "battle_reveal",
				round: round,
				battle: battle,
			});
			await room.delay(REVEAL_DURATION_MS);

			await room.updateSharedData({
				phase: "voting",
				round: round,
				battle: battle,
			});

			voteResponses = await room.requestInput("vote-" + round + "-" + pairIdx, {
				type: "choice",
				prompt: "Who wins: " + titleText + "?",
				options: [
					playerNames[champId] + " (Champion)",
					playerNames[challId] + " (Challenger)",
				],
				timeLimit: VOTE_TIME_LIMIT,
			});

			championVotes = 0;
			challengerVotes = 0;
			votes = [];

			voteResponses.forEach((response, voterId) => {
				var vote = response.value;
				votes.push({
					voterId: voterId,
					voterName: playerNames[voterId],
					vote: vote,
				});
				if (vote === 0) {
					championVotes++;
				} else {
					challengerVotes++;
				}
			});

			if (challengerVotes > championVotes) {
				winnerId = challId;
				isChallengerWin = true;
			} else if (championVotes > challengerVotes) {
				winnerId = champId;
				isChallengerWin = false;
			} else {
				winnerId = champId;
				isChallengerWin = false;
			}

			scores[winnerId] += POINTS_BATTLE_VICTORY;
			if (isChallengerWin) {
				scores[winnerId] += POINTS_UNDERDOG_BONUS;
			}

			battle.votes = votes;
			battle.winnerId = winnerId;
			battle.championVotes = championVotes;
			battle.challengerVotes = challengerVotes;
			battle.isChallengerWin = isChallengerWin;

			battles.push(battle);

			await room.updateSharedData({
				phase: "battle_result",
				round: round,
				battle: battle,
				scores: scores,
			});
			await room.delay(REVEAL_DURATION_MS);
		}
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
		battles: battles,
	});
	await room.delay(WINNER_DURATION_MS);

	await room.setPhase("ended");
};
