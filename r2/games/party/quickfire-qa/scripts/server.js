var content = require("slopcade/content");

var QUESTION_TIME_LIMIT = 15;
var REVEAL_DURATION_MS = 5000;
var SCORES_DURATION_MS = 5000;
var BASE_POINTS = 500;
var MAX_SPEED_BONUS = 500;
var STREAK_BONUS = 100;

exports.run = async (room, config) => {
	await room.setPhase("playing");

	var pool = Array.isArray(config && config.contentPack)
		? config.contentPack
		: [];
	var questions = content.shuffle(pool);

	var playerScores = {};
	var playerStreaks = {};

	for (var i = 0; i < questions.length; i++) {
		var q = questions[i];
		var options = content.shuffle([q.correctAnswer].concat(q.incorrectAnswers));

		await room.updateSharedData({
			qaPhase: "question",
			questionIndex: i,
			totalQuestions: questions.length,
			prompt: q.question,
			optionsJson: JSON.stringify(options),
			timerRemaining: QUESTION_TIME_LIMIT,
		});

		var startTime = Date.now();
		var responses = await room.requestInput("question-" + i, {
			type: "choice",
			prompt: q.question,
			options: options,
			timeLimit: QUESTION_TIME_LIMIT,
		});

		var results = [];
		responses.forEach((response, playerId) => {
			var isCorrect = response && response.value === q.correctAnswer;
			var points = 0;
			var speedBonus = 0;
			var streakBonus = 0;

			if (isCorrect) {
				var timeTaken = response.timestamp - startTime;
				var speedFactor = Math.max(
					0,
					1 - timeTaken / (QUESTION_TIME_LIMIT * 1000),
				);
				speedBonus = Math.round(speedFactor * MAX_SPEED_BONUS);

				var currentStreak = (playerStreaks[playerId] || 0) + 1;
				playerStreaks[playerId] = currentStreak;
				streakBonus = (currentStreak - 1) * STREAK_BONUS;

				points = BASE_POINTS + speedBonus + streakBonus;
				playerScores[playerId] = (playerScores[playerId] || 0) + points;
				room.updatePlayerScore(playerId, points);
			} else {
				playerStreaks[playerId] = 0;
			}

			results.push({
				playerId: playerId,
				answer: response ? response.value : null,
				isCorrect: isCorrect,
				points: points,
				speedBonus: speedBonus,
				streakBonus: streakBonus,
			});
		});

		await room.updateSharedData({
			qaPhase: "reveal",
			questionIndex: i,
			totalQuestions: questions.length,
			prompt: q.question,
			correctAnswer: q.correctAnswer,
			resultsJson: JSON.stringify(results),
			timerRemaining: 0,
		});

		await room.delay(REVEAL_DURATION_MS);
	}

	await room.updateSharedData({
		qaPhase: "scores",
		timerRemaining: 0,
	});

	await room.delay(SCORES_DURATION_MS);
	await room.setPhase("ended");
};
