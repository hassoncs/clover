[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ImageField

# Type Alias: ImageField

> **ImageField** = `object`

Defined in: [types/GameDefinition.ts:19](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L19)

Dual-field image reference for backwards compatibility.

Preferred: set `assetRef` to the asset UUID (R2 key derivation handled elsewhere).
Legacy: set `imageUrl` to a full URL or relative path.

During the migration window, callers may provide either (or both); runtime resolution
will decide precedence.

## Extended by

- [`AssetConfig`](../interfaces/AssetConfig.md)
- [`ParallaxLayer`](../interfaces/ParallaxLayer.md)
- [`StaticBackground`](../interfaces/StaticBackground.md)

## Properties

### imageUrl?

> `optional` **imageUrl**: `string`

Defined in: [types/GameDefinition.ts:20](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L20)

***

### assetRef?

> `optional` **assetRef**: `string`

Defined in: [types/GameDefinition.ts:21](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L21)
