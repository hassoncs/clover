[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParticleEmitterBehavior

# Interface: ParticleEmitterBehavior

Defined in: [types/behavior.ts:206](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L206)

## Extends

- `BaseBehavior`

## Properties

### enabled?

> `optional` **enabled**: `boolean`

Defined in: [types/behavior.ts:46](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L46)

#### Inherited from

`BaseBehavior.enabled`

***

### type

> **type**: `"particle_emitter"`

Defined in: [types/behavior.ts:207](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L207)

#### Overrides

`BaseBehavior.type`

***

### emitterType

> **emitterType**: [`ParticleEmitterType`](../type-aliases/ParticleEmitterType.md)

Defined in: [types/behavior.ts:208](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L208)

***

### offset?

> `optional` **offset**: [`Vec2`](Vec2.md)

Defined in: [types/behavior.ts:209](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L209)

***

### emitWhile?

> `optional` **emitWhile**: `"always"` \| `"moving"` \| `"enabled"`

Defined in: [types/behavior.ts:210](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/behavior.ts#L210)
