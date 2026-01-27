[**@slopcade/shared v1.0.0**](../README.md)

***

[@slopcade/shared](../README.md) / GameDefinition

# Interface: GameDefinition

Defined in: [types/GameDefinition.ts:433](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L433)

## Properties

### metadata

> **metadata**: [`GameMetadata`](GameMetadata.md)

Defined in: [types/GameDefinition.ts:434](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L434)

***

### world

> **world**: [`WorldConfig`](WorldConfig.md)

Defined in: [types/GameDefinition.ts:435](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L435)

***

### presentation?

> `optional` **presentation**: [`PresentationConfig`](PresentationConfig.md)

Defined in: [types/GameDefinition.ts:436](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L436)

***

### camera?

> `optional` **camera**: [`CameraConfig`](CameraConfig.md)

Defined in: [types/GameDefinition.ts:437](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L437)

***

### ui?

> `optional` **ui**: [`UIConfig`](UIConfig.md)

Defined in: [types/GameDefinition.ts:438](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L438)

***

### background?

> `optional` **background**: [`BackgroundConfig`](../type-aliases/BackgroundConfig.md)

Defined in: [types/GameDefinition.ts:439](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L439)

***

### variables?

> `optional` **variables**: `Record`\<`string`, [`GameVariable`](../type-aliases/GameVariable.md)\>

Defined in: [types/GameDefinition.ts:440](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L440)

***

### templates

> **templates**: `Record`\<`string`, [`EntityTemplate`](EntityTemplate.md)\>

Defined in: [types/GameDefinition.ts:441](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L441)

***

### entities

> **entities**: [`GameEntity`](GameEntity.md)[]

Defined in: [types/GameDefinition.ts:442](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L442)

***

### joints?

> `optional` **joints**: [`GameJoint`](../type-aliases/GameJoint.md)[]

Defined in: [types/GameDefinition.ts:443](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L443)

***

### rules?

> `optional` **rules**: [`GameRule`](GameRule.md)[]

Defined in: [types/GameDefinition.ts:444](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L444)

***

### winCondition?

> `optional` **winCondition**: [`WinCondition`](WinCondition.md)

Defined in: [types/GameDefinition.ts:445](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L445)

***

### loseCondition?

> `optional` **loseCondition**: [`LoseCondition`](LoseCondition.md)

Defined in: [types/GameDefinition.ts:446](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L446)

***

### initialLives?

> `optional` **initialLives**: `number`

Defined in: [types/GameDefinition.ts:447](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L447)

***

### initialScore?

> `optional` **initialScore**: `number`

Defined in: [types/GameDefinition.ts:448](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L448)

***

### assetPacks?

> `optional` **assetPacks**: `Record`\<`string`, [`AssetPack`](AssetPack.md)\>

Defined in: [types/GameDefinition.ts:449](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L449)

***

### activeAssetPackId?

> `optional` **activeAssetPackId**: `string`

Defined in: [types/GameDefinition.ts:450](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L450)

***

### assetSystem?

> `optional` **assetSystem**: [`AssetSystemConfig`](AssetSystemConfig.md)

Defined in: [types/GameDefinition.ts:451](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L451)

***

### ~~parallaxConfig?~~

> `optional` **parallaxConfig**: [`ParallaxConfig`](ParallaxConfig.md)

Defined in: [types/GameDefinition.ts:453](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L453)

#### Deprecated

Use background with type: 'parallax' instead

***

### tileSheets?

> `optional` **tileSheets**: [`TileSheet`](TileSheet.md)[]

Defined in: [types/GameDefinition.ts:454](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L454)

***

### tileMaps?

> `optional` **tileMaps**: [`TileMap`](TileMap.md)[]

Defined in: [types/GameDefinition.ts:455](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L455)

***

### multiplayer?

> `optional` **multiplayer**: [`MultiplayerConfig`](MultiplayerConfig.md)

Defined in: [types/GameDefinition.ts:456](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L456)

***

### loadingScreen?

> `optional` **loadingScreen**: [`LoadingScreenConfig`](LoadingScreenConfig.md)

Defined in: [types/GameDefinition.ts:457](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L457)

***

### sounds?

> `optional` **sounds**: `Record`\<`string`, [`SoundAsset`](SoundAsset.md)\>

Defined in: [types/GameDefinition.ts:458](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L458)

***

### input?

> `optional` **input**: [`InputConfig`](InputConfig.md)

Defined in: [types/GameDefinition.ts:459](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L459)

***

### match3?

> `optional` **match3**: [`Match3Config`](Match3Config.md)

Defined in: [types/GameDefinition.ts:460](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L460)

***

### tetris?

> `optional` **tetris**: [`TetrisConfig`](TetrisConfig.md)

Defined in: [types/GameDefinition.ts:461](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L461)

***

### slotMachine?

> `optional` **slotMachine**: [`SlotMachineConfig`](SlotMachineConfig.md)

Defined in: [types/GameDefinition.ts:462](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L462)

***

### stateMachines?

> `optional` **stateMachines**: `StateMachineDefinition`[]

Defined in: [types/GameDefinition.ts:467](https://github.com/hassoncs/clover/blob/5a1034980770c49d5a2278254b551ba5ffaeefe1/shared/src/types/GameDefinition.ts#L467)

Game-level state machines for managing game phases, turns, and flow.
Unlike entity-level machines, these have no `owner` field set.
