# System Architecture

## Overview

The AI Game Maker consists of three main layers:

1. **Frontend App** (React Native/Expo) - User interface and game runtime
2. **Backend API** - AI generation, asset creation, game storage
3. **Game Runtime Engine** - Executes game definitions using Skia + Box2D

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND APP                                   │
│                     (React Native + Expo)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   Prompt UI     │  │  Asset Studio   │  │     Game Editor         │ │
│  │                 │  │                 │  │                         │ │
│  │ Natural language│  │ - AI Image Gen  │  │ - Visual entity editor  │ │
│  │ game description│  │ - Sprite tuning │  │ - Physics sliders       │ │
│  │                 │  │ - Color picker  │  │ - Behavior composer     │ │
│  │ Template picker │  │ - Asset library │  │ - Rules builder         │ │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘ │
│           │                    │                         │              │
│           └────────────────────┼─────────────────────────┘              │
│                                │                                        │
│                                ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    GAME DEFINITION (JSON)                         │  │
│  │                                                                   │  │
│  │   Entities + Behaviors + Rules + Assets + Settings                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                │                                        │
│                                ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    GAME RUNTIME ENGINE                            │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │  │
│  │  │   Entity     │  │   Physics    │  │     Renderer           │  │  │
│  │  │   Manager    │  │   System     │  │     (Skia)             │  │  │
│  │  │              │  │   (Box2D)    │  │                        │  │  │
│  │  │ - Lifecycle  │  │ - World      │  │ - Canvas               │  │  │
│  │  │ - Templates  │  │ - Bodies     │  │ - Shapes               │  │  │
│  │  │ - Queries    │  │ - Joints     │  │ - Images               │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │  │
│  │  │   Behavior   │  │    Input     │  │     Rules              │  │  │
│  │  │   Executor   │  │    System    │  │     Evaluator          │  │  │
│  │  │              │  │              │  │                        │  │  │
│  │  │ - Per-frame  │  │ - Tap/Touch  │  │ - Win conditions       │  │  │
│  │  │ - Events     │  │ - Drag       │  │ - Lose conditions      │  │  │
│  │  │ - Triggers   │  │ - Tilt       │  │ - Score tracking       │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │  │
│  │  │   Audio      │  │   Camera     │  │     UI Overlay         │  │  │
│  │  │   System     │  │   System     │  │                        │  │  │
│  │  │              │  │              │  │ - Score display        │  │  │
│  │  │ - SFX       │  │ - Follow     │  │ - Timer                │  │  │
│  │  │ - Music     │  │ - Zoom       │  │ - Pause/restart        │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   AI Generator  │  │  Asset Service  │  │    Game Storage         │ │
│  │                 │  │                 │  │                         │ │
│  │ - Prompt → JSON │  │ - Image gen     │  │ - Save games            │ │
│  │ - Refinement    │  │ - Sprite sheets │  │ - Load games            │ │
│  │ - Validation    │  │ - Caching       │  │ - Version history       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   User Service  │  │  Share Service  │  │    Analytics            │ │
│  │                 │  │   (Future)      │  │                         │ │
│  │ - Auth          │  │ - Publish       │  │ - Usage tracking        │ │
│  │ - Profiles      │  │ - Discovery     │  │ - Error monitoring      │ │
│  │ - Preferences   │  │ - Monetization  │  │ - AI quality metrics    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend App

#### Prompt UI
- Text input for natural language game descriptions
- Template gallery for starting points
- Example prompts for inspiration
- Conversation-style refinement ("make the ball bigger", "add more enemies")

#### Asset Studio
- AI-generated sprite preview and regeneration
- Color customization
- Simple image editing (flip, rotate, scale)
- Asset library of previously generated images

#### Game Editor
- Visual scene editor (drag entities, resize, rotate)
- Property inspector (select entity, edit properties)
- Physics tuning panel (sliders for density, friction, bounciness)
- Behavior composer (add/remove behaviors from entities)
- Rules builder (define win/lose conditions)

### Game Runtime Engine

#### Entity Manager
```typescript
class EntityManager {
  // Create entities from templates or definitions
  createEntity(definition: EntityDefinition): Entity;
  
  // Destroy entities (also removes from physics world)
  destroyEntity(id: string): void;
  
  // Query entities by tag
  getEntitiesByTag(tag: string): Entity[];
  
  // Get entity by ID
  getEntity(id: string): Entity | null;
  
  // Spawn from template
  spawnFromTemplate(templateId: string, position: Vector2): Entity;
}
```

#### Physics System
- Wraps Box2D world
- Creates bodies from entity physics definitions
- Syncs body positions back to entities each frame
- Handles collision callbacks
- Manages joints between entities

#### Renderer
- Creates Skia components from entity sprite definitions
- Updates transforms each frame from entity positions
- Handles z-ordering (layers)
- Supports: rectangles, circles, polygons, images

#### Behavior Executor
- Runs all active behaviors each frame
- Handles behavior-specific logic (movement, rotation, etc.)
- Responds to events (collision, timer, input)

#### Input System
- Touch/tap detection with world coordinate conversion
- Drag tracking (start, move, end)
- Accelerometer/gyroscope for tilt controls
- Maps input to behaviors

#### Rules Evaluator
- Checks win/lose conditions each frame
- Tracks game score
- Triggers game state changes (playing, won, lost)
- Handles restart logic

### Backend API

#### AI Generator
```typescript
interface AIGeneratorService {
  // Generate complete game from natural language
  generateGame(prompt: string): Promise<GameDefinition>;
  
  // Refine existing game with modification request
  refineGame(game: GameDefinition, modification: string): Promise<GameDefinition>;
  
  // Validate game definition
  validateGame(game: GameDefinition): ValidationResult;
  
  // Suggest improvements
  suggestImprovements(game: GameDefinition): Suggestion[];
}
```

#### Asset Service
```typescript
interface AssetService {
  // Generate sprite image from description
  generateSprite(description: string, style?: string): Promise<ImageAsset>;
  
  // Generate variations of existing sprite
  generateVariations(asset: ImageAsset, count: number): Promise<ImageAsset[]>;
  
  // Get cached asset by ID
  getAsset(id: string): Promise<ImageAsset>;
}
```

## Data Flow

### Game Creation Flow
```
1. User enters prompt: "A game where a cat jumps on platforms to collect fish"
                                    │
                                    ▼
2. Backend AI analyzes prompt, generates GameDefinition JSON
   - Identifies game type (platformer)
   - Creates entities (cat, platforms, fish, ground)
   - Assigns behaviors (player control, collectible)
   - Sets win condition (collect all fish)
                                    │
                                    ▼
3. Backend Asset Service generates sprites
   - Cat character (multiple frames if animated)
   - Platform textures
   - Fish collectible
   - Background
                                    │
                                    ▼
4. Frontend receives GameDefinition + assets
                                    │
                                    ▼
5. Game Runtime Engine initializes
   - EntityManager creates all entities
   - PhysicsSystem creates Box2D bodies
   - Renderer creates Skia components
   - BehaviorExecutor registers behaviors
                                    │
                                    ▼
6. Game loop starts
   - Each frame: physics step → behavior update → render
                                    │
                                    ▼
7. User plays game immediately
```

### Game Modification Flow
```
1. User requests change: "Make the cat jump higher"
                                    │
                                    ▼
2. Backend AI modifies GameDefinition
   - Identifies relevant entity (cat)
   - Identifies relevant behavior (jump)
   - Adjusts parameter (jump force)
                                    │
                                    ▼
3. Frontend receives updated GameDefinition
                                    │
                                    ▼
4. Hot-reload: Engine updates without full restart
   - Only changed entities/behaviors are recreated
                                    │
                                    ▼
5. User sees changes immediately
```

## File Structure (Proposed)

```
app/
├── lib/
│   ├── physics/              # Existing Box2D wrapper
│   │   ├── index.native.ts
│   │   ├── index.web.ts
│   │   └── types.ts
│   │
│   └── game-engine/          # New game engine
│       ├── EntityManager.ts
│       ├── PhysicsSystem.ts
│       ├── Renderer.ts
│       ├── BehaviorExecutor.ts
│       ├── InputSystem.ts
│       ├── RulesEvaluator.ts
│       ├── AudioSystem.ts
│       ├── CameraSystem.ts
│       │
│       ├── behaviors/        # Individual behavior implementations
│       │   ├── MoveBehavior.ts
│       │   ├── RotateBehavior.ts
│       │   ├── ControlBehavior.ts
│       │   └── ...
│       │
│       ├── types/            # TypeScript definitions
│       │   ├── GameDefinition.ts
│       │   ├── Entity.ts
│       │   ├── Behavior.ts
│       │   └── Rules.ts
│       │
│       └── GameEngine.ts     # Main engine class
│
├── components/
│   ├── game-maker/           # Game maker UI components
│   │   ├── PromptInput.tsx
│   │   ├── TemplateGallery.tsx
│   │   ├── AssetStudio.tsx
│   │   ├── GameEditor.tsx
│   │   ├── PropertyInspector.tsx
│   │   └── GamePlayer.tsx
│   │
│   └── examples/             # Existing physics demos
│
└── app/
    ├── (tabs)/
    │   ├── create.tsx        # Game creation screen
    │   ├── my-games.tsx      # Saved games list
    │   └── play.tsx          # Game player screen
    └── _layout.tsx
```

## Performance Considerations

### Entity Limits
- **Target**: 100+ dynamic entities at 60fps
- **Strategy**: Use React state sparingly, prefer Skia SharedValues for positions

### Physics Optimization
- Box2D velocity iterations: 8 (good balance)
- Box2D position iterations: 3 (good balance)
- Clamp delta time to prevent physics explosions

### Rendering Optimization
- Batch similar shapes when possible
- Use image atlases for sprites
- Cull off-screen entities

### Memory Management
- Pool frequently created/destroyed entities
- Lazy-load assets
- Clean up destroyed entity references promptly
