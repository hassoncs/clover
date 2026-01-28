[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PackGameConfig

# Interface: PackGameConfig

Defined in: [types/LevelPack.ts:175](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L175)

Base game configuration shared by all levels in the pack.
This contains the stable GameDefinition that doesn't change per level.

## Example

```typescript
{
  baseGameDefinition: {
    metadata: { id: "slopeggle", title: "Slopeggle", ... },
    world: { gravity: { x: 0, y: -5 }, pixelsPerMeter: 50, ... },
    templates: { ball: {...}, cannon: {...}, ... },
    rules: [...]
  }
}
```

## Properties

### baseGameDefinition?

> `optional` **baseGameDefinition**: `Record`\<`string`, `unknown`\>

Defined in: [types/LevelPack.ts:177](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L177)

Base game definition shared across all levels

***

### fixedTemplateIds?

> `optional` **fixedTemplateIds**: `string`[]

Defined in: [types/LevelPack.ts:179](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L179)

Template IDs that are fixed across all levels

***

### variableTemplateIds?

> `optional` **variableTemplateIds**: `string`[]

Defined in: [types/LevelPack.ts:181](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L181)

Template IDs that vary per level (generated/overridden)

***

### fixedEntityIds?

> `optional` **fixedEntityIds**: `string`[]

Defined in: [types/LevelPack.ts:183](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L183)

Shared entities that exist in every level

***

### variableEntityIds?

> `optional` **variableEntityIds**: `string`[]

Defined in: [types/LevelPack.ts:185](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelPack.ts#L185)

Entity IDs that are level-specific
