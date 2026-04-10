export interface PhaseMusicConfig {
    soundId: string;
    loop: boolean;
}
export declare function getMusicForPhase(brand: string, gameTemplate: string, phase: string): PhaseMusicConfig | null;
export declare function getAllSoundIdsForGame(brand: string, gameTemplate: string): string[];
export declare function getSoundFileUrl(soundId: string, brand: string): string;
export declare function getSfxFileUrl(soundId: string): string;
//# sourceMappingURL=audio-phase-music.d.ts.map