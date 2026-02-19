export const SLOPCADE_GAME_IDS = [
	"s-quiplash",
	"s-half-and-half",
	"s-about-you-bluff",
	"s-role-replay",
	"s-ruin-and-redeem",
	"s-chain-reaction",
	"s-quickfire-qa",
	"s-truth-trap",
	"s-year-jinx",
	"s-drawful-animate",
	"s-sketch-bluff",
	"s-consensus-mine",
	"s-heads-up",
] as const;

export type SlopcadeGameId = (typeof SLOPCADE_GAME_IDS)[number];

export interface SlopcadeGameAssetPrompt {
	gameId: SlopcadeGameId;
	displayName: string;
	artDirection: string;
	tilePrompt: string;
	heroPrompt: string;
	panelPrompts: [string, string, string, string];
	voiceoverScript: string;
}

const BASE_STYLE =
	"neon arcade party aesthetic, slime green and hot pink and electric blue glow, dark background, CRT scanline texture, pixel-art accents, sticker-bomb energy, chaotic but readable composition, high contrast, no text, no letters, no watermark";

export const SLOPCADE_GAME_ASSET_PROMPTS: Record<
	SlopcadeGameId,
	SlopcadeGameAssetPrompt
> = {
	"s-quiplash": {
		gameId: "s-quiplash",
		displayName: "Slop Drop",
		artDirection:
			"Neon-lit game show stage, speech bubbles with blanks, glowing answer cards, CRT monitor vibes",
		tilePrompt: `Square game tile illustration for "Slop Drop". Neon game show stage with glowing blank speech bubbles hovering above buzzing answer cards, spotlight beams cutting through arcade smoke, audience silhouettes cheering. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Slop Drop". Sprawling retro game show set bathed in hot-pink and electric-blue neon, oversized glowing fill-in-the-blank cards floating across a dark stage, crowd silhouettes raising answer paddles under a strobing scoreboard. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Slop Drop": a fill-in-the-blank prompt explodes onto a giant CRT screen in an arcade hall while players look up from glowing phones. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Slop Drop": players privately type wild answers on neon-rimmed phones, pixelated thought bubbles swirling above. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Slop Drop": anonymous answer cards cascade across the main screen in a sticker-bomb explosion while the crowd debates. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Slop Drop": winning answer card erupts in slime-green fireworks as score counters tick upward on an electric scoreboard. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Slop Drop! A fill-in-the-blank prompt will blast onto the big screen for everyone to see. Type the funniest answer you can think of on your phone. When everyone is done, all answers are revealed and the room votes for their favorite. The most popular answer wins the round, and the highest total score wins the game!",
	},
	"s-half-and-half": {
		gameId: "s-half-and-half",
		displayName: "Face Off",
		artDirection:
			"Split-screen neon arena, two glowing podiums, versus symbol, crowd holding signs, electric energy",
		tilePrompt: `Square game tile illustration for "Face Off". Split neon arena with two crackling podiums on opposite sides, a massive electric-blue VS symbol blazing between them, pixelated crowd waving glowing signs. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Face Off". Cinematic head-to-head showdown stage bisected by a lightning-bolt divider, left side hot-pink and right side slime-green neon, two glowing answer cards facing each other like boxing champions, packed crowd erupting. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Face Off": a fill-in-the-blank prompt appears and two players are secretly matched in a glowing bracket on the main screen. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Face Off": paired rivals type their answers on neon phones, pixelated sweat droplets of concentration. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Face Off": two answers appear side by side like dueling cards while the audience votes with glowing thumbs up icons. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Face Off": matchup winner's card explodes in hot-pink confetti as score bars shoot upward on the leaderboard. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Face Off! A prompt appears, and two players are secretly matched to face each other. Each of them writes their best answer on their phone. Their answers appear side by side, and everyone else votes for the stronger one. Win your matchup to earn points, and top the scoreboard to claim the final victory!",
	},
	"s-about-you-bluff": {
		gameId: "s-about-you-bluff",
		displayName: "Cap or Fact?",
		artDirection:
			"Detective noir but neon, magnifying glass over glowing cards, suspicious characters, lie detector vibes",
		tilePrompt: `Square game tile illustration for "Cap or Fact?". Neon-drenched detective scene with a glowing magnifying glass hovering over a stack of flickering story cards, electric lie-detector needle swinging in the background, suspicious silhouettes. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Cap or Fact?". Retro interrogation room bathed in hot-pink neon, multiple glowing story cards spread on a table under a swinging CRT lamp, shifty player silhouettes pointing at each other, lie-detector monitor flatlining. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Cap or Fact?": one player steps into a neon spotlight as their story prompt glows on screen while the group leans in suspiciously. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Cap or Fact?": other players frantically type convincing bluff stories on pixelated phones, question marks swirling. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Cap or Fact?": all story cards fan out like a poker hand on the main screen, players pointing at suspects. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Cap or Fact?": truth card flips with an electric reveal, points rain down for successful bluffs and sharp detectives. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Cap or Fact? One player shares a story, and the room must decide if it is true or made up. Everyone else writes believable bluff stories to mix in with the real one. Then all stories are revealed, and players vote for what they think is true. You score by fooling others with your bluff or by spotting the real testimony!",
	},
	"s-role-replay": {
		gameId: "s-role-replay",
		displayName: "Main Character Energy",
		artDirection:
			"Spotlight on stage, character silhouettes in dramatic poses, streaming overlay aesthetic, arcade marquee",
		tilePrompt: `Square game tile illustration for "Main Character Energy". Dramatic stage spotlight cutting through neon haze, a bold character silhouette striking a hero pose beneath a glowing arcade marquee, streaming overlay UI frames in the corners. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Main Character Energy". Sweeping concert-stage panorama in electric blue and hot pink, multiple character silhouettes in dramatic roleplay poses across a smoke-filled arena, neon scenario cards dropping from the rafters like confetti. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Main Character Energy": a neon scenario card drops onto the main screen assigning each player a character role with a glowing icon. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Main Character Energy": players write their in-character responses on glowing phones, thought bubbles showing dramatic inner monologue. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Main Character Energy": responses appear on screen in streaming-overlay chat style, crowd reacting with neon emoji explosions. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Main Character Energy": best performance card blazes gold as applause meter fills and points stack on the arcade scoreboard. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Main Character Energy! You will receive a scenario and a character role to embody. Write how that character would respond in the most dramatic, on-brand way possible. Everyone's responses are revealed, and the room votes for the one that best captures the energy. Creative and committed answers earn the most points!",
	},
	"s-ruin-and-redeem": {
		gameId: "s-ruin-and-redeem",
		displayName: "Wreck & Rescue",
		artDirection:
			"Split wrecking-ball destruction on one side, golden repair gleaming on the other, dramatic contrast",
		tilePrompt: `Square game tile illustration for "Wreck & Rescue". Dramatic split composition: left side a neon wrecking ball smashing through pixelated blocks in hot pink, right side glowing golden reconstruction rising in electric blue, chaotic beauty in the middle. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Wreck & Rescue". Three-act panorama flowing left to right: a solid answer card, a chaotic sabotage explosion in slime-green, and a brilliant rebuilt answer glowing gold, crowd cheering on both ends. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Wreck & Rescue": one player types a strong answer on a glowing phone while a mischievous player icon lurks with a pixelated wrecking ball. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Wreck & Rescue": the ruiner gleefully transforms the answer into chaotic nonsense, sparks and glitch effects flying. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Wreck & Rescue": a third player receives the wrecked answer and frantically types a redemption on their neon phone. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Wreck & Rescue": audience votes between ruiner and redeemer as the scoreboard explodes with neon fireworks for the winner. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Wreck and Rescue! First, one player writes a solid answer to the prompt. Then a second player ruins it on purpose for maximum chaos. A third player gets the chance to redeem that mess into something great again. The room votes for the better outcome, and points go to either the ruiner or the redeemer!",
	},
	"s-chain-reaction": {
		gameId: "s-chain-reaction",
		displayName: "Brain Worm",
		artDirection:
			"Neural network visualization, glowing connecting nodes, brain with lightning bolts, neon chain links",
		tilePrompt: `Square game tile illustration for "Brain Worm". Glowing neon brain at center with electric-blue neural pathways branching outward like chain links, each node pulsing with a different hot-pink word bubble, slime-green sparks at every connection. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Brain Worm". Panoramic neural network sprawl across a dark background, interlocking neon chain links connecting glowing word cards in a cascading reaction, lightning arcing between nodes as the word chain grows. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Brain Worm": a starting word blazes onto the main CRT screen and players ready their association words on neon phones. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Brain Worm": each submitted word snaps into the chain like a neon link locking into place with a spark animation. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Brain Worm": players guess which words their friends will choose next, prediction cards glowing in anticipation. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Brain Worm": matched connections light up the chain in a cascade of neon and the scoreboard tallies the longest linked streak. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Brain Worm! A starting word appears, and everyone writes their first association. Those answers connect into a chain that keeps growing each turn. Try to predict your friends' links to earn matching points. The player with the strongest chain connections wins the round and chases the overall crown!",
	},
	"s-quickfire-qa": {
		gameId: "s-quickfire-qa",
		displayName: "Speed Round",
		artDirection:
			"Trivia arena with countdown timer, glowing buzzer buttons, rapid-fire question cards flying through neon air",
		tilePrompt: `Square game tile illustration for "Speed Round". Exploding trivia arena with question cards flying at warp speed, a giant glowing countdown timer at center, pixelated buzzer buttons flashing hot-pink and electric-blue, scoreboard digits blurring. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Speed Round". Frantic quiz-show battlefield with question cards raining from the top of the screen like an arcade shooter, players' neon phones raised like buzzers, a massive timer ticking in the background. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Speed Round": rapid-fire questions explode onto the main screen one after another with a shrinking time bar underneath. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Speed Round": players mash glowing buzzer buttons on phones, pixel-art sweat flying from frantic fingers. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Speed Round": correct answer flashes slime-green with a score multiplier boost, wrong answer glitches red. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Speed Round": final scoreboard crowns the fastest accurate player with a neon trophy and cascading point explosions. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Speed Round! Questions will come fast, so stay alert and keep your thumb ready. Buzz in quickly when you know the answer on your phone. Correct answers earn points, and faster answers are worth even more. Build your lead across the round to become the ultimate trivia speedrunner!",
	},
	"s-truth-trap": {
		gameId: "s-truth-trap",
		displayName: "Trust Issues",
		artDirection:
			"Neon poker table with face-down cards, one glowing truth card, suspicious eyes in the dark",
		tilePrompt: `Square game tile illustration for "Trust Issues". Dark neon poker table littered with face-down bluff cards, one card glowing electric blue as the hidden truth, suspicious pixel eyes peering from the shadows around the table edge. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Trust Issues". Cinematic overhead view of a neon-lit poker table, a single blazing truth card surrounded by convincing bluff cards, silhouetted players leaning in with magnifying glasses and suspicious squints. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Trust Issues": a wild fact blazes onto the CRT screen and players study it with suspicious pixelated expressions. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Trust Issues": each player types a convincing fake answer on glowing phones, devious grins animated in neon. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Trust Issues": all answers including the real one fan out like poker cards on the main screen for voting. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Trust Issues": truth card flips with electric drama, points cascade for sharp detectives and successful deceivers. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Trust Issues! You'll see a surprising fact with one real answer hiding among many bluffs. Write a believable fake answer to fool your friends. Then all options are revealed, and everyone votes for the one they think is true. Score points for spotting truth and for every player your bluff deceives!",
	},
	"s-year-jinx": {
		gameId: "s-year-jinx",
		displayName: "All In",
		artDirection:
			"Casino slot machine energy, poker chips stacking, big neon numbers, risk meter going wild",
		tilePrompt: `Square game tile illustration for "All In". Neon casino chaos with towering pixel-art poker chip stacks, a glowing slot machine reel spinning numbers, a hot-pink risk meter buried in the red, electric-blue jackpot lights flashing. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "All In". Sweeping casino floor panorama in neon, players silhouetted at glowing betting tables with giant floating numbers above each head, a massive risk meter spanning the background, coins exploding from a jackpot shower. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "All In": a numerical estimation question blazes on screen with an infinite number line glowing beneath it. ${BASE_STYLE}`,
			`Tutorial panel 2 for "All In": players type their best guess and then wager virtual neon chips on their own confidence level. ${BASE_STYLE}`,
			`Tutorial panel 3 for "All In": guesses are revealed in order along the number line, closest answer glowing slime-green. ${BASE_STYLE}`,
			`Tutorial panel 4 for "All In": wager chips transfer to winners as the scoreboard erupts in jackpot coin animations and neon fireworks. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to All In! A numerical question will appear and you need to estimate the answer as closely as possible. After guessing, wager your chips on how confident you feel. The closer your answer, the more you win. Bet big and guess well to dominate the leaderboard!",
	},
	"s-drawful-animate": {
		gameId: "s-drawful-animate",
		displayName: "Doodle Chaos",
		artDirection:
			"Art canvas with chaotic neon drawings, paint splatters in electric colors, pixelated pencil and eraser tools",
		tilePrompt: `Square game tile illustration for "Doodle Chaos". Neon-splattered digital canvas covered in frantic pixel-art doodles, electric-blue paint splashes and hot-pink scribbles bursting outward, a giant pixelated pencil mid-stroke, chaotic and joyful. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Doodle Chaos". Panoramic digital art studio gone wild with neon, canvases floating at every angle covered in glitchy animated drawings, paint buckets overflowing electric colors, player silhouettes frantically sketching on glowing tablets. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Doodle Chaos": a secret drawing prompt appears only on the artist's neon phone screen, other players see a blank glowing canvas. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Doodle Chaos": the artist draws their pixelated masterpiece using neon tools while the timer counts down in hot pink. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Doodle Chaos": the chaotic doodle is revealed to the group on the main screen, wild guesses pop up as floating text bubbles. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Doodle Chaos": correct guesses earn points for both guesser and artist, best guesser score highlighted with slime-green sparkle. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Doodle Chaos! One player gets a secret prompt and has to draw it while everyone else guesses. Use every pixel-art tool at your disposal to make your masterpiece clear, or at least recognizable. The room tries to guess what you drew, and both the artist and correct guessers earn points. Most points at the end wins!",
	},
	"s-sketch-bluff": {
		gameId: "s-sketch-bluff",
		displayName: "Fake Art",
		artDirection:
			"Neon art gallery with ridiculous paintings, monocle-wearing pixel critic, pretentious vibes gone chaotic",
		tilePrompt: `Square game tile illustration for "Fake Art". Glowing neon gallery with outrageous pixel-art paintings on the walls, a monocle-wearing pixelated art critic gesturing dramatically, electric spotlights illuminating the most absurd canvas. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Fake Art". Neon-drenched gallery opening night, walls lined with bizarre glowing artworks, silhouetted critics dramatically pointing and debating, one painting pulsing with electric light as the centerpiece. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Fake Art": a drawing appears on the main screen and players see only a blank canvas ready for title-making on their phones. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Fake Art": players invent ridiculous or convincing titles for the mystery artwork, typing on glowing neon phones. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Fake Art": all invented titles appear in gallery placard style beneath the artwork while players vote for the real one. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Fake Art": the real title flashes electric blue as points explode for players whose fake titles tricked the crowd. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Fake Art! A drawing appears and you need to invent the most convincing title for it. The real title is hidden among all the fake ones, and you need to fool others into voting for yours. Score points when players pick your fake title, and score for finding the real one. The biggest bluffer wins!",
	},
	"s-consensus-mine": {
		gameId: "s-consensus-mine",
		displayName: "Hivemind",
		artDirection:
			"Hexagonal hive pattern in neon, connected mind nodes pulsing, group think consensus meter, bee swarm energy",
		tilePrompt: `Square game tile illustration for "Hivemind". Neon hexagonal hive grid with pulsing electric-blue nodes at each intersection, a slime-green consensus meter at center filling up, pixel-art bee icons swarming in formation, collective energy buzzing. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "Hivemind". Sweeping panoramic hive network with glowing hexagons extending to the horizon, multiple answer nodes lighting up in synchronized waves, a massive hot-pink consensus meter in the foreground, players silhouetted as part of the hive. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "Hivemind": a ranking prompt appears on the main screen showing multiple options to be ordered on glowing neon phones. ${BASE_STYLE}`,
			`Tutorial panel 2 for "Hivemind": players rank the options by dragging neon cards into their preferred order, hexagonal patterns swirling. ${BASE_STYLE}`,
			`Tutorial panel 3 for "Hivemind": all rankings are overlaid on screen and the consensus ranking emerges in slime-green as agreements light up. ${BASE_STYLE}`,
			`Tutorial panel 4 for "Hivemind": points awarded based on how closely each player matched the group consensus, hive meter maxing out in celebration. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to Hivemind! You will rank a list of options in what you think the group consensus will be. The goal is not to pick your personal favorites but to predict how the whole room will vote. Score points for every choice that matches the group ranking. Think like a hivemind and climb to the top!",
	},
	"s-heads-up": {
		gameId: "s-heads-up",
		displayName: "On My Head",
		artDirection:
			"Question mark floating above a head, speech bubble clues raining down, neon timer ticking urgently",
		tilePrompt: `Square game tile illustration for "On My Head". Neon silhouette of a player holding their phone up to their forehead, a giant glowing question mark hovering above, electric speech bubbles raining clues from above against a dark arcade background. ${BASE_STYLE}`,
		heroPrompt: `Wide cinematic banner for "On My Head". Panoramic scene of multiple player silhouettes with glowing phones held to their foreheads, giant question marks and neon clue speech bubbles filling the air above them, hot-pink countdown timer blazing at the top. ${BASE_STYLE}`,
		panelPrompts: [
			`Tutorial panel 1 for "On My Head": a secret word blazes on the main screen but not on the guessing player's phone held to their forehead. ${BASE_STYLE}`,
			`Tutorial panel 2 for "On My Head": teammates frantically shout clues represented as exploding neon speech bubbles pointing toward the mystery word. ${BASE_STYLE}`,
			`Tutorial panel 3 for "On My Head": the guessing player reads clue fragments on their phone screen and tilts to guess, hot-pink timer draining. ${BASE_STYLE}`,
			`Tutorial panel 4 for "On My Head": correct guess triggers an electric celebration with the word revealed and points raining down on the whole team. ${BASE_STYLE}`,
		],
		voiceoverScript:
			"Welcome to On My Head! Hold your phone to your forehead and let your team give you clues about the secret word on the screen. You can not see the word, so listen closely and make your best guess before the timer runs out. Correct guesses earn points for you and your team. Most points across all rounds wins!",
	},
};

export const SLOPCADE_AVATAR_ICON_PROMPTS = {
	controller: `Simple icon avatar of a game controller in neon arcade style, electric blue glow, pixel-art accents, centered, transparent-friendly edges, no text, no watermark.`,
	pixelHeart: `Simple icon avatar of a pixel-art heart in neon arcade style, hot pink glow, chunky 8-bit pixels, centered, transparent-friendly edges, no text, no watermark.`,
	skull: `Simple icon avatar of a skull in neon arcade style, slime green glow, pixel-art details, punk energy, centered, transparent-friendly edges, no text, no watermark.`,
	lightning: `Simple icon avatar of a lightning bolt in neon arcade style, electric yellow and blue glow, pixel-art crispness, centered, transparent-friendly edges, no text, no watermark.`,
	cat: `Simple icon avatar of an internet cat face in neon arcade style, hot pink outline with electric blue accents, meme-energy expression, centered, transparent-friendly edges, no text, no watermark.`,
	pizza: `Simple icon avatar of a pizza slice in neon arcade style, slime green and hot pink glow, chunky pixel-art toppings, centered, transparent-friendly edges, no text, no watermark.`,
	rocket: `Simple icon avatar of a rocket ship in neon arcade style, electric blue exhaust trail, pixel-art silhouette, blasting upward, centered, transparent-friendly edges, no text, no watermark.`,
	diamond: `Simple icon avatar of a gem diamond in neon arcade style, electric blue and hot pink facets glowing, pixel-art crystal cuts, centered, transparent-friendly edges, no text, no watermark.`,
} as const;

export type SlopcadeAvatarType = keyof typeof SLOPCADE_AVATAR_ICON_PROMPTS;
