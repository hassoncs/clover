[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / UnlockProgressSchema

# Variable: UnlockProgressSchema

> `const` **UnlockProgressSchema**: `ZodObject`\<`object` & `object`, `"strip"`, `ZodTypeAny`, \{ `version`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime`: `number`; `sessionsCompleted`: `number`; `firstPlayedAt?`: `number`; `unlockedItems`: `string`[]; `achievements`: `Record`\<`string`, `boolean`\>; `currency`: `number`; \}, \{ `version?`: `number`; `lastPlayedAt?`: `number`; `totalPlayTime?`: `number`; `sessionsCompleted?`: `number`; `firstPlayedAt?`: `number`; `unlockedItems?`: `string`[]; `achievements?`: `Record`\<`string`, `boolean`\>; `currency?`: `number`; \}\>

Defined in: [types/progress.ts:174](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/progress.ts#L174)

Unlock-based progress schema.
Good for games with unlockable content.
