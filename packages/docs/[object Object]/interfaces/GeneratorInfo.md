[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GeneratorInfo

# Interface: GeneratorInfo

Defined in: [types/LevelDefinition.ts:85](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L85)

Generator provenance tracking.
Enables reproducibility and debugging of AI-generated levels.

## Properties

### generatorId

> **generatorId**: `string`

Defined in: [types/LevelDefinition.ts:87](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L87)

Identifier of the generator that created this level

***

### generatorVersion

> **generatorVersion**: `string`

Defined in: [types/LevelDefinition.ts:89](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L89)

Semantic version of the generator

***

### seed

> **seed**: `string`

Defined in: [types/LevelDefinition.ts:91](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L91)

Seed used for deterministic generation

***

### generatedAt?

> `optional` **generatedAt**: `number`

Defined in: [types/LevelDefinition.ts:93](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L93)

Timestamp of generation (Unix epoch milliseconds)

***

### generatorParams?

> `optional` **generatorParams**: `Record`\<`string`, `unknown`\>

Defined in: [types/LevelDefinition.ts:95](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L95)

Generator-specific parameters used
