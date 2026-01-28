[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameOverrides

# Interface: GameOverrides

Defined in: [types/LevelDefinition.ts:130](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L130)

Game-specific overrides for the level.
Use namespaced keys to avoid collisions between games.

## Example

```typescript
{
  overrides: {
    slopeggle: {
      pegRows: 15,
      orangePegCount: 12,
      hasBucket: true,
      hasPortals: false
    },
    pinball: {
      bumpers: 5,
      slingshots: 2
    }
  }
}
```

## Indexable

\[`gameId`: `string`\]: `Record`\<`string`, `unknown`\> \| [`SlopeggleLevelOverrides`](SlopeggleLevelOverrides.md) \| [`PinballLevelOverrides`](PinballLevelOverrides.md) \| `undefined`

Future games: add their overrides here - key is game ID, value is game-specific config

## Properties

### slopeggle?

> `optional` **slopeggle**: [`SlopeggleLevelOverrides`](SlopeggleLevelOverrides.md)

Defined in: [types/LevelDefinition.ts:132](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L132)

Slopeggle-specific level parameters

***

### pinball?

> `optional` **pinball**: [`PinballLevelOverrides`](PinballLevelOverrides.md)

Defined in: [types/LevelDefinition.ts:134](https://github.com/hassoncs/clover/blob/a677c79c452668dbf385acb885ffb0d8e3b3e3d8/shared/src/types/LevelDefinition.ts#L134)

Pinball-specific level parameters
