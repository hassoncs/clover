var party = require("slopcade/party");
var content = require("slopcade/content");

var ANSWER_TIME_LIMIT = 30;
var VOTE_TIME_LIMIT = 15;
var REVEAL_DURATION_MS = 3000;
var RESULTS_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var WINNER_DURATION_MS = 10000;
var DEFAULT_ROUND_COUNT = 5;
var NO_ANSWER = "(no answer)";
var POINTS_PER_VOTE = 100;
var CLEAN_SWEEP_BONUS = 50;

function toNumber(value, fallback) {
  var n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.run = async function(room, config) {
  await room.setPhase("playing");

  var readyResponses = await room.requestInput("ready-check", {
    type: "buzzer",
    prompt: "Get ready!",
    timeLimit: 5
  });

  var playerIds = [];
  var playerNames = {};

  readyResponses.forEach(function(response, playerId) {
    playerIds.push(playerId);
    playerNames[playerId] = response && response.playerId ? String(response.playerId) : playerId.slice(0, 6);
  });

  if (playerIds.length < 3) {
    await room.updateSharedData({
      phase: "error",
      errorMessage: "Need at least 3 players"
    });
    await room.setPhase("ended");
    return;
  }

  var scores = {};
  for (var i = 0; i < playerIds.length; i++) {
    scores[playerIds[i]] = 0;
  }

  var roundCount = toNumber(config && config.roundCount, DEFAULT_ROUND_COUNT);
  var pool = Array.isArray(config && config.contentPack) ? config.contentPack : [];
  var shuffledPool = content.shuffle(pool);
  var usedIds = {};

  for (var round = 1; round <= roundCount; round++) {
    var selectedPrompts = content.selectForRound(shuffledPool, 1, usedIds);

    if (selectedPrompts.length < 1) {
      usedIds = {};
      shuffledPool = content.shuffle(pool);
      selectedPrompts = content.selectForRound(shuffledPool, 1, usedIds);
    }

    if (selectedPrompts.length > 0) {
      content.markUsed(usedIds, selectedPrompts);
    }

    var prompt = selectedPrompts.length > 0 ? selectedPrompts[0] : null;
    var promptText = prompt && prompt.text ? String(prompt.text) : "Say something funny.";

    await room.updateSharedData({
      phase: "answering",
      roundNumber: round,
      totalRounds: roundCount,
      promptText: promptText,
      timerRemaining: ANSWER_TIME_LIMIT
    });

    var answerResponses = await room.requestInput("answer-r" + round, {
      type: "text",
      prompt: promptText,
      timeLimit: ANSWER_TIME_LIMIT
    });

    var answers = [];
    var authorMap = {};
    var answerIndex = 0;

    answerResponses.forEach(function(response, playerId) {
      var answerId = "r" + round + "-a" + answerIndex;
      answerIndex += 1;
      var text = String(response && response.value !== undefined ? response.value : "").trim();
      answers.push({
        id: answerId,
        text: text || NO_ANSWER,
        authorId: playerId
      });
      authorMap[answerId] = playerId;
    });

    for (i = 0; i < playerIds.length; i++) {
      var playerId = playerIds[i];
      if (!answerResponses.has(playerId)) {
        var answerId = "r" + round + "-a" + answerIndex;
        answerIndex += 1;
        answers.push({
          id: answerId,
          text: NO_ANSWER,
          authorId: playerId
        });
        authorMap[answerId] = playerId;
      }
    }

    var shuffledAnswers = content.shuffle(answers);
    var anonymousAnswers = shuffledAnswers.map(function(answer) {
      return {
        id: answer.id,
        text: answer.text
      };
    });

    await room.updateSharedData({
      phase: "reveal",
      roundNumber: round,
      totalRounds: roundCount,
      promptText: promptText,
      answersJson: JSON.stringify(anonymousAnswers),
      timerRemaining: 0
    });

    await room.delay(REVEAL_DURATION_MS);

    await room.updateSharedData({
      phase: "voting",
      roundNumber: round,
      totalRounds: roundCount,
      promptText: promptText,
      voteOptionsJson: JSON.stringify(anonymousAnswers),
      timerRemaining: VOTE_TIME_LIMIT
    });

    var voteResponses = await room.requestInput("vote-r" + round, {
      type: "choice",
      prompt: promptText,
      options: anonymousAnswers.map(function(answer) {
        return answer.id;
      }),
      timeLimit: VOTE_TIME_LIMIT
    });

    var normalizedVotes = {};
    voteResponses.forEach(function(response, playerId) {
      normalizedVotes[playerId] = {
        value: String(response && response.value !== undefined ? response.value : "")
      };
    });

    var voteCounts = party.tallyVotes(normalizedVotes, true, authorMap);
    var totalValidVotes = 0;

    for (i = 0; i < shuffledAnswers.length; i++) {
      totalValidVotes += Number(voteCounts[shuffledAnswers[i].id]) || 0;
    }

    var roundResults = [];
    for (i = 0; i < shuffledAnswers.length; i++) {
      var answer = shuffledAnswers[i];
      var count = Number(voteCounts[answer.id]) || 0;
      var points = count * POINTS_PER_VOTE;
      if (totalValidVotes > 0 && count === totalValidVotes) {
        points += CLEAN_SWEEP_BONUS;
      }

      var authorId = authorMap[answer.id] || "";
      scores[authorId] = (scores[authorId] || 0) + points;

      if (points > 0) {
        await room.updatePlayerScore(authorId, points);
      }

      roundResults.push({
        answerId: answer.id,
        text: answer.text,
        authorName: playerNames[authorId] || authorId,
        voteCount: count,
        points: points
      });
    }

    roundResults.sort(function(a, b) {
      return b.voteCount - a.voteCount;
    });

    var scoreboard = party.createScoreboard(scores, playerNames);

    await room.updateSharedData({
      phase: "round_results",
      roundNumber: round,
      totalRounds: roundCount,
      promptText: promptText,
      resultsJson: JSON.stringify(roundResults),
      scoreboardJson: JSON.stringify(scoreboard),
      timerRemaining: 0
    });

    await room.delay(RESULTS_DURATION_MS);

    await room.updateSharedData({
      phase: "scores",
      roundNumber: round,
      totalRounds: roundCount,
      scoreboardJson: JSON.stringify(scoreboard),
      timerRemaining: 0
    });

    await room.delay(SCORES_DURATION_MS);
  }

  var finalScoreboard = party.createScoreboard(scores, playerNames);
  var winner = finalScoreboard.length > 0 ? finalScoreboard[0] : null;

  await room.updateSharedData({
    phase: "winner",
    scoreboardJson: JSON.stringify(finalScoreboard),
    winnerName: winner ? winner.playerName : "Nobody",
    timerRemaining: 0
  });

  await room.delay(WINNER_DURATION_MS);
  await room.setPhase("ended");
};