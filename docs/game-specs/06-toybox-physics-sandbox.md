# ToyBox Physics Sandbox - Game Specification

**Game ID**: `toybox-physics-sandbox`  
**Version**: 1.0.0  
**Type**: Physics Sandbox + Creator Tool  
**Target Audience**: Creative players, physics enthusiasts, UGC creators  
**Estimated Development**: 4-6 weeks  

---

## Executive Summary

ToyBox Physics Sandbox is a prompt-driven physics creator that combines the accessibility of natural language with the power of physics simulation. Players describe objects ("bouncy watermelon cube", "heavy metal wheel") and the AI generates appropriate physics objects with realistic properties. The core gameplay loop involves spawning objects, connecting them with joints, completing structured challenges, and sharing creations with the community.

**Key Innovation**: AI-assisted object creation eliminates the complexity barrier of traditional physics editors while maintaining creative depth. Players focus on imagination and experimentation rather than technical parameter tuning.

**Market Position**: Simplified Roblox-style UGC creation with AI assistance, targeting players who want to create but find traditional tools overwhelming.

---

## Core Game Mechanics

### 1. Object Spawning System

#### Prompt-Based Creation
- **Input**: Natural language descriptions ("bouncy red ball", "heavy wooden plank", "springy green cube")
- **Processing**: AI interprets prompt → selects archetype → applies properties → generates sprite
- **Output**: Physics object with appropriate mass, friction, restitution, and visual appearance

#### Object Archetypes
| Archetype | Shape | Common Uses | Physics Defaults |
|-----------|-------|-------------|------------------|
| **Cube** | Box | Building blocks, weights | density: 1.0, friction: 0.7 |
| **Sphere** | Circle | Balls, wheels, projectiles | density: 0.8, friction: 0.5 |
| **Plank** | Rectangle | Bridges, levers, platforms | density: 0.6, friction: 0.8 |
| **Wheel** | Circle | Vehicles, rolling objects | density: 1.2, friction: 1.0 |
| **Wedge** | Triangle | Ramps, supports | density: 1.0, friction: 0.9 |

#### Property Inference
- **Material keywords**: "metal" (heavy, low friction), "rubber" (bouncy, high friction), "wood" (medium density)
- **Size keywords**: "tiny", "small", "large", "huge" → scale multipliers
- **Behavior keywords**: "bouncy" (high restitution), "sticky" (high friction), "slippery" (low friction)

### 2. Joint Connection System

#### Joint Types
```typescript
interface JointConfig {
  type: 'fixed' | 'hinge' | 'spring' | 'rope';
  entityA: string;
  entityB: string;
  anchorA: Vector2;
  anchorB: Vector2;
  properties?: JointProperties;
}
```

| Joint Type | Purpose | Properties | Visual |
|------------|---------|------------|--------|
| **Fixed** | Rigid connection | None | Thick gray line |
| **Hinge** | Rotation around point | `motorSpeed?`, `motorTorque?` | Circle at pivot |
| **Spring** | Elastic connection | `stiffness`, `damping`, `restLength` | Zigzag line |
| **Rope** | Flexible tether | `maxLength` | Curved dashed line |

#### Connection Interface
- **Tap object** → Show connection points (corners, center, edges)
- **Drag from point** → Rubber band line follows finger
- **Tap target object** → Joint created, properties dialog appears
- **Joint visualization** → Persistent visual indicators for all connections

### 3. Challenge System

#### Challenge Types

**Demolition Challenges**
- "Knock down the tower using 3 objects"
- "Destroy all red blocks with a single ball"
- Victory condition: All target objects below Y threshold or destroyed

**Launch Challenges**  
- "Launch the ball into the target zone"
- "Get the sphere to travel 10 meters"
- Victory condition: Object reaches target area or distance

**Construction Challenges**
- "Build a bridge that supports the weight"
- "Create a vehicle that travels 5 meters"
- Victory condition: Structure survives load test or achieves goal

**Precision Challenges**
- "Land the ball in the bucket"
- "Stop the pendulum at the center"
- Victory condition: Object reaches specific position/state

#### Challenge Structure
```typescript
interface Challenge {
  id: string;
  title: string;
  description: string;
  objectives: Objective[];
  constraints: Constraint[];
  initialSetup: GameEntity[];
  victoryCondition: VictoryCondition;
  starRating: StarCriteria[];
}
```

### 4. Creation Saving & Sharing

#### Save Format
- **Base**: Empty sandbox GameDefinition
- **Delta**: Only user-created objects and joints
- **Metadata**: Creation name, description, tags, creator
- **Thumbnail**: Auto-generated screenshot

#### Share System
- **Share Code**: 6-character alphanumeric code
- **QR Code**: For easy mobile sharing
- **Gallery**: Browse community creations by category/popularity
- **Remix**: Fork existing creation as starting point

---

## Game Engine Integration

### GameDefinition Structure

```typescript
interface ToyBoxGameDefinition extends GameDefinition {
  mode: 'sandbox' | 'challenge';
  challenge?: Challenge;
  userObjects: UserObject[];
  joints: JointConfig[];
  objectTaxonomy: ObjectTaxonomy;
}

interface UserObject {
  id: string;
  archetype: ObjectArchetype;
  prompt: string;
  position: Vector2;
  properties: PhysicsProperties;
  sprite: GeneratedSprite;
  createdAt: number;
}
```

### Object Taxonomy System

#### Archetype Definitions
```typescript
interface ObjectArchetype {
  id: string;
  name: string;
  shape: 'box' | 'circle' | 'polygon';
  defaultSize: Vector2;
  physicsDefaults: PhysicsProperties;
  materialKeywords: string[];
  sizeKeywords: string[];
  behaviorKeywords: string[];
}
```

#### Property Mapping
```typescript
interface PropertyMapping {
  material: Record<string, Partial<PhysicsProperties>>;
  size: Record<string, number>; // Scale multipliers
  behavior: Record<string, Partial<PhysicsProperties>>;
}

const PROPERTY_MAPPING: PropertyMapping = {
  material: {
    'metal': { density: 2.0, friction: 0.3, restitution: 0.1 },
    'rubber': { density: 0.8, friction: 0.9, restitution: 0.8 },
    'wood': { density: 0.6, friction: 0.7, restitution: 0.3 },
    'glass': { density: 1.2, friction: 0.1, restitution: 0.9 },
  },
  size: {
    'tiny': 0.5, 'small': 0.75, 'large': 1.5, 'huge': 2.0
  },
  behavior: {
    'bouncy': { restitution: 0.9 },
    'sticky': { friction: 1.2 },
    'slippery': { friction: 0.1 },
    'heavy': { density: 3.0 },
    'light': { density: 0.3 }
  }
};
```

### Joint System Implementation

#### Joint Creation Rules
- **Proximity check**: Objects must be within 2 meters
- **Stability validation**: Prevent over-constrained systems
- **Visual feedback**: Real-time joint preview during creation
- **Auto-cleanup**: Remove joints when objects are deleted

#### Joint Persistence
```typescript
interface SerializedJoint {
  id: string;
  type: JointType;
  entityAId: string;
  entityBId: string;
  anchorA: Vector2;
  anchorB: Vector2;
  properties: Record<string, any>;
}
```

### Challenge Validation System

#### Objective Tracking
```typescript
interface ObjectiveTracker {
  type: 'position' | 'velocity' | 'collision' | 'timer';
  target: EntitySelector;
  condition: Condition;
  progress: number;
  completed: boolean;
}
```

#### Victory Detection
- **Polling system**: Check objectives every 100ms
- **Event-driven**: Collision and destruction events
- **Debounce**: 2-second stability requirement for position objectives
- **Star rating**: Based on efficiency (objects used, time taken, attempts)

---

## Graphics & Asset Requirements

### Object Sprites

#### Generation Pipeline
1. **Prompt analysis** → Extract visual keywords
2. **Archetype selection** → Determine base shape
3. **Style application** → Apply material, color, texture
4. **Physics alignment** → Ensure sprite matches collision shape
5. **Optimization** → Generate multiple resolutions

#### Visual Styles
| Material | Color Palette | Texture | Highlights |
|----------|---------------|---------|------------|
| **Metal** | Grays, silvers | Brushed, reflective | Sharp specular |
| **Wood** | Browns, tans | Grain patterns | Matte finish |
| **Rubber** | Bright colors | Smooth, slightly glossy | Soft highlights |
| **Glass** | Transparent tints | Crystal clear | Strong reflections |

### Joint Visualization

#### Visual Design
- **Fixed joints**: Thick gray connector line with bolts
- **Hinges**: Circle at pivot point with rotation indicator
- **Springs**: Animated zigzag line that compresses/extends
- **Ropes**: Curved dashed line with realistic sag

#### Interactive States
- **Idle**: Subtle, non-distracting appearance
- **Selected**: Highlighted with properties panel
- **Stressed**: Color changes based on force/torque
- **Breaking**: Visual warning before joint failure

### Challenge UI Elements

#### Goal Indicators
- **Target zones**: Translucent colored areas with pulsing borders
- **Trajectory hints**: Dotted arc showing suggested path
- **Progress meters**: Real-time objective completion status
- **Success effects**: Particle explosions, screen shake, sound

#### Constraint Visualization
- **Object limits**: Counter showing "2/5 objects used"
- **Forbidden areas**: Red-tinted zones where placement is blocked
- **Timer**: Countdown clock for time-limited challenges

### Gallery Interface

#### Creation Thumbnails
- **Auto-generated**: Screenshot of creation in action
- **Standardized view**: Consistent camera angle and zoom
- **Overlay info**: Star rating, play count, creator name
- **Loading states**: Skeleton screens while fetching

#### Browse Categories
- **Featured**: Staff picks and trending creations
- **Recent**: Newest uploads
- **Popular**: Most played this week
- **Challenges**: Community challenge entries
- **My Creations**: User's saved works

---

## AI Object Generation

### Prompt Processing Pipeline

#### 1. Text Analysis
```typescript
interface PromptAnalysis {
  archetype: ObjectArchetype;
  materials: string[];
  sizes: string[];
  behaviors: string[];
  colors: string[];
  confidence: number;
}
```

#### 2. Property Synthesis
- **Base properties**: Start with archetype defaults
- **Material modifiers**: Apply density, friction, restitution changes
- **Size scaling**: Multiply dimensions by size keywords
- **Behavior overrides**: Apply special physics properties
- **Validation**: Ensure properties are physically reasonable

#### 3. Sprite Generation
```typescript
interface SpriteRequest {
  prompt: string;
  archetype: string;
  dimensions: Vector2;
  style: 'cartoon' | 'realistic' | 'pixel';
  backgroundColor: 'transparent';
}
```

### Object Archetype System

#### Cube Archetype
```typescript
const CUBE_ARCHETYPE: ObjectArchetype = {
  id: 'cube',
  name: 'Cube',
  shape: 'box',
  defaultSize: { x: 1, y: 1 },
  physicsDefaults: {
    density: 1.0,
    friction: 0.7,
    restitution: 0.3,
    bodyType: 'dynamic'
  },
  materialKeywords: ['metal', 'wood', 'rubber', 'stone', 'ice'],
  sizeKeywords: ['tiny', 'small', 'big', 'large', 'huge'],
  behaviorKeywords: ['bouncy', 'heavy', 'light', 'sticky', 'slippery']
};
```

#### Sphere Archetype
```typescript
const SPHERE_ARCHETYPE: ObjectArchetype = {
  id: 'sphere',
  name: 'Sphere',
  shape: 'circle',
  defaultSize: { x: 1, y: 1 },
  physicsDefaults: {
    density: 0.8,
    friction: 0.5,
    restitution: 0.6,
    bodyType: 'dynamic'
  },
  materialKeywords: ['rubber', 'metal', 'glass', 'plastic'],
  sizeKeywords: ['marble', 'ball', 'boulder'],
  behaviorKeywords: ['bouncy', 'rolling', 'spinning']
};
```

### Prompt Examples & Expected Output

| Prompt | Archetype | Properties | Visual |
|--------|-----------|------------|--------|
| "bouncy red ball" | sphere | restitution: 0.9, color: red | Red rubber ball |
| "heavy metal cube" | cube | density: 2.0, color: gray | Steel block |
| "wooden plank" | plank | density: 0.6, friction: 0.8 | Wood grain texture |
| "tiny glass marble" | sphere | scale: 0.5, restitution: 0.9 | Small transparent sphere |

---

## UI/UX Flow

### Sandbox Mode Interface

#### Main Canvas
- **Physics viewport**: Full-screen physics simulation
- **Grid overlay**: Optional snap-to-grid for precise placement
- **Camera controls**: Pan (drag), zoom (pinch), reset (double-tap)
- **Object selection**: Tap to select, drag to move, long-press for menu

#### Tool Palette
```
┌─────────────────┐
│ [+] Add Object  │  ← Primary action button
│ [🔗] Connect     │  ← Joint creation mode
│ [▶️] Play/Pause  │  ← Physics simulation toggle
│ [🗑️] Delete      │  ← Delete selected objects
│ [💾] Save        │  ← Save creation
│ [📤] Share       │  ← Generate share code
└─────────────────┘
```

#### Object Spawn Dialog
1. **Prompt input**: Text field with placeholder "Describe your object..."
2. **Quick suggestions**: Chips for common objects ("ball", "cube", "plank")
3. **Preview**: Real-time generated sprite preview
4. **Properties**: Expandable advanced physics settings
5. **Create button**: Spawns object at canvas center

### Challenge Mode Interface

#### Challenge Selection
- **Grid layout**: Challenge thumbnails with difficulty indicators
- **Filter tabs**: "New", "Popular", "Completed", "Starred"
- **Search bar**: Find challenges by keyword
- **Difficulty badges**: Beginner, Intermediate, Advanced, Expert

#### Challenge Play Screen
```
┌─────────────────────────────────┐
│ Challenge: "Knock Down Tower"   │ ← Title bar
│ ⭐⭐⭐ | 🎯 0/3 objectives      │ ← Progress
├─────────────────────────────────┤
│                                 │
│        [Physics Canvas]         │ ← Main play area
│                                 │
├─────────────────────────────────┤
│ Objects: 2/5 | Time: 1:23      │ ← Constraints
│ [+] [🔗] [▶️] [🔄] [❓]        │ ← Tools + hint
└─────────────────────────────────┘
```

### Creation Gallery

#### Browse Interface
- **Masonry layout**: Variable-height creation cards
- **Infinite scroll**: Load more as user scrolls
- **Filter sidebar**: Category, rating, date, creator
- **Sort options**: Popular, Recent, Top Rated, Random

#### Creation Detail View
```
┌─────────────────────────────────┐
│     [Creation Screenshot]       │ ← Hero image
│                                 │
│ "Epic Rube Goldberg Machine"   │ ← Title
│ by @creator123                  │ ← Creator
│ ⭐⭐⭐⭐⭐ (4.8) | 1.2k plays   │ ← Stats
├─────────────────────────────────┤
│ Description text here...        │ ← Description
├─────────────────────────────────┤
│ [▶️ Play] [💾 Save] [🔄 Remix] │ ← Actions
└─────────────────────────────────┘
```

### Share Code Screen

#### Generation Flow
1. **Save creation** → Generate unique ID
2. **Create thumbnail** → Auto-screenshot
3. **Generate codes** → 6-char code + QR code
4. **Share options** → Copy link, social media, AirDrop

#### Share Interface
```
┌─────────────────────────────────┐
│        Share Creation           │
├─────────────────────────────────┤
│     [QR Code Image]             │
│                                 │
│     Code: ABC123                │
│                                 │
│ [Copy Link] [More Options...]   │
└─────────────────────────────────┘
```

---

## Technical Implementation Notes

### Object Taxonomy Constraints

#### Performance Limits
- **Max objects per creation**: 50 (prevents performance issues)
- **Max joints per object**: 8 (prevents over-constraint)
- **Physics step rate**: 60 FPS with adaptive quality
- **Collision detection**: Broad-phase optimization for many objects

#### Stability Requirements
- **Joint validation**: Prevent impossible configurations
- **Mass ratio limits**: Prevent extreme mass differences (>100:1)
- **Velocity clamping**: Prevent runaway physics explosions
- **Auto-sleep**: Inactive objects sleep to save CPU

### Joint System Stability

#### Constraint Solving
- **Iterative solver**: Box2D with 8 velocity iterations, 3 position iterations
- **Joint breaking**: Automatic failure at 10x design load
- **Damping injection**: Prevent oscillation in spring systems
- **Warm starting**: Reuse constraint solutions between frames

#### User Experience
- **Visual feedback**: Show joint stress with color coding
- **Failure prediction**: Warn before joints break
- **Undo system**: Revert last 10 actions
- **Auto-save**: Save progress every 30 seconds

### Challenge Validation System

#### Objective Detection
```typescript
interface ObjectiveValidator {
  check(gameState: GameState): ObjectiveResult;
  getProgress(): number;
  reset(): void;
}

class PositionObjective implements ObjectiveValidator {
  constructor(
    private target: EntitySelector,
    private zone: Rectangle,
    private duration: number = 2000
  ) {}
  
  check(gameState: GameState): ObjectiveResult {
    const entities = this.target.select(gameState);
    const inZone = entities.filter(e => this.zone.contains(e.position));
    
    if (inZone.length === entities.length) {
      this.stableTime += gameState.deltaTime;
      return this.stableTime >= this.duration ? 'completed' : 'progress';
    } else {
      this.stableTime = 0;
      return 'pending';
    }
  }
}
```

#### Victory Conditions
- **Debounce timer**: Objectives must remain satisfied for 2 seconds
- **Partial credit**: Progress tracking for multi-part objectives
- **Star rating**: Based on efficiency metrics (time, objects, attempts)
- **Replay system**: Record and playback successful solutions

### Save Format & Serialization

#### GameDefinition Delta
```typescript
interface CreationSave {
  version: string;
  metadata: CreationMetadata;
  baseGame: 'toybox-sandbox';
  delta: {
    userObjects: UserObject[];
    joints: JointConfig[];
    cameraPosition?: Vector2;
    cameraZoom?: number;
  };
  thumbnail: string; // Base64 encoded image
  stats: {
    objectCount: number;
    jointCount: number;
    complexity: number; // 0-100 calculated score
  };
}
```

#### Compression & Optimization
- **JSON compression**: gzip for network transfer
- **Asset deduplication**: Reuse common sprites
- **Incremental loading**: Load objects as they enter viewport
- **Lazy evaluation**: Generate sprites on-demand

### Performance Considerations

#### Object Management
- **Spatial partitioning**: Quad-tree for collision detection
- **Level-of-detail**: Reduce physics fidelity for distant objects
- **Culling**: Skip rendering for off-screen objects
- **Pooling**: Reuse object instances to reduce GC pressure

#### Memory Management
- **Texture atlasing**: Combine small sprites into larger textures
- **Asset streaming**: Load/unload assets based on usage
- **Cache limits**: Maximum 100MB sprite cache
- **Garbage collection**: Explicit cleanup of unused objects

---

## Success Metrics

### Engagement Metrics
- **Session duration**: Target 15+ minutes average
- **Creation completion rate**: >60% of started creations are saved
- **Challenge completion rate**: >40% of attempted challenges completed
- **Return rate**: >30% of users return within 7 days

### Content Metrics
- **Creations per user**: Target 3+ saved creations per active user
- **Sharing rate**: >20% of creations are shared
- **Remix rate**: >10% of shared creations are remixed
- **Community growth**: 50+ new creations per week at scale

### Technical Metrics
- **Performance**: Maintain 60 FPS with 30+ objects
- **Stability**: <1% crash rate during normal usage
- **Load times**: <3 seconds from launch to playable
- **Success rate**: >95% of object generation requests succeed

### Quality Metrics
- **User satisfaction**: >4.0/5.0 average rating
- **Creation quality**: >70% of shared creations receive positive ratings
- **AI accuracy**: >90% of generated objects match user intent
- **Physics realism**: <5% of user reports about "unrealistic" behavior

---

## Development Phases

### Phase 1: Core Sandbox (3 weeks)
- [ ] Object spawning with basic archetypes
- [ ] Joint creation system (fixed, hinge, spring)
- [ ] Physics simulation with Box2D
- [ ] Save/load functionality
- [ ] Basic UI for object creation and manipulation

### Phase 2: AI Integration (2 weeks)
- [ ] Prompt processing pipeline
- [ ] AI sprite generation integration
- [ ] Property inference system
- [ ] Object taxonomy implementation
- [ ] Advanced physics properties

### Phase 3: Challenge System (2 weeks)
- [ ] Challenge definition format
- [ ] Objective validation system
- [ ] Victory condition detection
- [ ] Star rating calculation
- [ ] 10 sample challenges

### Phase 4: Sharing & Gallery (1 week)
- [ ] Share code generation
- [ ] Creation gallery interface
- [ ] Browse and search functionality
- [ ] Remix system
- [ ] Community features

### Phase 5: Polish & Launch (1 week)
- [ ] Performance optimization
- [ ] Bug fixes and stability
- [ ] Tutorial and onboarding
- [ ] Analytics integration
- [ ] App store preparation

---

## Risk Assessment

### Technical Risks
- **Physics instability**: Complex joint systems may cause simulation breakdown
  - *Mitigation*: Extensive testing, joint limits, automatic stabilization
- **AI generation quality**: Generated objects may not match user expectations
  - *Mitigation*: Fallback to manual property editing, user feedback system
- **Performance scaling**: Many objects may cause frame rate drops
  - *Mitigation*: Object limits, LOD system, performance profiling

### Design Risks
- **Complexity barrier**: Joint system may be too complex for casual users
  - *Mitigation*: Progressive disclosure, tutorial system, smart defaults
- **Content quality**: User-generated content may be low quality
  - *Mitigation*: Curation system, rating mechanism, featured content
- **Retention**: Sandbox games can lack long-term engagement
  - *Mitigation*: Regular challenge updates, community events, social features

### Business Risks
- **Market fit**: Uncertain demand for physics sandbox games
  - *Mitigation*: Early user testing, MVP approach, pivot capability
- **Competition**: Existing physics games and creation tools
  - *Mitigation*: Focus on AI differentiation, superior UX, community building
- **Monetization**: Free-to-play model may not generate sufficient revenue
  - *Mitigation*: Premium features, cosmetics, challenge packs

---

## Conclusion

ToyBox Physics Sandbox represents a unique opportunity to democratize physics-based game creation through AI assistance. By removing the technical barriers of traditional physics editors while maintaining creative depth, the game can attract both casual creators and serious physics enthusiasts.

The key to success lies in the seamless integration of natural language processing, physics simulation, and community features. The AI-driven object generation must feel magical while remaining predictable and controllable. The challenge system provides structured goals for players who need direction, while the open sandbox mode enables unlimited creativity.

With careful attention to performance, stability, and user experience, ToyBox Physics Sandbox can establish itself as the premier mobile physics creation platform, fostering a vibrant community of creators and players.