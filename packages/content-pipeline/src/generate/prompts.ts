export const GAME_TYPE_PROMPTS: Record<string, string> = {
	quip: `Generate fill-in-the-blank comedy prompts for a party game.
Each prompt should be funny, open-ended, and suitable for ages 8-14.
Avoid: violence, romance, politics, copyrighted characters.

Output JSON array format:
[{"text": "The worst name for a pet: _____", "category": "animals"}]

Generate 10 prompts across categories: animals, food, technology, workplace, absurd.`,

	trivia: `Generate trivia questions with multiple choice answers for a party game.
Each question should be interesting, educational, and suitable for ages 8-14.
Avoid: violence, romance, politics, copyrighted characters.

Output JSON array format:
[{
  "question": "What is the largest planet in our solar system?",
  "answers": ["Jupiter", "Saturn", "Earth", "Mars"],
  "correctIndex": 0,
  "category": "science"
}]

Generate 10 questions across categories: science, history, geography, animals, pop culture.`,

	drawing: `Generate drawing prompts for a party game where players draw and others guess.
Each prompt should be a simple noun or phrase that's fun to draw and suitable for ages 8-14.
Avoid: violence, romance, politics, copyrighted characters.

Output JSON array format:
[{"text": "A confused penguin", "difficulty": "medium", "category": "animals"}]

Generate 10 prompts across categories: animals, objects, actions, food, fantasy.
Include difficulty levels: easy, medium, hard.`,

	wyr: `Generate "Would You Rather" questions for a party game.
Each question should present two silly or interesting choices suitable for ages 8-14.
Avoid: violence, romance, politics, copyrighted characters.

Output JSON array format:
[{
  "optionA": "Have the ability to fly",
  "optionB": "Have the ability to become invisible",
  "category": "superpowers"
}]

Generate 10 questions across categories: superpowers, food, animals, abilities, silly scenarios.`,

	estimation: `Generate estimation questions for a party game where players guess numbers.
Each question should have a surprising or interesting answer suitable for ages 8-14.
Avoid: violence, romance, politics, copyrighted characters.

Output JSON array format:
[{
  "question": "How many teeth does an adult human have?",
  "answer": 32,
  "unit": "teeth",
  "category": "human body"
}]

Generate 10 questions across categories: animals, geography, human body, food, technology.
Include the unit of measurement for each answer.`,
};
