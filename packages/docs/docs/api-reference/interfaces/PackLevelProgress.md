[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackLevelProgress

# Interface: PackLevelProgress

Defined in: [types/LevelPack.ts:246](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L246)

Level progression status within a pack.

## Properties

### levelIdentity

> **levelIdentity**: `string`

Defined in: [types/LevelPack.ts:248](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L248)

Level identity: `${packId}:${levelId}`

***

### isCompleted

> **isCompleted**: `boolean`

Defined in: [types/LevelPack.ts:250](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L250)

Whether the level has been completed

***

### highScore?

> `optional` **highScore**: `number`

Defined in: [types/LevelPack.ts:252](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L252)

Best score achieved

***

### stars?

> `optional` **stars**: `number`

Defined in: [types/LevelPack.ts:254](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L254)

Stars earned (0-3)

***

### attemptCount?

> `optional` **attemptCount**: `number`

Defined in: [types/LevelPack.ts:256](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L256)

Number of attempts

***

### lastPlayedAt?

> `optional` **lastPlayedAt**: `number`

Defined in: [types/LevelPack.ts:258](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelPack.ts#L258)

Last played timestamp
