[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackProgression

# Interface: PackProgression

Defined in: [types/LevelPack.ts:130](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L130)

Progression rules for the pack.
Defines how players unlock and progress through levels.

## Properties

### mode

> **mode**: `"linear"` \| `"branching"` \| `"freeform"`

Defined in: [types/LevelPack.ts:132](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L132)

Progression mode

***

### unlockAfterCompleted?

> `optional` **unlockAfterCompleted**: `string`[]

Defined in: [types/LevelPack.ts:134](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L134)

Required levels to unlock the next level (for linear mode)

***

### prerequisites?

> `optional` **prerequisites**: `string`[]

Defined in: [types/LevelPack.ts:136](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L136)

Levels that must be completed to unlock this pack (prerequisites)

***

### unlockThreshold?

> `optional` **unlockThreshold**: `number`

Defined in: [types/LevelPack.ts:138](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L138)

Stars or points required to unlock (for branching mode)

***

### isReleased?

> `optional` **isReleased**: `boolean`

Defined in: [types/LevelPack.ts:140](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L140)

Whether the pack is currently available

***

### releaseDate?

> `optional` **releaseDate**: `number`

Defined in: [types/LevelPack.ts:142](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L142)

Release date for time-gated packs
