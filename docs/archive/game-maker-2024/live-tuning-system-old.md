# Live Tuning System Design

**Status**: Design Phase  
**Priority**: High  
**Complexity**: Medium

## Problem Statement

AI-generated games often have balance issues because the AI can't test or see the game. Parameters like jump height, enemy speed, pipe gaps, etc. need human playtesting and adjustment. Currently, developers must:
1. Edit JSON/TypeScript constants
2. Reload the game
3. Test again
4. Repeat

This is slow and breaks the flow of game design iteration.

## Solution Overview

A **Live Tuning System** that:
1. Automatically detects tunable parameters in game definitions
2. Displays a floating debug panel during development/preview mode
3. Provides real-time sliders to adjust values
4. Applies changes instantly to the running game
5. Exports final tuned values back to the game definition

## Architecture

### 1. Variable Declaration System

#### Current State
Games have two types of parameters:
- **Static Constants**: TypeScript `const` values (e.g., `const BIRD_RADIUS = 0.3`)
- **Runtime Variables**: `GameDefinition.variables` object (e.g., `{ multiplier: 1 }`)

#### Proposed: Tunable Variables Metadata

Extend `GameDefinition` with a new `tunables` section:

```typescript
export interface TunableVariable {
  /** Unique identifier for this tunable */
  id: string;
  /** Human-readable label */
  label: string;
  /** Category for grouping in UI */
  category: 'physics' | 'gameplay' | 'visuals' | 'ai' | 'other';
  /** Current/default value */
  value: number;
  /** Minimum value for slider */
  min: number;
  /** Maximum value for slider */
  max: number;
  /** Step size for slider (e.g., 0.1 for decimals, 1 for integers) */
  step: number;
  /** Optional description tooltip */
  description?: string;
  /** Where this value is used (for tracking dependencies) */
  usedIn?: Array<{
    type: 'template' | 'entity' | 'rule' | 'behavior';
    path: string; // JSONPath to the field
  }>;
}

export interface GameDefinition {
  // ... existing fields ...
  
  /** Tunable parameters for live editing (dev/preview mode only) */
  tunables?: Record<string, TunableVariable>;
}
```

#### Example: Flappy Bird with Tunables

```typescript
const game: GameDefinition = {
  metadata: { /* ... */ },
  world: { /* ... */ },
  
  tunables: {
    birdRadius: {
      id: 'birdRadius',
      label: 'Bird Size',
      category: 'gameplay',
      value: 0.3,
      min: 0.1,
      max: 1.0,
      step: 0.05,
      description: 'Collision radius of the bird',
      usedIn: [
        { type: 'template', path: 'templates.bird.sprite.radius' },
        { type: 'template', path: 'templates.bird.physics.radius' },
      ],
    },
    pipeSpeed: {
      id: 'pipeSpeed',
      label: 'Pipe Speed',
      category: 'gameplay',
      value: 15,
      min: 1,
      max: 30,
      step: 1,
      description: 'How fast pipes scroll left',
      usedIn: [
        { type: 'template', path: 'templates.pipeTop.behaviors[0].speed' },
        { type: 'template', path: 'templates.pipeBottom.behaviors[0].speed' },
      ],
    },
    pipeGap: {
      id: 'pipeGap',
      label: 'Gap Size',
      category: 'gameplay',
      value: 3.0,
      min: 1.5,
      max: 5.0,
      step: 0.1,
      description: 'Vertical gap between pipes',
      usedIn: [
        { type: 'template', path: 'templates.scoreZone.sprite.height' },
        { type: 'template', path: 'templates.scoreZone.physics.height' },
      ],
    },
    flapForce: {
      id: 'flapForce',
      label: 'Flap Strength',
      category: 'gameplay',
      value: 7,
      min: 3,
      max: 15,
      step: 0.5,
      description: 'Upward velocity when tapping',
      usedIn: [
        { type: 'rule', path: 'rules[0].actions[0].y' },
      ],
    },
    gravity: {
      id: 'gravity',
      label: 'Gravity',
      category: 'physics',
      value: -15,
      min: -30,
      max: -5,
      step: 1,
      description: 'Downward gravity force',
      usedIn: [
        { type: 'entity', path: 'world.gravity.y' },
      ],
    },
  },
  
  templates: {
    bird: {
      sprite: { type: 'circle', radius: { ref: 'tunables.birdRadius' } },
      physics: { /* ... radius: { ref: 'tunables.birdRadius' } */ },
    },
    // ... other templates use { ref: 'tunables.pipeSpeed' } etc.
  },
  
  rules: [
    {
      id: 'tap_to_flap',
      trigger: { type: 'tap' },
      actions: [
        { type: 'set_velocity', target: { type: 'by_tag', tag: 'bird' }, y: { ref: 'tunables.flapForce' } },
      ],
    },
  ],
};
```

### 2. Reference Resolution System

Introduce a `{ ref: string }` value type that points to tunables:

```typescript
export type ValueOrRef<T> = T | { ref: string };

// Update existing types to support refs
export interface MoveBehavior {
  type: 'move';
  direction: MoveDirection;
  speed: ValueOrRef<number>; // Can be 15 or { ref: 'tunables.pipeSpeed' }
}

export interface SetVelocityAction {
  type: 'set_velocity';
  target: EntityTarget;
  x?: ValueOrRef<number>;
  y?: ValueOrRef<number>;
}
```

Add a resolver function in the game engine:

```typescript
function resolveValue<T>(valueOrRef: ValueOrRef<T>, game: GameDefinition): T {
  if (typeof valueOrRef === 'object' && 'ref' in valueOrRef) {
    const path = valueOrRef.ref.split('.');
    let value: any = game;
    for (const key of path) {
      value = value[key];
    }
    return typeof value === 'object' && 'value' in value ? value.value : value;
  }
  return valueOrRef;
}
```

### 3. Live Tuning UI Component

#### Visual Design

```
┌─────────────────────────────────────┐
│          GAME VIEWPORT              │
│                                     │
│         🎮 [Floating Button]       │  ← Top-right corner
│                                     │
│                                     │
└─────────────────────────────────────┘

When button clicked:
┌─────────────────────────────────────┐
│          GAME VIEWPORT              │
│  ┌─────────────────────────────┐   │
│  │ 🎮 LIVE TUNING              │   │  ← Slide from right
│  │ ────────────────────────    │   │
│  │ [GAMEPLAY]                  │   │
│  │   Bird Size     ●────── 0.3 │   │
│  │   Pipe Speed    ────●── 15  │   │
│  │   Gap Size      ──●──── 3.0 │   │
│  │   Flap Strength ───●─── 7   │   │
│  │                             │   │
│  │ [PHYSICS]                   │   │
│  │   Gravity       ●────── -15 │   │
│  │                             │   │
│  │ [Reset All] [Export JSON]   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

#### Component Structure

```typescript
interface TuningPanelProps {
  game: GameDefinition;
  onValueChange: (tunableId: string, newValue: number) => void;
  onReset: () => void;
  onExport: () => void;
}

export function TuningPanel({ game, onValueChange, onReset, onExport }: TuningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tunables = game.tunables || {};
  
  // Group by category
  const byCategory = groupBy(Object.values(tunables), t => t.category);
  
  return (
    <>
      {/* Floating Button */}
      <Pressable 
        className="absolute top-4 right-4 bg-purple-600 rounded-full p-3 shadow-lg"
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text>🎮</Text>
      </Pressable>
      
      {/* Slide-in Panel */}
      <Animated.View 
        className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 shadow-2xl"
        style={{ transform: [{ translateX: isOpen ? 0 : 320 }] }}
      >
        <ScrollView className="p-4">
          <Text className="text-white text-xl font-bold mb-4">🎮 Live Tuning</Text>
          
          {Object.entries(byCategory).map(([category, tunables]) => (
            <View key={category} className="mb-6">
              <Text className="text-gray-400 uppercase text-xs mb-2">{category}</Text>
              {tunables.map(tunable => (
                <TunableSlider
                  key={tunable.id}
                  tunable={tunable}
                  onChange={newValue => onValueChange(tunable.id, newValue)}
                />
              ))}
            </View>
          ))}
          
          <View className="flex-row gap-2 mt-4">
            <Button title="Reset All" onPress={onReset} />
            <Button title="Export JSON" onPress={onExport} />
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

interface TunableSliderProps {
  tunable: TunableVariable;
  onChange: (value: number) => void;
}

function TunableSlider({ tunable, onChange }: TunableSliderProps) {
  return (
    <View className="mb-4">
      <View className="flex-row justify-between">
        <Text className="text-white">{tunable.label}</Text>
        <Text className="text-purple-400">{tunable.value.toFixed(2)}</Text>
      </View>
      {tunable.description && (
        <Text className="text-gray-500 text-xs mb-1">{tunable.description}</Text>
      )}
      <Slider
        value={tunable.value}
        minimumValue={tunable.min}
        maximumValue={tunable.max}
        step={tunable.step}
        onValueChange={onChange}
        minimumTrackTintColor="#a855f7"
        maximumTrackTintColor="#374151"
      />
    </View>
  );
}
```

### 4. Runtime Value Update System

#### Hot Update Flow

```
User drags slider
       ↓
onValueChange(tunableId, newValue)
       ↓
Update game.tunables[tunableId].value
       ↓
Trigger re-evaluation of affected values
       ↓
Apply changes to live entities
```

#### Implementation in GameRuntime

```typescript
export function GameRuntimeGodot({ definition, showHUD, ...props }: GameRuntimeProps) {
  const [gameDefinition, setGameDefinition] = useState(definition);
  const [showTuning, setShowTuning] = useState(__DEV__); // Only in dev mode
  
  const handleTunableChange = useCallback((tunableId: string, newValue: number) => {
    setGameDefinition(prev => {
      // Update the tunable value
      const updated = {
        ...prev,
        tunables: {
          ...prev.tunables,
          [tunableId]: {
            ...prev.tunables![tunableId],
            value: newValue,
          },
        },
      };
      
      // Apply changes to running game
      applyTunableChanges(entityManager, updated, tunableId);
      
      return updated;
    });
  }, [entityManager]);
  
  return (
    <View style={{ flex: 1 }}>
      <GodotView definition={gameDefinition} />
      
      {showTuning && gameDefinition.tunables && (
        <TuningPanel
          game={gameDefinition}
          onValueChange={handleTunableChange}
          onReset={() => setGameDefinition(definition)} // Reset to original
          onExport={() => exportTunedGame(gameDefinition)}
        />
      )}
    </View>
  );
}

function applyTunableChanges(
  entityManager: EntityManager,
  game: GameDefinition,
  changedTunableId: string
) {
  const tunable = game.tunables![changedTunableId];
  const newValue = tunable.value;
  
  // For each usage location, apply the update
  for (const usage of tunable.usedIn || []) {
    if (usage.type === 'template') {
      // Update all entities using this template
      const [templateId, ...pathParts] = usage.path.split('.').slice(1);
      entityManager.updateTemplateProperty(templateId, pathParts, newValue);
    } else if (usage.type === 'entity') {
      // Direct entity property update
      // Apply to world config or specific entity
    } else if (usage.type === 'rule') {
      // Update rule action values
      // This requires re-evaluating rules
    }
  }
}
```

### 5. AI Integration

#### Prompt Engineering for AI

When AI generates a game, instruct it to:

1. **Identify Tunable Parameters**:
   ```
   For each numeric constant that affects gameplay balance:
   - Create a tunable entry
   - Use semantic naming (e.g., 'enemySpeed' not 'speed1')
   - Set reasonable min/max ranges (typically 0.5x to 2x default)
   - Categorize appropriately
   ```

2. **Use References Instead of Literals**:
   ```
   Instead of:
     behaviors: [{ type: 'move', speed: 15 }]
   
   Generate:
     tunables: { enemySpeed: { value: 15, min: 5, max: 30, ... } }
     behaviors: [{ type: 'move', speed: { ref: 'tunables.enemySpeed' } }]
   ```

3. **Generate Descriptions**:
   ```
   For each tunable, generate a 1-sentence description explaining:
   - What it affects
   - How changing it impacts gameplay
   ```

#### Example AI System Prompt Addition

```markdown
## Tunable Parameters

When generating games, identify numeric parameters that affect gameplay and make them tunable:

1. **Physics Parameters**: gravity, friction, restitution, density
2. **Movement Parameters**: speed, acceleration, jump force, flap strength
3. **Spawn Parameters**: spawn interval, spawn count, despawn time
4. **Difficulty Parameters**: enemy speed, projectile speed, gap sizes
5. **Scoring Parameters**: points per action, score multipliers

For each tunable:
- Add to `tunables` object with descriptive ID
- Set reasonable min/max (typically 0.25x to 4x the default)
- Use appropriate step size (0.1 for decimals, 1 for integers)
- Replace literal values with `{ ref: 'tunables.tunableId' }`
- Add brief description of effect

Example:
```json
{
  "tunables": {
    "jumpForce": {
      "id": "jumpForce",
      "label": "Jump Height",
      "category": "gameplay",
      "value": 10,
      "min": 5,
      "max": 20,
      "step": 0.5,
      "description": "How high the player jumps"
    }
  },
  "rules": [{
    "trigger": { "type": "tap" },
    "actions": [{ 
      "type": "apply_impulse",
      "target": { "type": "player" },
      "y": { "ref": "tunables.jumpForce" }
    }]
  }]
}
```
```

## Implementation Roadmap

### Phase 1: Type System & Reference Resolution (2-3 days)
- [ ] Update GameDefinition types with `tunables` field
- [ ] Create `TunableVariable` interface
- [ ] Add `ValueOrRef<T>` type for numeric fields
- [ ] Implement `resolveValue()` helper
- [ ] Update behavior/rule types to accept refs
- [ ] Add runtime resolver in game engine

**Files to Modify:**
- `shared/src/types/GameDefinition.ts`
- `shared/src/types/common.ts`
- `shared/src/types/behavior.ts`
- `shared/src/types/rules.ts`
- `app/lib/game-engine/utils/resolveValue.ts` (new)

### Phase 2: Tuning UI Component (2-3 days)
- [ ] Create `TuningPanel.tsx` component
- [ ] Create `TunableSlider.tsx` component
- [ ] Add floating button with animation
- [ ] Add slide-in panel animation
- [ ] Group tunables by category
- [ ] Add reset functionality
- [ ] Add export to JSON functionality

**Files to Create:**
- `app/components/game/TuningPanel.tsx`
- `app/components/game/TunableSlider.tsx`

### Phase 3: Runtime Hot Updates (3-4 days)
- [ ] Implement `applyTunableChanges()` in EntityManager
- [ ] Add live update for template properties
- [ ] Add live update for behavior values
- [ ] Add live update for rule action values
- [ ] Add live update for world config (gravity, etc.)
- [ ] Test with various game types

**Files to Modify:**
- `app/lib/game-engine/GameRuntime.godot.tsx`
- `app/lib/game-engine/EntityManager.ts`
- `app/lib/game-engine/systems/RuleSystem.ts`

### Phase 4: AI Integration (2-3 days)
- [ ] Update AI system prompt with tunable guidelines
- [ ] Add tunable detection logic in generator
- [ ] Auto-generate tunables from game analysis
- [ ] Add ref replacement in generated JSON
- [ ] Test with various prompts

**Files to Modify:**
- `api/src/ai/generator.ts`
- `api/src/ai/prompts/game-generation.ts`
- `api/src/ai/classifier.ts`

### Phase 5: Testing & Polish (2 days)
- [ ] Convert existing test games to use tunables
- [ ] Test hot updates don't break game state
- [ ] Add visual feedback when values change
- [ ] Add undo/redo for tuning changes
- [ ] Add "Save Tuned Values" to game definition
- [ ] Documentation and examples

## File Structure

```
shared/src/types/
├── GameDefinition.ts         # Add TunableVariable, update GameDefinition
├── common.ts                 # Add ValueOrRef<T>
├── behavior.ts               # Update to accept ValueOrRef
└── rules.ts                  # Update to accept ValueOrRef

app/lib/game-engine/
├── GameRuntime.godot.tsx     # Integrate TuningPanel
├── EntityManager.ts          # Add hot update methods
└── utils/
    └── resolveValue.ts       # New: Reference resolution

app/components/game/
├── TuningPanel.tsx           # New: Main tuning UI
└── TunableSlider.tsx         # New: Individual slider

api/src/ai/
├── generator.ts              # Add tunable generation
└── prompts/
    └── game-generation.ts    # Update prompt with tunable instructions
```

## Success Metrics

1. **Developer Experience**: Game designers can tune a game in <5 minutes without code changes
2. **AI Quality**: 80%+ of AI-generated games have useful tunables
3. **Performance**: Value updates reflect in game within 100ms
4. **Coverage**: All numeric gameplay parameters are tunable

## Future Enhancements

1. **Presets**: Save/load tuning presets ("Easy Mode", "Hard Mode", "Speedrun")
2. **A/B Testing**: Compare two tuning configurations side-by-side
3. **Auto-Balance**: ML-based suggestions for balanced parameters
4. **Visual Feedback**: Highlight entities affected by tunable change
5. **History**: Undo/redo stack for tuning changes
6. **Remote Tuning**: Update live games via API for A/B testing
7. **Analytics Integration**: Track which tunables correlate with player retention

## Related Documents

- [AI Integration](../reference/ai-integration.md)
- [Game Definition Schema](../reference/game-definition.md)
- [Entity System](../reference/entity-system.md)
- [Behavior System](../reference/behavior-system.md)
