[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameDefinition

# Interface: GameDefinition

Defined in: [types/GameDefinition.ts:434](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L434)

## Properties

### metadata

> **metadata**: [`GameMetadata`](GameMetadata.md)

Defined in: [types/GameDefinition.ts:435](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L435)

***

### world

> **world**: [`WorldConfig`](WorldConfig.md)

Defined in: [types/GameDefinition.ts:436](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L436)

***

### presentation?

> `optional` **presentation**: [`PresentationConfig`](PresentationConfig.md)

Defined in: [types/GameDefinition.ts:437](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L437)

***

### camera?

> `optional` **camera**: [`CameraConfig`](CameraConfig.md)

Defined in: [types/GameDefinition.ts:438](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L438)

***

### ui?

> `optional` **ui**: [`UIConfig`](UIConfig.md)

Defined in: [types/GameDefinition.ts:439](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L439)

***

### background?

> `optional` **background**: [`BackgroundConfig`](../type-aliases/BackgroundConfig.md)

Defined in: [types/GameDefinition.ts:440](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L440)

***

### variables?

> `optional` **variables**: `Record`\<`string`, [`GameVariable`](../type-aliases/GameVariable.md)\>

Defined in: [types/GameDefinition.ts:441](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L441)

***

### templates

> **templates**: `Record`\<`string`, [`EntityTemplate`](EntityTemplate.md)\>

Defined in: [types/GameDefinition.ts:442](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L442)

***

### entities

> **entities**: [`GameEntity`](GameEntity.md)[]

Defined in: [types/GameDefinition.ts:443](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L443)

***

### joints?

> `optional` **joints**: [`GameJoint`](../type-aliases/GameJoint.md)[]

Defined in: [types/GameDefinition.ts:444](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L444)

***

### rules?

> `optional` **rules**: [`GameRule`](GameRule.md)[]

Defined in: [types/GameDefinition.ts:445](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L445)

***

### winCondition?

> `optional` **winCondition**: [`WinCondition`](WinCondition.md)

Defined in: [types/GameDefinition.ts:446](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L446)

***

### loseCondition?

> `optional` **loseCondition**: [`LoseCondition`](LoseCondition.md)

Defined in: [types/GameDefinition.ts:447](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L447)

***

### initialLives?

> `optional` **initialLives**: `number`

Defined in: [types/GameDefinition.ts:448](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L448)

***

### initialScore?

> `optional` **initialScore**: `number`

Defined in: [types/GameDefinition.ts:449](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L449)

***

### assetPacks?

> `optional` **assetPacks**: `Record`\<`string`, [`AssetPack`](AssetPack.md)\>

Defined in: [types/GameDefinition.ts:450](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L450)

***

### activeAssetPackId?

> `optional` **activeAssetPackId**: `string`

Defined in: [types/GameDefinition.ts:451](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L451)

***

### assetSystem?

> `optional` **assetSystem**: [`AssetSystemConfig`](AssetSystemConfig.md)

Defined in: [types/GameDefinition.ts:452](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L452)

***

### ~~parallaxConfig?~~

> `optional` **parallaxConfig**: [`ParallaxConfig`](ParallaxConfig.md)

Defined in: [types/GameDefinition.ts:454](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L454)

#### Deprecated

Use background with type: 'parallax' instead

***

### tileSheets?

> `optional` **tileSheets**: [`TileSheet`](TileSheet.md)[]

Defined in: [types/GameDefinition.ts:455](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L455)

***

### tileMaps?

> `optional` **tileMaps**: [`TileMap`](TileMap.md)[]

Defined in: [types/GameDefinition.ts:456](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L456)

***

### multiplayer?

> `optional` **multiplayer**: [`MultiplayerConfig`](MultiplayerConfig.md)

Defined in: [types/GameDefinition.ts:457](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L457)

***

### loadingScreen?

> `optional` **loadingScreen**: [`LoadingScreenConfig`](LoadingScreenConfig.md)

Defined in: [types/GameDefinition.ts:458](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L458)

***

### sounds?

> `optional` **sounds**: `Record`\<`string`, [`SoundAsset`](SoundAsset.md)\>

Defined in: [types/GameDefinition.ts:459](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L459)

***

### input?

> `optional` **input**: [`InputConfig`](InputConfig.md)

Defined in: [types/GameDefinition.ts:460](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L460)

***

### match3?

> `optional` **match3**: [`Match3Config`](Match3Config.md)

Defined in: [types/GameDefinition.ts:461](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L461)

***

### tetris?

> `optional` **tetris**: [`TetrisConfig`](TetrisConfig.md)

Defined in: [types/GameDefinition.ts:462](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L462)

***

### slotMachine?

> `optional` **slotMachine**: [`SlotMachineConfig`](SlotMachineConfig.md)

Defined in: [types/GameDefinition.ts:463](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L463)

***

### stateMachines?

> `optional` **stateMachines**: `StateMachineDefinition`[]

Defined in: [types/GameDefinition.ts:468](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L468)

Game-level state machines for managing game phases, turns, and flow.
Unlike entity-level machines, these have no `owner` field set.

***

### containers?

> `optional` **containers**: [`ContainerConfig`](../type-aliases/ContainerConfig.md)[]

Defined in: [types/GameDefinition.ts:473](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L473)

Container definitions for declarative container-based games (Ball Sort, Connect4, etc.).
Containers track entity membership, validate placements, and compute positions.

***

### persistence?

> `optional` **persistence**: [`PersistenceConfig`](PersistenceConfig.md)\<`unknown`\>

Defined in: [types/GameDefinition.ts:479](https://github.com/hassoncs/clover/blob/2f9210785e99663f02331a1f99376dd2b95d60e1/shared/src/types/GameDefinition.ts#L479)

Optional persistence configuration for saving/loading game progress.
Games opt-in to persistence by providing this configuration.
