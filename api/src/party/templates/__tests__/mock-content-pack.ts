import { vi } from "vitest";

const mockContentPackByType: Record<string, unknown[]> = {
	quip: [
		{
			id: "q1",
			text: "Prompt",
			category: "general",
			template: "Why did the [BLANK] cross the road?",
			blankPosition: 0,
		},
	],
	trivia: [
		{
			id: "t1",
			question: "Question?",
			correctAnswer: "Answer",
			incorrectAnswers: ["A", "B", "C"],
			category: "general",
		},
	],
	drawing: [{ id: "d1", prompt: "Draw this", category: "general" }],
	dilemma: [{ id: "wyr1", optionA: "A", optionB: "B", category: "general" }],
	wyr: [{ id: "wyr1", optionA: "A", optionB: "B", category: "general" }],
	estimation: [
		{ id: "e1", question: "How many?", answer: 1, category: "general" },
	],
	fibbage: [{ id: "f1", question: "Q", answer: "A", category: "general" }],
	caption: [
		{
			id: "c1",
			imageUrl: "https://example.com/image.png",
			category: "general",
		},
	],
	wordgame: [
		{
			id: "wg1",
			type: "rhyme",
			prompt: "Test",
			category: "general",
		},
	],
	wordlist: [{ id: "wl1", word: "alpha", category: "general" }],
	personal: [{ id: "p1", text: "Personal prompt", category: "general" }],
	FakeWord: [{ id: "fw1", word: "florp", phonetic: "florp" }],
	ranking: [{ id: "r1", topic: "Topic", items: ["a", "b", "c"] }],
	headsup: [{ id: "h1", name: "Deck", words: ["alpha", "beta", "gamma"] }],
	chroma: [{ id: "ch1", clues: ["clue"], bannedColorNames: ["red"] }],
};

vi.mock("../../content/prompt-loader", () => ({
	loadContentPackFromDB: vi.fn((type: string) => {
		return mockContentPackByType[type] ?? mockContentPackByType.quip;
	}),
}));
