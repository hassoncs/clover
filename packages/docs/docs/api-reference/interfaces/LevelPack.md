[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / LevelPack

# Interface: LevelPack

Defined in: [types/LevelPack.ts:196](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L196)

A collection of levels that share common configuration.

The pack serves as the primary unit for:
- Distribution (download/install)
- Progression tracking (unlocks, stars)
- Player engagement (achievements, streaks)

## Properties

### schemaVersion

> **schemaVersion**: `number`

Defined in: [types/LevelPack.ts:198](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L198)

Schema version for pack structure

***

### metadata

> **metadata**: [`PackMetadata`](PackMetadata.md)

Defined in: [types/LevelPack.ts:200](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L200)

Pack metadata

***

### version

> **version**: `string`

Defined in: [types/LevelPack.ts:202](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L202)

Pack version (synced with metadata.version)

***

### gameConfig?

> `optional` **gameConfig**: [`PackGameConfig`](PackGameConfig.md)

Defined in: [types/LevelPack.ts:204](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L204)

Game configuration shared across levels

***

### levels

> **levels**: [`LevelDefinition`](LevelDefinition.md)[]

Defined in: [types/LevelPack.ts:206](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L206)

Array of level definitions

***

### progression?

> `optional` **progression**: [`PackProgression`](PackProgression.md)

Defined in: [types/LevelPack.ts:208](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L208)

Progression and unlock rules

***

### stats?

> `optional` **stats**: [`PackStats`](PackStats.md)

Defined in: [types/LevelPack.ts:210](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L210)

Pack statistics

***

### metadataExtra?

> `optional` **metadataExtra**: `Record`\<`string`, `unknown`\>

Defined in: [types/LevelPack.ts:212](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L212)

Custom metadata
