[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LevelDefinition

# Interface: LevelDefinition

Defined in: [types/LevelDefinition.ts:199](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L199)

Level definition overlay for AI-generated levels.

This type describes what varies between levels in a pack.
Shared game configuration (templates, rules, base entities) is
defined at the pack level and merged with level-specific overrides.

## Example

```json
{
  "schemaVersion": 1,
  "packId": "slopeggle-basic",
  "levelId": "1",
  "generatorId": "slopeggle-generator",
  "generatorVersion": "1.0.0",
  "seed": "abc123",
  "difficulty": {
    "targetTier": "easy",
    "initialLives": 10
  }
}
```

## Properties

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/LevelDefinition.ts:201](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L201)

Schema version for compatibility checking

***

### packId

> **packId**: `string`

Defined in: [types/LevelDefinition.ts:203](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L203)

Globally unique pack identifier

***

### levelId

> **levelId**: `string`

Defined in: [types/LevelDefinition.ts:205](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L205)

Level identity within the pack

***

### generatorId

> **generatorId**: `string`

Defined in: [types/LevelDefinition.ts:207](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L207)

Generator provenance

***

### generatorVersion

> **generatorVersion**: `string`

Defined in: [types/LevelDefinition.ts:208](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L208)

***

### seed

> **seed**: `string`

Defined in: [types/LevelDefinition.ts:209](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L209)

***

### title?

> `optional` **title**: `string`

Defined in: [types/LevelDefinition.ts:211](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L211)

Human-readable title

***

### description?

> `optional` **description**: `string`

Defined in: [types/LevelDefinition.ts:213](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L213)

Brief description

***

### difficulty?

> `optional` **difficulty**: [`LevelDifficultyParams`](LevelDifficultyParams.md)

Defined in: [types/LevelDefinition.ts:215](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L215)

Difficulty configuration (optional hints for generator)

***

### ordinal?

> `optional` **ordinal**: `number`

Defined in: [types/LevelDefinition.ts:217](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L217)

Ordinal position in progression (1-indexed)

***

### generatedAt?

> `optional` **generatedAt**: `number`

Defined in: [types/LevelDefinition.ts:219](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L219)

Generation timestamp

***

### generatorParams?

> `optional` **generatorParams**: `Record`\<`string`, `unknown`\>

Defined in: [types/LevelDefinition.ts:221](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L221)

Generator-specific parameters

***

### overrides?

> `optional` **overrides**: [`GameOverrides`](GameOverrides.md)

Defined in: [types/LevelDefinition.ts:223](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L223)

Game-specific overrides (namespaced by game ID)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/LevelDefinition.ts:225](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L225)

Custom metadata not covered by standard fields
