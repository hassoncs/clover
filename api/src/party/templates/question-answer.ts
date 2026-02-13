import type { PartyRoomDO } from "../PartyRoomDO";

const QUESTIONS = [
	"What's the worst superpower you can think of?",
	"If you could only eat one food for the rest of your life, what would it be?",
	"What's the most useless talent you have?",
	"If animals could talk, which would be the rudest?",
	"What would be the worst thing to hear as you're going under anesthesia?",
];

const QUESTION_TIME_LIMIT = 30;
const REVEAL_DURATION = 5;

export interface QuestionAnswerState {
	qaPhase: "lobby" | "question" | "reveal" | "done";
	questionIndex: number;
	totalQuestions: number;
	prompt: string;
	answersJson: string;
	timerRemaining: number;
}

export async function runQuestionAnswer(room: PartyRoomDO): Promise<void> {
	for (let i = 0; i < QUESTIONS.length; i++) {
		const prompt = QUESTIONS[i];

		await room.updateSharedData({
			qaPhase: "question",
			questionIndex: i,
			totalQuestions: QUESTIONS.length,
			prompt,
			answersJson: "[]",
			timerRemaining: QUESTION_TIME_LIMIT,
		});
		await room.setPhase("playing");

		const responses = await room.requestInput(`question-${i}`, {
			type: "text",
			prompt,
			timeLimit: QUESTION_TIME_LIMIT,
		});

		const answers: Array<{ playerName: string; answer: string }> = [];
		for (const [, response] of responses) {
			answers.push({
				playerName: String(response.playerId),
				answer: String(response.value ?? ""),
			});
		}

		await room.updateSharedData({
			qaPhase: "reveal",
			questionIndex: i,
			totalQuestions: QUESTIONS.length,
			prompt,
			answersJson: JSON.stringify(answers),
			timerRemaining: 0,
		});

		await delay(REVEAL_DURATION * 1000);
	}

	await room.updateSharedData({
		qaPhase: "done",
		totalQuestions: QUESTIONS.length,
		questionIndex: QUESTIONS.length,
		prompt: "Game Over!",
		answersJson: "[]",
		timerRemaining: 0,
	});
	await room.setPhase("ended");
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
