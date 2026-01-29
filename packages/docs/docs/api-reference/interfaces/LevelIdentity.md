[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LevelIdentity

# Interface: LevelIdentity

Defined in: [types/LevelDefinition.ts:70](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L70)

Core level identity and generation metadata.
Required fields present in every level definition.

## Properties

### levelId

> **levelId**: `string`

Defined in: [types/LevelDefinition.ts:72](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L72)

Unique level identifier within the pack (e.g., "1", "boss", "bonus")

***

### title?

> `optional` **title**: `string`

Defined in: [types/LevelDefinition.ts:74](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L74)

Human-readable title for the level

***

### description?

> `optional` **description**: `string`

Defined in: [types/LevelDefinition.ts:76](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L76)

Brief description of the level

***

### ordinal?

> `optional` **ordinal**: `number`

Defined in: [types/LevelDefinition.ts:78](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L78)

Ordinal position in the pack (1-indexed)
