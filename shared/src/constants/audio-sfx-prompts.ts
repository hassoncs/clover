export interface SfxPromptDef {
	id: string;
	prompt: string;
	duration: number;
	promptInfluence?: number;
	tags: string[];
}

export const SFX_PROMPTS: SfxPromptDef[] = [
	// Core UI
	{
		id: "tick",
		prompt: "Short clean UI tick click sound",
		duration: 0.5,
		tags: ["ui"],
	},
	{
		id: "swoosh",
		prompt: "Quick smooth UI swoosh transition",
		duration: 0.5,
		tags: ["ui"],
	},
	{
		id: "submit",
		prompt: "Satisfying paper stamp submit confirmation sound",
		duration: 0.5,
		tags: ["ui"],
	},
	{
		id: "player-join",
		prompt: "Cheerful friendly player join notification pop",
		duration: 0.5,
		tags: ["ui"],
	},
	// Game Feedback
	{
		id: "correct",
		prompt: "Bright happy correct answer chime ding",
		duration: 1.0,
		tags: ["feedback"],
	},
	{
		id: "wrong",
		prompt: "Short buzzer wrong answer sound",
		duration: 0.5,
		tags: ["feedback"],
	},
	{
		id: "vote-cast",
		prompt: "Satisfying vote submission pop click",
		duration: 0.3,
		tags: ["feedback"],
	},
	{
		id: "score-up",
		prompt: "Points scoring ascending chime melody",
		duration: 1.0,
		tags: ["feedback"],
	},
	{
		id: "score-big",
		prompt: "Massive score explosion celebration fanfare",
		duration: 2.0,
		tags: ["feedback"],
	},
	// Transitions
	{
		id: "round-start",
		prompt: "Energetic round starting whoosh with impact",
		duration: 1.0,
		tags: ["transition"],
	},
	{
		id: "round-end",
		prompt: "Clean round ending resolution chord",
		duration: 1.5,
		tags: ["transition"],
	},
	{
		id: "reveal",
		prompt: "Dramatic reveal ta-da fanfare with sparkle",
		duration: 1.5,
		tags: ["transition"],
	},
	{
		id: "drumroll",
		prompt: "Building anticipation snare drumroll",
		duration: 3.0,
		tags: ["transition"],
	},
	// Timer
	{
		id: "countdown-tick",
		prompt: "Clock ticking countdown single tick",
		duration: 1.0,
		tags: ["timer"],
	},
	{
		id: "countdown-final",
		prompt: "Urgent final countdown warning beep",
		duration: 0.5,
		tags: ["timer"],
	},
	{
		id: "timer-up",
		prompt: "Time's up buzzer horn blast",
		duration: 1.0,
		tags: ["timer"],
	},
	// Crowd
	{
		id: "crowd-laugh",
		prompt: "Small group laughter crowd reaction, warm and genuine",
		duration: 2.0,
		tags: ["crowd"],
	},
	{
		id: "crowd-gasp",
		prompt: "Small group surprise gasp oh-no reaction",
		duration: 1.5,
		tags: ["crowd"],
	},
	{
		id: "crowd-cheer",
		prompt: "Small group cheering happy celebration",
		duration: 2.0,
		tags: ["crowd"],
	},
	{
		id: "winner-fanfare",
		prompt: "Grand victory champion fanfare with confetti celebration",
		duration: 3.0,
		tags: ["crowd"],
	},
];
