[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / HighScoreProgressSchema

# Variable: HighScoreProgressSchema

> `const` **HighScoreProgressSchema**: `ZodObject`\<`object` & `object`, `"strip"`, `ZodTypeAny`, \{ `version`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime`: `number`; `sessionsCompleted`: `number`; `firstPlayedAt?`: `number`; `highScore`: `number`; `gamesPlayed`: `number`; \}, \{ `version?`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime?`: `number`; `sessionsCompleted?`: `number`; `firstPlayedAt?`: `number`; `highScore?`: `number`; `gamesPlayed?`: `number`; \}\>

Defined in: [types/progress.ts:151](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L151)

Simple high-score only progress schema.
Good for arcade-style games.
