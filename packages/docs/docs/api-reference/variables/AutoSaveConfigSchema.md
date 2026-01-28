[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AutoSaveConfigSchema

# Variable: AutoSaveConfigSchema

> `const` **AutoSaveConfigSchema**: `ZodObject`\<\{ `onLevelComplete`: `ZodOptional`\<`ZodBoolean`\>; `onGameWin`: `ZodOptional`\<`ZodBoolean`\>; `onGameLose`: `ZodOptional`\<`ZodBoolean`\>; `interval`: `ZodOptional`\<`ZodNumber`\>; `onBackground`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `onLevelComplete?`: `boolean`; `onGameWin?`: `boolean`; `onGameLose?`: `boolean`; `interval?`: `number`; `onBackground`: `boolean`; \}, \{ `onLevelComplete?`: `boolean`; `onGameWin?`: `boolean`; `onGameLose?`: `boolean`; `interval?`: `number`; `onBackground?`: `boolean`; \}\>

Defined in: [types/progress.ts:44](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/progress.ts#L44)

Configuration for when to automatically save progress.
