[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LevelProgressSchema

# Variable: LevelProgressSchema

> `const` **LevelProgressSchema**: `ZodObject`\<`object` & `object`, `"strip"`, `ZodTypeAny`, \{ `version`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime`: `number`; `sessionsCompleted`: `number`; `firstPlayedAt?`: `number`; `currentLevel`: `number`; `highestLevelCompleted`: `number`; `levelAttempts`: `Record`\<`string`, `number`\>; \}, \{ `version?`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime?`: `number`; `sessionsCompleted?`: `number`; `firstPlayedAt?`: `number`; `currentLevel?`: `number`; `highestLevelCompleted?`: `number`; `levelAttempts?`: `Record`\<`string`, `number`\>; \}\>

Defined in: types/progress.ts:162

Level-based progress schema.
Good for puzzle games with level progression.
