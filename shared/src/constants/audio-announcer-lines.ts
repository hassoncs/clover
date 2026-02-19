export interface AnnouncerLineDef {
	id: string;
	phase: string;
	text: string;
	brandOverrides?: Record<string, string>;
}

export const ANNOUNCER_LINES: AnnouncerLineDef[] = [
	// Lobby
	{
		id: "lobby-welcome",
		phase: "lobby",
		text: "Welcome, everyone! Let's get this started!",
	},
	{
		id: "lobby-waiting",
		phase: "lobby",
		text: "Waiting for more players to join...",
	},
	{
		id: "lobby-ready",
		phase: "lobby",
		text: "Looking good! Ready when you are.",
	},
	// Rounds
	{ id: "round-1", phase: "round", text: "Round one!" },
	{ id: "round-2", phase: "round", text: "Round two!" },
	{ id: "round-3", phase: "round", text: "Round three!" },
	{ id: "round-final", phase: "round", text: "Final round!" },
	{ id: "here-we-go", phase: "round", text: "Here we go!" },
	// Answering
	{
		id: "time-to-write",
		phase: "answering",
		text: "Time to write your answers!",
	},
	{ id: "get-creative", phase: "answering", text: "Get creative!" },
	// Voting
	{ id: "time-to-vote", phase: "voting", text: "Time to vote!" },
	{ id: "pick-favorite", phase: "voting", text: "Which one's your favorite?" },
	{ id: "choose-wisely", phase: "voting", text: "Choose wisely!" },
	// Reveal
	{ id: "and-the-answers", phase: "reveal", text: "And the answers are..." },
	{ id: "lets-see", phase: "reveal", text: "Let's see what you came up with!" },
	{ id: "drumroll-please", phase: "reveal", text: "Drumroll please..." },
	{ id: "the-truth-was", phase: "reveal", text: "The truth was..." },
	// Scores
	{ id: "check-scores", phase: "scores", text: "Let's check the scores!" },
	{ id: "standings", phase: "scores", text: "Here's where things stand." },
	// Winner
	{ id: "and-the-winner", phase: "winner", text: "And the winner is..." },
	{ id: "congrats", phase: "winner", text: "Congratulations!" },
	{ id: "what-a-game", phase: "winner", text: "What a game!" },
	// Amen Podium
	{
		id: "amen-podium-winner",
		phase: "winner",
		text: "Well done, good and faithful servant!",
	},
	// Timer
	{ id: "ten-seconds", phase: "timer", text: "Ten seconds left!" },
	{ id: "five-seconds", phase: "timer", text: "Five seconds!" },
	{ id: "times-up", phase: "timer", text: "Time's up!" },
];
