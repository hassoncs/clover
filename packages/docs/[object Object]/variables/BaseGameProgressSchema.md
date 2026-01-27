[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / BaseGameProgressSchema

# Variable: BaseGameProgressSchema

> `const` **BaseGameProgressSchema**: `ZodObject`\<\{ `version`: `ZodDefault`\<`ZodNumber`\>; `lastPlayedAt`: `ZodOptional`\<`ZodNumber`\>; `totalPlayTime`: `ZodDefault`\<`ZodNumber`\>; `sessionsCompleted`: `ZodDefault`\<`ZodNumber`\>; `firstPlayedAt`: `ZodOptional`\<`ZodNumber`\>; \}, `"strip"`, `ZodTypeAny`, \{ `version`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime`: `number`; `sessionsCompleted`: `number`; `firstPlayedAt?`: `number`; \}, \{ `version?`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime?`: `number`; `sessionsCompleted?`: `number`; `firstPlayedAt?`: `number`; \}\>

Defined in: types/progress.ts:18

Base progress schema that all game progress schemas should extend.
Provides common metadata fields for tracking play history.
