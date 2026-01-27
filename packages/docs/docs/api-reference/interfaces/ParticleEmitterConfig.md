[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / ParticleEmitterConfig

# Interface: ParticleEmitterConfig

Defined in: [types/particles.ts:52](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L52)

## Properties

### maxParticles

> **maxParticles**: `number`

Defined in: [types/particles.ts:53](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L53)

***

### emissionRate

> **emissionRate**: `number`

Defined in: [types/particles.ts:54](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L54)

***

### burst?

> `optional` **burst**: `object`

Defined in: [types/particles.ts:55](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L55)

#### count

> **count**: `number`

#### cooldown

> **cooldown**: `number`

***

### lifetime

> **lifetime**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:59](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L59)

***

### initialSpeed

> **initialSpeed**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:60](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L60)

***

### initialDirection

> **initialDirection**: `object`

Defined in: [types/particles.ts:61](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L61)

#### minAngle

> **minAngle**: `number`

#### maxAngle

> **maxAngle**: `number`

***

### gravity

> **gravity**: `object`

Defined in: [types/particles.ts:65](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L65)

#### x

> **x**: `number`

#### y

> **y**: `number`

***

### drag?

> `optional` **drag**: `number`

Defined in: [types/particles.ts:66](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L66)

***

### sizeOverLife?

> `optional` **sizeOverLife**: [`Curve`](Curve.md)

Defined in: [types/particles.ts:67](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L67)

***

### opacityOverLife?

> `optional` **opacityOverLife**: [`Curve`](Curve.md)

Defined in: [types/particles.ts:68](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L68)

***

### rotationOverLife?

> `optional` **rotationOverLife**: [`Curve`](Curve.md)

Defined in: [types/particles.ts:69](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L69)

***

### colorOverLife?

> `optional` **colorOverLife**: [`ColorGradient`](ColorGradient.md)

Defined in: [types/particles.ts:70](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L70)

***

### initialSize

> **initialSize**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:71](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L71)

***

### initialOpacity?

> `optional` **initialOpacity**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:72](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L72)

***

### initialRotation?

> `optional` **initialRotation**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:73](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L73)

***

### rotationSpeed?

> `optional` **rotationSpeed**: [`NumberRange`](NumberRange.md)

Defined in: [types/particles.ts:74](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L74)

***

### spawnShape

> **spawnShape**: [`SpawnShape`](../type-aliases/SpawnShape.md)

Defined in: [types/particles.ts:75](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L75)

***

### renderStyle

> **renderStyle**: [`RenderStyle`](../type-aliases/RenderStyle.md)

Defined in: [types/particles.ts:76](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L76)

***

### blendMode?

> `optional` **blendMode**: [`ParticleBlendMode`](../type-aliases/ParticleBlendMode.md)

Defined in: [types/particles.ts:77](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L77)

***

### localSpace?

> `optional` **localSpace**: `boolean`

Defined in: [types/particles.ts:78](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/particles.ts#L78)
