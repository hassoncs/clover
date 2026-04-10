const NO_VOCALS = "vocals, singing, humming, voice, speech, lyrics, words";
export const MUSIC_PROMPTS = [
    // ---------------------------------------------------------------
    // Shared phase music (any brand) — 30s loops
    // ---------------------------------------------------------------
    {
        id: "lobby-chill",
        prompt: "Upbeat cheerful acoustic lounge music, warm friendly gathering vibe, soft guitar and light percussion, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["lobby"],
    },
    {
        id: "lobby-hype",
        prompt: "Building excitement party music, upbeat electronic with claps and snaps, getting-started energy, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["lobby"],
    },
    {
        id: "thinking-light",
        prompt: "Light playful thinking music, gentle piano with soft synth pads, quiz show background, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["gameplay"],
    },
    {
        id: "thinking-pressure",
        prompt: "Tense ticking clock quiz show music, building urgency, dramatic strings with light percussion, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["gameplay"],
    },
    {
        id: "voting-groove",
        prompt: "Fun funky voting music, light disco groove, playful bass line, game show anticipation vibe, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["gameplay"],
    },
    {
        id: "reveal-drama",
        prompt: "Dramatic reveal music, building suspense with cinematic tension resolving to surprise, short stinger, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["reveal"],
    },
    {
        id: "scores-celebration",
        prompt: "Celebratory results music, triumphant brass and upbeat rhythm, game show scoreboard energy, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["results"],
    },
    {
        id: "winner-glory",
        prompt: "Grand champion victory fanfare, epic triumphant brass transitioning to warm celebration, short and impactful, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        tags: ["results"],
    },
    // ---------------------------------------------------------------
    // Amen brand — shared phase overrides
    // ---------------------------------------------------------------
    {
        id: "lobby-chill",
        prompt: "Warm acoustic fellowship gathering music, gentle fingerpicked guitar and soft piano, coffee shop worship night vibe, welcoming and joyful, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["lobby"],
    },
    {
        id: "lobby-hype",
        prompt: "Uplifting building excitement music, bright acoustic strumming with claps and tambourine, church game night energy about to start, loopable, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["lobby"],
    },
    {
        id: "winner-glory",
        prompt: "Joyful triumphant celebration fanfare, uplifting brass and bright acoustic guitar, hallelujah victory energy, short and impactful, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["results"],
    },
    // ---------------------------------------------------------------
    // Amen brand — per-game gameplay music (30s loopable)
    //
    // Each game gets a unique track that matches the personality of
    // its mechanic and social dynamic. Plays during the main phase.
    // ---------------------------------------------------------------
    {
        id: "quiplash-gameplay",
        prompt: "Playful warm acoustic jam session, light fingerpicked guitar with soft bongos and gentle bass, friends hanging out writing jokes together, relaxed social energy, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "quiplash"],
    },
    {
        id: "half-and-half-gameplay",
        prompt: "Smooth contemplative jazz piano with soft brushed drums, thoughtful deliberation mood, balanced and diplomatic energy, gentle walking bass, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "half-and-half"],
    },
    {
        id: "about-you-bluff-gameplay",
        prompt: "Soft mysterious plucked strings with gentle muted trumpet, curious detective investigation mood, playful suspense, who is telling the truth energy, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "about-you-bluff"],
    },
    {
        id: "role-replay-gameplay",
        prompt: "Whimsical theatrical music with playful woodwinds and pizzicato strings, gentle flute melody, stage performance energy, characters coming to life, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "role-replay"],
    },
    {
        id: "ruin-and-redeem-gameplay",
        prompt: "Mischievous sneaky music with playful staccato piano and muted trumpet, light trickster energy, cheeky impish groove with a warm undertone, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "ruin-and-redeem"],
    },
    {
        id: "chain-reaction-gameplay",
        prompt: "Quick rhythmic percussion with bright marimba and snappy finger snaps, think-fast momentum, chain-link energy building forward, tight and bouncy groove, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "chain-reaction"],
    },
    {
        id: "quickfire-qa-gameplay",
        prompt: "Bright upbeat quiz show music with confident brass stabs and driving rhythm section, intellectual game show energy, fast-paced knowledge challenge, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "quickfire-qa"],
    },
    {
        id: "truth-trap-gameplay",
        prompt: "Ancient atmospheric music with soft dulcimer and gentle ambient pads, scholarly mystery, uncovering hidden knowledge from old scrolls, Middle Eastern influenced, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "truth-trap"],
    },
    {
        id: "year-jinx-gameplay",
        prompt: "Suave jazzy music with confident walking bass and brushed drums, muted trumpet and smooth piano, charming high-stakes betting energy, bold and sophisticated, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "year-jinx"],
    },
    {
        id: "drawful-animate-gameplay",
        prompt: "Light airy creative studio music with gentle marimba and soft bells, artistic inspiration flowing, calm focused creativity with a touch of wonder, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "drawful-animate"],
    },
    {
        id: "sketch-bluff-gameplay",
        prompt: "Breezy casual music with soft ukulele and light finger snaps, happy sketching energy, relaxed creative fun with a gentle bounce, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "sketch-bluff"],
    },
    {
        id: "consensus-mine-gameplay",
        prompt: "Gentle regal chamber music with soft harp arpeggios and warm cello, wise council deliberation, thoughtful communal gathering energy, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "consensus-mine"],
    },
    {
        id: "headsup-gameplay",
        prompt: "Exciting upbeat countdown music with driving percussion and bright energetic bass, race-the-clock adrenaline, building intensity and forward momentum, loopable background music, instrumental only",
        negativePrompt: NO_VOCALS,
        durationMinutes: 0.5,
        brand: "amen",
        tags: ["gameplay", "headsup"],
    },
];
//# sourceMappingURL=audio-music-prompts.js.map