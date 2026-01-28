[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LevelDifficultyParams

# Interface: LevelDifficultyParams

Defined in: [types/LevelDefinition.ts:49](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L49)

Optional difficulty parameters that generators can use.
These are hints/suggestions - generators may interpret them flexibly.

## Properties

### targetTier?

> `optional` **targetTier**: [`DifficultyTier`](../type-aliases/DifficultyTier.md)

Defined in: [types/LevelDefinition.ts:51](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L51)

Target difficulty tier (suggestion to generator)

***

### minScoreThreshold?

> `optional` **minScoreThreshold**: `number`

Defined in: [types/LevelDefinition.ts:53](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L53)

Minimum score threshold for completion

***

### maxScoreThreshold?

> `optional` **maxScoreThreshold**: `number`

Defined in: [types/LevelDefinition.ts:55](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L55)

Maximum score threshold for completion

***

### estimatedDurationSeconds?

> `optional` **estimatedDurationSeconds**: `number`

Defined in: [types/LevelDefinition.ts:57](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L57)

Estimated time to complete in seconds

***

### initialLives?

> `optional` **initialLives**: `number`

Defined in: [types/LevelDefinition.ts:59](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L59)

Number of lives/balls player starts with

***

### initialMultiplier?

> `optional` **initialMultiplier**: `number`

Defined in: [types/LevelDefinition.ts:61](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L61)

Score multiplier at start

***

### difficultyCurve?

> `optional` **difficultyCurve**: `"constant"` \| `"progressive"` \| `"spike"`

Defined in: [types/LevelDefinition.ts:63](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L63)

Difficulty curve within the level (progressive, constant, spike)
