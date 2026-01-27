[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / PersistenceConfig

# Interface: PersistenceConfig\<T\>

Defined in: types/progress.ts:85

Persistence configuration for a game.
Games add this to their GameDefinition to opt-in to persistence.

## Example

```typescript
const game: GameDefinition = {
  metadata: { id: "my-game", title: "My Game", version: "1.0.0" },
  persistence: {
    schema: MyGameProgressSchema,
    version: 1,
    defaultProgress: { currentLevel: 1, highScore: 0 },
    autoSave: { onLevelComplete: true },
  },
  // ... rest of game definition
};
```

## Type Parameters

### T

`T` = `unknown`

## Properties

### storageKey?

> `optional` **storageKey**: `string`

Defined in: types/progress.ts:87

Storage key (defaults to game metadata id)

***

### schema

> **schema**: `ZodType`\<`T`\>

Defined in: types/progress.ts:90

Zod schema for validation

***

### defaultProgress

> **defaultProgress**: `T`

Defined in: types/progress.ts:93

Default progress state for new players

***

### version

> **version**: `number`

Defined in: types/progress.ts:96

Schema version for migrations

***

### autoSave?

> `optional` **autoSave**: `object`

Defined in: types/progress.ts:99

Auto-save triggers

#### onLevelComplete?

> `optional` **onLevelComplete**: `boolean`

Save when player completes a level

#### onGameWin?

> `optional` **onGameWin**: `boolean`

Save when player wins the game

#### onGameLose?

> `optional` **onGameLose**: `boolean`

Save when player loses

#### interval?

> `optional` **interval**: `number`

Auto-save interval in milliseconds (0 to disable)

#### onBackground

> **onBackground**: `boolean`

Save when app goes to background
