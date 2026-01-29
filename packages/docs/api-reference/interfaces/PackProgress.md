[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackProgress

# Interface: PackProgress

Defined in: [types/LevelPack.ts:264](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L264)

Player's overall progress within a pack.

## Properties

### packId

> **packId**: `string`

Defined in: [types/LevelPack.ts:266](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L266)

Pack identifier

***

### completedLevelIds

> **completedLevelIds**: `string`[]

Defined in: [types/LevelPack.ts:268](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L268)

Levels completed

***

### currentLevelId?

> `optional` **currentLevelId**: `string`

Defined in: [types/LevelPack.ts:270](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L270)

Current level being played

***

### totalStars

> **totalStars**: `number`

Defined in: [types/LevelPack.ts:272](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L272)

Total stars earned

***

### maxStars

> **maxStars**: `number`

Defined in: [types/LevelPack.ts:274](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L274)

Maximum possible stars

***

### progressPercent

> **progressPercent**: `number`

Defined in: [types/LevelPack.ts:276](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L276)

Overall progress percentage

***

### levelProgress

> **levelProgress**: `Record`\<`string`, [`PackLevelProgress`](PackLevelProgress.md)\>

Defined in: [types/LevelPack.ts:278](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L278)

Detailed level progress

***

### updatedAt

> **updatedAt**: `number`

Defined in: [types/LevelPack.ts:280](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L280)

Last update timestamp
