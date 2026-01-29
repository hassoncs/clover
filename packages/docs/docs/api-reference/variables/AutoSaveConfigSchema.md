[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AutoSaveConfigSchema

# Variable: AutoSaveConfigSchema

> `const` **AutoSaveConfigSchema**: `ZodObject`\<\{ `onLevelComplete`: `ZodOptional`\<`ZodBoolean`\>; `onGameWin`: `ZodOptional`\<`ZodBoolean`\>; `onGameLose`: `ZodOptional`\<`ZodBoolean`\>; `interval`: `ZodOptional`\<`ZodNumber`\>; `onBackground`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `onLevelComplete?`: `boolean`; `onGameWin?`: `boolean`; `onGameLose?`: `boolean`; `interval?`: `number`; `onBackground`: `boolean`; \}, \{ `onLevelComplete?`: `boolean`; `onGameWin?`: `boolean`; `onGameLose?`: `boolean`; `interval?`: `number`; `onBackground?`: `boolean`; \}\>

Defined in: [types/progress.ts:44](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L44)

Configuration for when to automatically save progress.
