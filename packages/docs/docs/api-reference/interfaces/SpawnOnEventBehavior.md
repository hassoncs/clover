[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SpawnOnEventBehavior

# Interface: SpawnOnEventBehavior

Defined in: [types/behavior.ts:65](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L65)

## Extends

- `BaseBehavior`

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/behavior.ts:46](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L46)

#### Inherited from

`BaseBehavior.enabled`

***

### type

> **type**: `"spawn_on_event"`

Defined in: [types/behavior.ts:66](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L66)

#### Overrides

`BaseBehavior.type`

***

### event

> **event**: [`SpawnEvent`](../type-aliases/SpawnEvent.md)

Defined in: [types/behavior.ts:67](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L67)

***

### entityTemplate

> **entityTemplate**: `string` \| `string`[]

Defined in: [types/behavior.ts:68](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L68)

***

### spawnPosition

> **spawnPosition**: [`BehaviorSpawnPosition`](../type-aliases/BehaviorSpawnPosition.md)

Defined in: [types/behavior.ts:69](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L69)

***

### offset?

> `optional` **offset**: [`Vec2`](Vec2.md)

Defined in: [types/behavior.ts:70](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L70)

***

### bounds?

> `optional` **bounds**: [`Bounds`](Bounds.md)

Defined in: [types/behavior.ts:71](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L71)

***

### interval?

> `optional` **interval**: `number`

Defined in: [types/behavior.ts:72](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L72)

***

### maxSpawns?

> `optional` **maxSpawns**: `number`

Defined in: [types/behavior.ts:73](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L73)

***

### initialVelocity?

> `optional` **initialVelocity**: [`Vec2`](Vec2.md)

Defined in: [types/behavior.ts:74](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L74)

***

### withTags?

> `optional` **withTags**: `string`[]

Defined in: [types/behavior.ts:75](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L75)

***

### spawnEffect?

> `optional` **spawnEffect**: [`ParticleEmitterType`](../type-aliases/ParticleEmitterType.md)

Defined in: [types/behavior.ts:76](https://github.com/hassoncs/clover/blob/4fd406b0597c61e88b1324c5a31ce13307db5f2a/shared/src/types/behavior.ts#L76)
