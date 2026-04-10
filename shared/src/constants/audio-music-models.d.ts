export interface MusicModelDef {
    id: string;
    name: string;
    scenarioModelId: string;
    maxDurationSeconds: number;
    supportsLyrics: boolean;
    supportsNegativePrompt: boolean;
    description: string;
}
export declare const MUSIC_MODELS: Record<string, MusicModelDef>;
export declare const DEFAULT_MUSIC_MODEL = "beatoven";
//# sourceMappingURL=audio-music-models.d.ts.map