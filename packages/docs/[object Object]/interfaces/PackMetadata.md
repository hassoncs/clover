[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackMetadata

# Interface: PackMetadata

Defined in: [types/LevelPack.ts:81](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L81)

Pack metadata - descriptive information about the pack.

## Properties

### id

> **id**: `string`

Defined in: [types/LevelPack.ts:83](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L83)

Globally unique pack identifier (e.g., "slopeggle-basic-v1")

***

### name

> **name**: `string`

Defined in: [types/LevelPack.ts:85](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L85)

Human-readable pack name

***

### description?

> `optional` **description**: `string`

Defined in: [types/LevelPack.ts:87](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L87)

Brief description of the pack

***

### author?

> `optional` **author**: `string`

Defined in: [types/LevelPack.ts:89](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L89)

Author or creator name

***

### version

> **version**: `string`

Defined in: [types/LevelPack.ts:91](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L91)

Pack version following semver

***

### category?

> `optional` **category**: [`PackCategory`](../type-aliases/PackCategory.md)

Defined in: [types/LevelPack.ts:93](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L93)

Category for UI organization

***

### thumbnailUrl?

> `optional` **thumbnailUrl**: `string`

Defined in: [types/LevelPack.ts:95](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L95)

Thumbnail image URL or asset reference

***

### thumbnailAssetRef?

> `optional` **thumbnailAssetRef**: `string`

Defined in: [types/LevelPack.ts:96](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L96)

***

### platforms?

> `optional` **platforms**: [`PlatformTarget`](../type-aliases/PlatformTarget.md)[]

Defined in: [types/LevelPack.ts:98](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L98)

Target platforms

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [types/LevelPack.ts:100](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L100)

Tags for discovery

***

### createdAt?

> `optional` **createdAt**: `number`

Defined in: [types/LevelPack.ts:102](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L102)

Creation timestamp

***

### updatedAt?

> `optional` **updatedAt**: `number`

Defined in: [types/LevelPack.ts:104](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L104)

Last update timestamp
