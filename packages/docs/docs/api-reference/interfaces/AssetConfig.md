[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / AssetConfig

# Interface: AssetConfig

Defined in: [types/GameDefinition.ts:135](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L135)

Dual-field image reference for backwards compatibility.

Preferred: set `assetRef` to the asset UUID (R2 key derivation handled elsewhere).
Legacy: set `imageUrl` to a full URL or relative path.

During the migration window, callers may provide either (or both); runtime resolution
will decide precedence.

## Extends

- [`ImageField`](../type-aliases/ImageField.md)

## Properties

### imageUrl?

> `optional` **imageUrl**: `string`

Defined in: [types/GameDefinition.ts:20](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L20)

#### Inherited from

`ImageField.imageUrl`

***

### assetRef?

> `optional` **assetRef**: `string`

Defined in: [types/GameDefinition.ts:21](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L21)

#### Inherited from

`ImageField.assetRef`

***

### source?

> `optional` **source**: [`AssetSource`](../type-aliases/AssetSource.md)

Defined in: [types/GameDefinition.ts:136](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L136)

***

### scale?

> `optional` **scale**: `number`

Defined in: [types/GameDefinition.ts:137](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L137)

***

### offsetX?

> `optional` **offsetX**: `number`

Defined in: [types/GameDefinition.ts:138](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L138)

***

### offsetY?

> `optional` **offsetY**: `number`

Defined in: [types/GameDefinition.ts:139](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L139)

***

### animations?

> `optional` **animations**: `Record`\<`string`, \{ `frames`: `string`[]; `fps`: `number`; `loop?`: `boolean`; \}\>

Defined in: [types/GameDefinition.ts:140](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/GameDefinition.ts#L140)
