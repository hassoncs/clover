const SHARED_PHASE_DEFAULTS = {
    lobby: { soundId: "lobby-chill", loop: true },
    answering: { soundId: "thinking-light", loop: true },
    drawing: { soundId: "thinking-light", loop: true },
    drafting: { soundId: "thinking-light", loop: true },
    reveal: { soundId: "reveal-drama", loop: false },
    voting: { soundId: "voting-groove", loop: true },
    round_results: { soundId: "scores-celebration", loop: true },
    scores: { soundId: "scores-celebration", loop: true },
    winner: { soundId: "winner-glory", loop: false },
};
const AMEN_CONFIG = {
    phaseDefaults: {
        lobby: { soundId: "lobby-chill", loop: true },
        answering: { soundId: "thinking-light", loop: true },
        drawing: { soundId: "thinking-light", loop: true },
        drafting: { soundId: "thinking-light", loop: true },
        reveal: { soundId: "reveal-drama", loop: false },
        voting: { soundId: "voting-groove", loop: true },
        round_results: { soundId: "scores-celebration", loop: true },
        scores: { soundId: "scores-celebration", loop: true },
        winner: { soundId: "winner-glory", loop: false },
    },
    gameOverrides: {
        quiplash: {
            answering: { soundId: "quiplash-gameplay", loop: true },
        },
        "half-and-half": {
            answering: { soundId: "half-and-half-gameplay", loop: true },
        },
        "about-you-bluff": {
            answering: { soundId: "about-you-bluff-gameplay", loop: true },
        },
        "role-replay": {
            answering: { soundId: "role-replay-gameplay", loop: true },
        },
        "ruin-and-redeem": {
            answering: { soundId: "ruin-and-redeem-gameplay", loop: true },
        },
        "chain-reaction": {
            answering: { soundId: "chain-reaction-gameplay", loop: true },
        },
        "quickfire-qa": {
            answering: { soundId: "quickfire-qa-gameplay", loop: true },
        },
        "truth-trap": {
            answering: { soundId: "truth-trap-gameplay", loop: true },
        },
        "year-jinx": {
            answering: { soundId: "year-jinx-gameplay", loop: true },
        },
        "drawful-animate": {
            answering: { soundId: "drawful-animate-gameplay", loop: true },
            drawing: { soundId: "drawful-animate-gameplay", loop: true },
        },
        "sketch-bluff": {
            answering: { soundId: "sketch-bluff-gameplay", loop: true },
            drawing: { soundId: "sketch-bluff-gameplay", loop: true },
        },
        "consensus-mine": {
            answering: { soundId: "consensus-mine-gameplay", loop: true },
        },
        "heads-up": {
            answering: { soundId: "headsup-gameplay", loop: true },
        },
    },
};
const BRAND_CONFIGS = {
    amen: AMEN_CONFIG,
};
export function getMusicForPhase(brand, gameTemplate, phase) {
    const brandConfig = BRAND_CONFIGS[brand];
    if (brandConfig) {
        const gamePhaseMap = brandConfig.gameOverrides[gameTemplate];
        if (gamePhaseMap?.[phase]) {
            return gamePhaseMap[phase];
        }
        if (brandConfig.phaseDefaults[phase]) {
            return brandConfig.phaseDefaults[phase];
        }
    }
    return SHARED_PHASE_DEFAULTS[phase] ?? null;
}
export function getAllSoundIdsForGame(brand, gameTemplate) {
    const ids = new Set();
    for (const config of Object.values(SHARED_PHASE_DEFAULTS)) {
        ids.add(config.soundId);
    }
    const brandConfig = BRAND_CONFIGS[brand];
    if (brandConfig) {
        for (const config of Object.values(brandConfig.phaseDefaults)) {
            ids.add(config.soundId);
        }
        const gamePhaseMap = brandConfig.gameOverrides[gameTemplate];
        if (gamePhaseMap) {
            for (const config of Object.values(gamePhaseMap)) {
                ids.add(config.soundId);
            }
        }
    }
    return Array.from(ids);
}
export function getSoundFileUrl(soundId, brand) {
    const brandPath = `audio/music/${brand}/${soundId}.mp3`;
    const sharedPath = `audio/music/shared/${soundId}.mp3`;
    const BRAND_SOUND_IDS = {
        amen: new Set([
            "lobby-chill",
            "lobby-hype",
            "winner-glory",
            "quiplash-gameplay",
            "half-and-half-gameplay",
            "about-you-bluff-gameplay",
            "role-replay-gameplay",
            "ruin-and-redeem-gameplay",
            "chain-reaction-gameplay",
            "quickfire-qa-gameplay",
            "truth-trap-gameplay",
            "year-jinx-gameplay",
            "drawful-animate-gameplay",
            "sketch-bluff-gameplay",
            "consensus-mine-gameplay",
            "headsup-gameplay",
        ]),
    };
    const brandSounds = BRAND_SOUND_IDS[brand];
    if (brandSounds?.has(soundId)) {
        return brandPath;
    }
    return sharedPath;
}
export function getSfxFileUrl(soundId) {
    return `audio/sfx/shared/${soundId}.mp3`;
}
//# sourceMappingURL=audio-phase-music.js.map