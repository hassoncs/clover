[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / SpawnOnEventBehaviorSchema

# Variable: SpawnOnEventBehaviorSchema

> `const` **SpawnOnEventBehaviorSchema**: `ZodObject`\<`object` & `object`, `"strip"`, `ZodTypeAny`, \{ `enabled?`: `boolean`; `type`: `"spawn_on_event"`; `event`: `"tap"` \| `"timer"` \| `"collision"` \| `"destroy"` \| `"start"`; `entityTemplate`: `string` \| `string`[]; `spawnPosition`: `"at_self"` \| `"at_touch"` \| `"random_in_bounds"` \| `"offset"`; `offset?`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \} \| \{ `x`: `number`; `y`: `number`; \}; `bounds?`: \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}; `interval?`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `maxSpawns?`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `initialVelocity?`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \} \| \{ `x`: `number`; `y`: `number`; \}; `withTags?`: `string`[]; \}, \{ `enabled?`: `boolean`; `type`: `"spawn_on_event"`; `event`: `"tap"` \| `"timer"` \| `"collision"` \| `"destroy"` \| `"start"`; `entityTemplate`: `string` \| `string`[]; `spawnPosition`: `"at_self"` \| `"at_touch"` \| `"random_in_bounds"` \| `"offset"`; `offset?`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \} \| \{ `x`: `number`; `y`: `number`; \}; `bounds?`: \{ `minX`: `number`; `maxX`: `number`; `minY`: `number`; `maxY`: `number`; \}; `interval?`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `maxSpawns?`: `number` \| \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \}; `initialVelocity?`: \{ `expr`: `string`; `debugName?`: `string`; `cache?`: `"none"` \| `"frame"`; \} \| \{ `x`: `number`; `y`: `number`; \}; `withTags?`: `string`[]; \}\>

Defined in: [types/schemas.ts:128](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/schemas.ts#L128)
