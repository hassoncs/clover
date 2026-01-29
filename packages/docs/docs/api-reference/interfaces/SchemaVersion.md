[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SchemaVersion

# Interface: SchemaVersion

Defined in: [types/LevelDefinition.ts:101](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L101)

Core schema versioning and compatibility.

## Properties

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/LevelDefinition.ts:103](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L103)

Major version - increment on breaking changes

***

### minCompatibleVersion?

> `optional` **minCompatibleVersion**: `number`

Defined in: [types/LevelDefinition.ts:105](https://github.com/hassoncs/clover/blob/cee41593876c0ca0fbde75075f3d9c52884dee1e/shared/src/types/LevelDefinition.ts#L105)

Minimum compatible schema major version for parsing
