export const AMEN_GAME_IDS = [
	"quiplash",
	"half-and-half",
	"about-you-bluff",
	"role-replay",
	"ruin-and-redeem",
	"chain-reaction",
	"quickfire-qa",
	"truth-trap",
	"drawful-animate",
] as const;

export type AmenGameId = (typeof AMEN_GAME_IDS)[number];

export interface AmenGameAssetPrompt {
	gameId: AmenGameId;
	displayName: string;
	artDirection: string;
	tilePrompt: string;
	heroPrompt: string;
	panelPrompts: [string, string, string, string];
	voiceoverScript: string;
}

const BASE_STYLE =
	"illuminated manuscript and stained-glass look, warm church palette, rich gold leaf accents, hand-painted texture, reverent and joyful, no modern objects, no text, no letters, no watermark";

export const AMEN_GAME_ASSET_PROMPTS: Record<AmenGameId, AmenGameAssetPrompt> =
	{
		quiplash: {
			gameId: "quiplash",
			displayName: "The Fellowship Table",
			artDirection:
				"Warm communal table, candles, illuminated manuscript borders",
			tilePrompt: `Square game tile illustration for "The Fellowship Table". Cozy wooden fellowship table with laughing friends gathered around parchment cards, beeswax candles glowing, ornate border filigree. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "The Fellowship Table". Long table feast in a candlelit hall, joyful expressions, layered depth with foreground candles and background arches. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "The Fellowship Table": a fill-in-the-blank prompt appears on a large church hall screen while players look up from their phones. ${BASE_STYLE}`,
				`Tutorial panel 2 for "The Fellowship Table": players privately writing funny clean answers on their phones around a table with parchment motifs. ${BASE_STYLE}`,
				`Tutorial panel 3 for "The Fellowship Table": multiple anonymous answers displayed as cards, crowd discussing and voting with raised hands. ${BASE_STYLE}`,
				`Tutorial panel 4 for "The Fellowship Table": winning answer card highlighted with celebratory glow while score tokens are awarded. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to The Fellowship Table! A fill-in-the-blank prompt will appear on the big screen for everyone to see. Write the funniest clean answer you can think of on your phone. When everyone is done, all answers are revealed and the room votes for their favorite. The most popular answer wins the round, and the highest total score wins the game!",
		},
		"half-and-half": {
			gameId: "half-and-half",
			displayName: "The Mediator",
			artDirection: "Scales of justice and dove, Byzantine mosaic style",
			tilePrompt: `Square game tile illustration for "The Mediator". Golden scales of justice balanced beneath a descending dove, mosaic tesserae texture, radiant halo framing. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "The Mediator". Two answer scrolls face off on opposing scales while a dove hovers above, crowd in a basilica voting. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "The Mediator": a fill-in-the-blank prompt appears and two players are secretly paired in a head-to-head matchup. ${BASE_STYLE}`,
				`Tutorial panel 2 for "The Mediator": paired players each write their best answer on phones with focused expressions. ${BASE_STYLE}`,
				`Tutorial panel 3 for "The Mediator": two revealed answers side by side like scales while the audience votes. ${BASE_STYLE}`,
				`Tutorial panel 4 for "The Mediator": matchup winner receives points as scales tip and score markers rise. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to The Mediator! A prompt appears, and two players are secretly matched to face each other. Each of them writes their best answer on their phone. Their answers appear side by side, and everyone else votes for the stronger one. Win your matchup to earn points, and top the scoreboard to claim the final victory!",
		},
		"about-you-bluff": {
			gameId: "about-you-bluff",
			displayName: "Testimony or Tale?",
			artDirection: "Scroll unrolling, courtroom and testimony setting",
			tilePrompt: `Square game tile illustration for "Testimony or Tale?". Ancient scroll unfurling before a small court bench, lantern light and wax seals, mystery and warmth. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "Testimony or Tale?". Storyteller at center, multiple sealed scrolls laid out as possible stories, attentive audience discerning truth. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "Testimony or Tale?": one player presents a story while the group wonders whether it is true testimony or invention. ${BASE_STYLE}`,
				`Tutorial panel 2 for "Testimony or Tale?": other players craft believable bluff stories on phones at candlelit desks. ${BASE_STYLE}`,
				`Tutorial panel 3 for "Testimony or Tale?": all stories are displayed as scroll cards while players choose the true one. ${BASE_STYLE}`,
				`Tutorial panel 4 for "Testimony or Tale?": points awarded for fooled players and for correct truth detection, scoreboard updates dramatically. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to Testimony or Tale! One player shares a story, and the room must decide if it is true or made up. Everyone else writes believable bluff stories to mix in with the real one. Then all stories are revealed, and players vote for what they think is true. You score by fooling others with your bluff or by spotting the real testimony!",
		},
		"role-replay": {
			gameId: "role-replay",
			displayName: "Fruits of the Spirit",
			artDirection: "Garden with fruit-bearing vines, stained glass",
			tilePrompt: `Square game tile illustration for "Fruits of the Spirit". Lush garden of vines bearing symbolic fruit around a gentle path, radiant stained-glass sunlight. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "Fruits of the Spirit". Players act out scenarios in a blooming monastery garden with fruit symbols floating as virtues. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "Fruits of the Spirit": each player receives a scenario and a virtue assignment represented by fruit icons. ${BASE_STYLE}`,
				`Tutorial panel 2 for "Fruits of the Spirit": players write responses showing love joy peace patience and other virtues. ${BASE_STYLE}`,
				`Tutorial panel 3 for "Fruits of the Spirit": responses are revealed and the room votes for the most fitting spirit-filled answer. ${BASE_STYLE}`,
				`Tutorial panel 4 for "Fruits of the Spirit": best responses gain points while fruit garlands celebrate creativity and kindness. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to Fruits of the Spirit! You will receive a scenario and a virtue to embody, like love, joy, or patience. Write how someone guided by that virtue would respond. Everyone's responses are revealed, and the room votes for the one that best captures the spirit. Thoughtful and creative answers earn the most points!",
		},
		"ruin-and-redeem": {
			gameId: "ruin-and-redeem",
			displayName: "Grace & Mischief",
			artDirection: "Contrasting scenes showing ruin and redemption",
			tilePrompt: `Square game tile illustration for "Grace & Mischief". Split composition with chaotic scribble on one side and restored golden manuscript on the other, playful but hopeful mood. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "Grace & Mischief". Three-stage scene: good answer, comic sabotage, and brilliant redemption, flowing left to right. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "Grace & Mischief": one player writes a strong answer to a prompt while another prepares to sabotage it. ${BASE_STYLE}`,
				`Tutorial panel 2 for "Grace & Mischief": the answer is intentionally ruined with humorous mischief. ${BASE_STYLE}`,
				`Tutorial panel 3 for "Grace & Mischief": a third player attempts to redeem the ruined answer into something excellent. ${BASE_STYLE}`,
				`Tutorial panel 4 for "Grace & Mischief": audience decides between ruiner and redeemer, and points go to the chosen side. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to Grace and Mischief! First, one player writes a solid answer to the prompt. Then a second player ruins it on purpose for maximum chaos. A third player gets the chance to redeem that mess into something great again. The room votes for the better outcome, and points go to either the ruiner or the redeemer!",
		},
		"chain-reaction": {
			gameId: "chain-reaction",
			displayName: "The Word Chain",
			artDirection: "Chain links with scripture styling and calligraphy",
			tilePrompt: `Square game tile illustration for "The Word Chain". Interlocking golden chain links weaving through calligraphic ribbons and illuminated initials. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "The Word Chain". Word cards connect like a glowing chain across a parchment river, players predicting next links. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "The Word Chain": a starting word appears and players prepare their first association. ${BASE_STYLE}`,
				`Tutorial panel 2 for "The Word Chain": each response feeds the next to build an evolving chain of connected words. ${BASE_STYLE}`,
				`Tutorial panel 3 for "The Word Chain": players guess what links their friends will choose for match points. ${BASE_STYLE}`,
				`Tutorial panel 4 for "The Word Chain": successful connections extend the longest chain and raise scores. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to The Word Chain! A starting word appears, and everyone writes their first association. Those answers connect into a chain that keeps growing each turn. Try to predict your friends' links to earn matching points. The player with the strongest chain connections wins the round and chases the overall crown!",
		},
		"quickfire-qa": {
			gameId: "quickfire-qa",
			displayName: "The Great Hall of Wisdom",
			artDirection: "Cathedral hall, lectern, quiz bowl atmosphere",
			tilePrompt: `Square game tile illustration for "The Great Hall of Wisdom". Grand hall with lectern, ringing bell, and glowing question tablets under vaulted arches. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "The Great Hall of Wisdom". Rapid trivia challenge in a cathedral quiz arena with players racing to answer. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "The Great Hall of Wisdom": rapid biblical and general knowledge questions appear one after another. ${BASE_STYLE}`,
				`Tutorial panel 2 for "The Great Hall of Wisdom": players buzz in quickly from phones to answer first. ${BASE_STYLE}`,
				`Tutorial panel 3 for "The Great Hall of Wisdom": fast correct answers gain extra points while wrong answers penalize. ${BASE_STYLE}`,
				`Tutorial panel 4 for "The Great Hall of Wisdom": scoreboard crowns the highest total as hall champion. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to The Great Hall of Wisdom! Questions will come fast, so stay alert and keep your thumb ready. Buzz in quickly when you know the answer on your phone. Correct answers earn points, and faster answers are worth even more. Build your lead across the round to become champion of the hall!",
		},
		"truth-trap": {
			gameId: "truth-trap",
			displayName: "Scrolls of Truth",
			artDirection: "Ancient scrolls, wax seals, lantern light",
			tilePrompt: `Square game tile illustration for "Scrolls of Truth". Cluster of sealed scrolls and one glowing true scroll on a wooden table, lantern-lit mystery. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "Scrolls of Truth". Players craft bluffs around one hidden truth scroll while lanterns cast dramatic light. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "Scrolls of Truth": an obscure fact appears and players study it for clues. ${BASE_STYLE}`,
				`Tutorial panel 2 for "Scrolls of Truth": each player writes a convincing bluff answer to fool others. ${BASE_STYLE}`,
				`Tutorial panel 3 for "Scrolls of Truth": all answers including the real one are revealed as scroll cards for voting. ${BASE_STYLE}`,
				`Tutorial panel 4 for "Scrolls of Truth": points awarded for discerning truth and for successful bluffs that trick friends. ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to Scrolls of Truth! You'll see a surprising fact with one real answer hiding among many bluffs. Write a believable fake answer to fool your friends. Then all options are revealed, and everyone votes for the one they think is true. Score points for spotting truth and for every player your bluff deceives!",
		},
		"drawful-animate": {
			gameId: "drawful-animate",
			displayName: "Illustrated Scripture",
			artDirection: "Quill sketches, moving parchment, illuminated animation",
			tilePrompt: `Square game tile illustration for "Illustrated Scripture". A quill pen animating a living sketch on glowing parchment. ${BASE_STYLE}`,
			heroPrompt: `Wide cinematic banner for "Illustrated Scripture". Scribes gather around a large moving scroll, laughing at the funny animations. ${BASE_STYLE}`,
			panelPrompts: [
				`Tutorial panel 1 for "Illustrated Scripture": draw two frames of an action to make an animation. ${BASE_STYLE}`,
				`Tutorial panel 2 for "Illustrated Scripture": write a fake title to trick the other players. ${BASE_STYLE}`,
				`Tutorial panel 3 for "Illustrated Scripture": everyone votes on what they think the real title is. ${BASE_STYLE}`,
				`Tutorial panel 4 for "Illustrated Scripture": earn points when people guess the right title, or when they fall for your bluff! ${BASE_STYLE}`,
			],
			voiceoverScript:
				"Welcome to Illustrated Scripture! You'll receive a prompt and must draw two frames to create a looping animation. Then, everyone watches the masterpiece and writes a fake title to trick the room. Vote for the real title to score points, and earn bonuses when players fall for your clever bluffs!",
		},
	};

export const AMEN_AVATAR_ICON_PROMPTS = {
	dove: `Simple icon avatar of a white dove in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	lamb: `Simple icon avatar of a gentle lamb in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	flame: `Simple icon avatar of a stylized holy flame in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	fish: `Simple icon avatar of an ichthys fish symbol in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	star: `Simple icon avatar of a radiant star in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	scroll: `Simple icon avatar of a rolled scroll with wax seal in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	cross: `Simple icon avatar of a cross icon in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
	bread: `Simple icon avatar of a loaf of bread icon in stained-glass and illuminated manuscript style, centered, transparent-friendly edges, no text, no watermark.`,
} as const;

export type AmenAvatarType = keyof typeof AMEN_AVATAR_ICON_PROMPTS;
