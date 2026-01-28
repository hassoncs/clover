[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / UnlockProgressSchema

# Variable: UnlockProgressSchema

> `const` **UnlockProgressSchema**: `ZodObject`\<`object` & `object`, `"strip"`, `ZodTypeAny`, \{ `version`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime`: `number`; `sessionsCompleted`: `number`; `firstPlayedAt?`: `number`; `unlockedItems`: `string`[]; `achievements`: `Record`\<`string`, `boolean`\>; `currency`: `number`; \}, \{ `version?`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime?`: `number`; `sessionsCompleted?`: `number`; `firstPlayedAt?`: `number`; `unlockedItems?`: `string`[]; `achievements?`: `Record`\<`string`, `boolean`\>; `currency?`: `number`; \}\>

Defined in: [types/progress.ts:174](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/progress.ts#L174)

Unlock-based progress schema.
Good for games with unlockable content.
