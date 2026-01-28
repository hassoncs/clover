[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SchemaVersion

# Interface: SchemaVersion

Defined in: [types/LevelDefinition.ts:101](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L101)

Core schema versioning and compatibility.

## Properties

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/LevelDefinition.ts:103](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L103)

Major version - increment on breaking changes

***

### minCompatibleVersion?

> `optional` **minCompatibleVersion**: `number`

Defined in: [types/LevelDefinition.ts:105](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L105)

Minimum compatible schema major version for parsing
