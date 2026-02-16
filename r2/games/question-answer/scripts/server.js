var content = require("slopcade/content");

var QUESTIONS = [
  "What's the worst superpower you can think of?",
  "If you could only eat one food for the rest of your life, what would it be?",
  "What's the most useless talent you have?",
  "If animals could talk, which would be the rudest?",
  "What would be the worst thing to hear as you're going under anesthesia?"
];

var QUESTION_TIME_LIMIT = 30;
var REVEAL_DURATION_MS = 5000;

exports.run = async function(room) {
  await room.setPhase("playing");

  var prompts = content.shuffle(QUESTIONS);

  for (var i = 0; i < prompts.length; i++) {
    var prompt = prompts[i];

    await room.updateSharedData({
      qaPhase: "question",
      questionIndex: i,
      totalQuestions: prompts.length,
      prompt: prompt,
      answersJson: "[]",
      timerRemaining: QUESTION_TIME_LIMIT
    });

    var responses = await room.requestInput("question-" + i, {
      type: "text",
      prompt: prompt,
      timeLimit: QUESTION_TIME_LIMIT
    });

    var answers = [];
    responses.forEach(function(response, playerId) {
      answers.push({
        playerName: response && response.playerId ? String(response.playerId) : playerId,
        answer: String(response && response.value !== undefined ? response.value : "")
      });
    });

    await room.updateSharedData({
      qaPhase: "reveal",
      questionIndex: i,
      totalQuestions: prompts.length,
      prompt: prompt,
      answersJson: JSON.stringify(answers),
      timerRemaining: 0
    });

    await room.delay(REVEAL_DURATION_MS);
  }

  await room.updateSharedData({
    qaPhase: "done",
    totalQuestions: prompts.length,
    questionIndex: prompts.length,
    prompt: "Game Over!",
    answersJson: "[]",
    timerRemaining: 0
  });

  await room.setPhase("ended");
};