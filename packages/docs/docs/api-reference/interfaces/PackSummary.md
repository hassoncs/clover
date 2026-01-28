[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackSummary

# Interface: PackSummary

Defined in: [types/LevelPack.ts:219](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L219)

Summary view of a pack (for listing/selection UIs).
Contains essential info without the full level list.

## Properties

### id

> **id**: `string`

Defined in: [types/LevelPack.ts:221](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L221)

Pack identifier

***

### name

> **name**: `string`

Defined in: [types/LevelPack.ts:223](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L223)

Human-readable name

***

### description?

> `optional` **description**: `string`

Defined in: [types/LevelPack.ts:225](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L225)

Brief description

***

### version

> **version**: `string`

Defined in: [types/LevelPack.ts:227](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L227)

Pack version

***

### category?

> `optional` **category**: [`PackCategory`](../type-aliases/PackCategory.md)

Defined in: [types/LevelPack.ts:229](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L229)

Category for organization

***

### levelCount

> **levelCount**: `number`

Defined in: [types/LevelPack.ts:231](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L231)

Number of levels

***

### difficultySummary?

> `optional` **difficultySummary**: `string`

Defined in: [types/LevelPack.ts:233](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L233)

Difficulty distribution summary

***

### thumbnailUrl?

> `optional` **thumbnailUrl**: `string`

Defined in: [types/LevelPack.ts:235](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L235)

Thumbnail image

***

### thumbnailAssetRef?

> `optional` **thumbnailAssetRef**: `string`

Defined in: [types/LevelPack.ts:236](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L236)

***

### isComplete?

> `optional` **isComplete**: `boolean`

Defined in: [types/LevelPack.ts:238](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L238)

Is the pack complete (all levels unlocked)

***

### progressPercent?

> `optional` **progressPercent**: `number`

Defined in: [types/LevelPack.ts:240](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L240)

Player's progress percentage (0-100)
