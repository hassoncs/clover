# Pet Pocket Parkour - Game Specification

**Version**: 1.0  
**Date**: 2026-01-27  
**Status**: Specification Draft

---

## Executive Summary

**Pet Pocket Parkour** is a physics-based platformer that combines the joy of pet customization with engaging short-form gameplay. Players create unique AI-generated pets with distinct body shapes that directly affect gameplay mechanics, then guide their companions through bite-sized platforming challenges.

The game's core innovation lies in its **morphology-driven gameplay**: a round pet rolls down slopes and bounces off walls, while a long pet can bridge gaps and squeeze through tight spaces. This creates a strategic layer where pet customization isn't just cosmetic—it's tactical.

**Target Audience**: Casual mobile gamers who enjoy pet games, platformers, and creative customization  
**Session Length**: 2-5 minutes per level  
**Core Loop Duration**: 15-30 minutes (customize → play 3-5 levels → unlock new accessories)

---

## Detailed Game Mechanics

### Core Gameplay Loop

1. **Pet Customization Phase** (2-3 minutes)
   - Select base body archetype (Round, Long, Sticky, Bouncy)
   - Generate AI pet texture with natural language ("fluffy orange tabby with tiny wings")
   - Equip unlocked accessories (functional and cosmetic)
   - Preview pet physics in mini sandbox

2. **Level Play Phase** (30-60 seconds per level)
   - Navigate physics-based platforming challenges
   - Collect stars (1-3 per level based on performance)
   - Gather coins and special accessories
   - Pet mood affects abilities (happy = higher jumps, tired = slower movement)

3. **Progression Phase** (1-2 minutes)
   - Unlock new accessories with collected stars/coins
   - Discover new body archetypes
   - Access new themed worlds
   - Bond meter increases with successful level completion

### Pet Physics Archetypes

#### Round Archetype
- **Physics**: High restitution (0.8), low friction (0.2)
- **Abilities**: 
  - Natural rolling momentum on slopes
  - Bounces off walls and platforms
  - Can curl into ball for speed boost
- **Weaknesses**: Difficult to stop precisely, struggles with vertical climbs
- **Ideal Levels**: Downhill courses, pinball-style bouncing challenges

#### Long Archetype  
- **Physics**: Low restitution (0.1), medium friction (0.5)
- **Abilities**:
  - Can stretch to bridge small gaps
  - Squeezes through narrow passages
  - Stable landing platform for other objects
- **Weaknesses**: Slower movement, vulnerable to getting stuck
- **Ideal Levels**: Gap-crossing puzzles, maze navigation

#### Sticky Archetype
- **Physics**: Very low restitution (0.05), high friction (0.9)
- **Abilities**:
  - Clings to walls and ceilings
  - Slow but precise movement
  - Can hang from platforms
- **Weaknesses**: Very slow, poor at momentum-based challenges
- **Ideal Levels**: Wall-climbing sections, precision platforming

#### Bouncy Archetype
- **Physics**: Very high restitution (1.2), low friction (0.3)
- **Abilities**:
  - Super-high jumps
  - Gains energy from impacts
  - Can reach high platforms easily
- **Weaknesses**: Hard to control, overshoots targets
- **Ideal Levels**: Vertical climbing, trampoline courses

### Level Mechanics

#### Platform Types
- **Standard Platforms**: Basic solid surfaces
- **Crumbling Platforms**: Break after 2 seconds of contact
- **Bouncy Platforms**: Amplify pet's natural bounciness
- **Sticky Platforms**: Increase friction, help with precision
- **Moving Platforms**: Horizontal/vertical/circular motion patterns
- **Seesaw Platforms**: Tilt based on pet weight and position

#### Interactive Elements
- **Springs**: Launch pet in specific direction
- **Fans**: Create wind currents affecting trajectory
- **Magnets**: Attract or repel metallic accessories
- **Portals**: Teleport between entrance/exit pairs
- **Switches**: Activate/deactivate platforms or barriers

#### Collectibles
- **Stars**: 1-3 per level, unlock new content
  - Bronze Star: Complete level
  - Silver Star: Complete under time limit
  - Gold Star: Complete with all coins collected
- **Coins**: Currency for purchasing accessories
- **Accessories**: Rare drops that unlock new customization options

### Accessory System

#### Functional Accessories
- **Jetpack**: Provides double-jump ability, affects physics (reduces gravity)
- **Magnetic Collar**: Attracts nearby coins, affects metal platform interactions
- **Grip Shoes**: Increases friction on all surfaces
- **Feather Wings**: Reduces fall speed, adds gliding
- **Rocket Boots**: Temporary speed boost ability
- **Bubble Shield**: One-time protection from hazards

#### Cosmetic Accessories
- **Hats**: Various styles (top hat, beanie, crown, etc.)
- **Glasses**: Different frames and lens colors
- **Scarves**: Flowing cloth simulation
- **Patterns**: Overlay textures (stripes, spots, gradients)
- **Trails**: Particle effects following pet movement

---

## Game Engine Integration

### GameDefinition Structure

```typescript
interface PetParkourGame extends GameDefinition {
  metadata: {
    id: string;
    title: string;
    worldTheme: 'forest' | 'city' | 'space' | 'underwater';
    difficulty: 1 | 2 | 3 | 4 | 5;
    recommendedArchetype?: PetArchetype;
  };
  
  petConfig: {
    startPosition: { x: number; y: number };
    archetype: PetArchetype;
    accessories: AccessoryConfig[];
    moodState: 'happy' | 'neutral' | 'tired';
  };
  
  levelConfig: {
    timeLimit?: number;
    starThresholds: {
      silver: number; // time in seconds
      gold: number;   // coins required
    };
    hazards: HazardConfig[];
  };
}
```

### Pet Physics Templates

```typescript
const petArchetypes: Record<PetArchetype, EntityTemplate> = {
  round: {
    id: 'pet_round',
    tags: ['pet', 'player'],
    sprite: { type: 'image', imageUrl: '${GENERATED_PET_URL}' },
    physics: {
      bodyType: 'dynamic',
      shape: 'circle',
      radius: 0.5,
      density: 1.0,
      friction: 0.2,
      restitution: 0.8,
      linearDamping: 0.1
    },
    behaviors: [
      { type: 'player_control', jumpForce: 8, moveSpeed: 5 },
      { type: 'mood_physics', moodVariable: 'petMood' },
      { type: 'accessory_effects', accessories: '${EQUIPPED_ACCESSORIES}' }
    ]
  },
  
  long: {
    id: 'pet_long',
    tags: ['pet', 'player'],
    sprite: { type: 'image', imageUrl: '${GENERATED_PET_URL}' },
    physics: {
      bodyType: 'dynamic',
      shape: 'box',
      width: 1.2,
      height: 0.4,
      density: 1.0,
      friction: 0.5,
      restitution: 0.1,
      linearDamping: 0.3
    },
    behaviors: [
      { type: 'player_control', jumpForce: 6, moveSpeed: 3 },
      { type: 'stretch_ability', maxStretch: 1.8 },
      { type: 'bridge_mode', activationKey: 'action' }
    ]
  }
  
  // ... sticky and bouncy archetypes
};
```

### Platform Templates

```typescript
const platformTemplates = {
  standard: {
    id: 'platform_standard',
    tags: ['platform', 'solid'],
    sprite: { type: 'rect', width: 2, height: 0.3, color: '#8B4513' },
    physics: { bodyType: 'static', shape: 'box', width: 2, height: 0.3 }
  },
  
  crumbling: {
    id: 'platform_crumbling',
    tags: ['platform', 'crumbling'],
    sprite: { type: 'rect', width: 2, height: 0.3, color: '#D2691E' },
    physics: { bodyType: 'static', shape: 'box', width: 2, height: 0.3 },
    behaviors: [
      { type: 'crumble_on_contact', delay: 2000, effect: 'shake_then_fall' }
    ]
  },
  
  bouncy: {
    id: 'platform_bouncy',
    tags: ['platform', 'bouncy'],
    sprite: { type: 'rect', width: 2, height: 0.3, color: '#FF69B4' },
    physics: { 
      bodyType: 'static', 
      shape: 'box', 
      width: 2, 
      height: 0.3,
      restitution: 1.5 
    }
  }
};
```

### Level Progression System

```typescript
interface LevelProgression {
  worldId: string;
  levelId: string;
  unlockRequirements: {
    starsRequired: number;
    previousLevel?: string;
    archetypeUnlocked?: PetArchetype;
  };
  rewards: {
    stars: number;
    coins: number;
    accessories?: string[];
    newArchetype?: PetArchetype;
  };
}
```

### Pet State Variables

```typescript
interface PetState {
  // Core stats
  archetype: PetArchetype;
  moodLevel: number; // 0-100, affects physics multipliers
  bondLevel: number; // 0-100, unlocks new abilities
  
  // Physics modifiers
  jumpMultiplier: number;
  speedMultiplier: number;
  frictionMultiplier: number;
  
  // Equipped accessories
  accessories: {
    functional: AccessoryConfig[];
    cosmetic: AccessoryConfig[];
  };
  
  // Progression
  unlockedArchetypes: PetArchetype[];
  completedLevels: string[];
  totalStars: number;
  totalCoins: number;
}
```

---

## Graphics & Asset Requirements

### Pet Base Sprites

#### Archetype Variations
- **Round Pet Base**: 128x128px circle, neutral pose
- **Long Pet Base**: 192x96px rectangle, neutral pose  
- **Sticky Pet Base**: 128x128px with visible grip pads
- **Bouncy Pet Base**: 128x128px with spring-like compression

#### Animation Frames (per archetype)
- **Idle**: 4 frames, breathing animation
- **Walking**: 6 frames, movement cycle
- **Jumping**: 3 frames (crouch, launch, air)
- **Landing**: 2 frames (impact, settle)
- **Special Ability**: 4-6 frames (archetype-specific)
- **Happy**: 3 frames (celebration animation)
- **Tired**: 2 frames (drooping, slow blink)

### Accessory Sprites

#### Functional Accessories
- **Jetpack**: 64x64px, with flame animation (3 frames)
- **Magnetic Collar**: 32x16px, with spark effects
- **Grip Shoes**: 24x24px per foot, textured surface
- **Feather Wings**: 48x32px per wing, flapping animation (4 frames)
- **Rocket Boots**: 32x32px per boot, with exhaust trail
- **Bubble Shield**: 96x96px transparent overlay, shimmer effect

#### Cosmetic Accessories  
- **Hats**: 48x48px, various styles (10+ variations)
- **Glasses**: 32x16px, different frames and lens colors
- **Scarves**: 64x16px, cloth physics simulation
- **Patterns**: Overlay textures at pet resolution
- **Trails**: Particle system sprites (8x8px particles)

### Platform Sprites

#### Basic Platforms
- **Standard**: 128x32px wooden texture, tileable
- **Crumbling**: 128x32px cracked stone, damage states (3 frames)
- **Bouncy**: 128x32px rubber/gel texture, compression animation
- **Sticky**: 128x32px rough surface with grip texture
- **Metal**: 128x32px metallic surface, reflective

#### Interactive Elements
- **Springs**: 32x64px, compression animation (4 frames)
- **Fans**: 64x64px, rotation animation (8 frames)
- **Magnets**: 48x48px, with magnetic field effect
- **Portals**: 64x64px, swirling animation (12 frames)
- **Switches**: 32x32px, on/off states

### Background Assets

#### Forest World
- **Background**: 1024x768px layered forest scene
- **Midground**: Trees, bushes, rocks (parallax layer)
- **Foreground**: Leaves, branches (depth layer)
- **Ambient**: Particle effects (falling leaves, dust motes)

#### City World  
- **Background**: 1024x768px urban skyline
- **Midground**: Buildings, billboards (parallax layer)
- **Foreground**: Street elements, signs (depth layer)
- **Ambient**: Traffic lights, window glows, smog particles

#### Space World
- **Background**: 1024x768px starfield with nebula
- **Midground**: Planets, asteroids (parallax layer)
- **Foreground**: Space debris, satellites (depth layer)
- **Ambient**: Twinkling stars, cosmic dust

#### Underwater World
- **Background**: 1024x768px ocean depths
- **Midground**: Coral reefs, rock formations (parallax layer)
- **Foreground**: Seaweed, bubbles (depth layer)
- **Ambient**: Floating particles, light rays

### UI Elements

#### Pet Customization Screen
- **Pet Preview**: 256x256px viewport with rotation controls
- **Archetype Selector**: 64x64px icons for each type
- **Accessory Grid**: 48x48px slots with drag-and-drop
- **Color Picker**: HSV wheel with preview
- **AI Prompt Box**: Text input with example suggestions

#### Gameplay HUD
- **Pet Mood Indicator**: 128x32px mood bar with pet face
- **Star Counter**: 32x32px star icon with number
- **Coin Counter**: 32x32px coin icon with number
- **Timer**: Digital display, changes color as time runs low
- **Accessory Status**: 32x32px icons showing active effects

---

## AI Pet Generation

### Body Archetype Selection

The AI generation system must maintain consistency between the user's text prompt and the selected archetype's physics properties:

```typescript
interface ArchetypeMapping {
  keywords: string[];
  archetype: PetArchetype;
  physicsHints: string[];
}

const archetypeKeywords: ArchetypeMapping[] = [
  {
    keywords: ['round', 'ball', 'sphere', 'chubby', 'rotund', 'plump'],
    archetype: 'round',
    physicsHints: ['bouncy', 'rolls', 'spherical body']
  },
  {
    keywords: ['long', 'stretched', 'sausage', 'dachshund', 'snake', 'noodle'],
    archetype: 'long', 
    physicsHints: ['elongated', 'flexible', 'can bridge gaps']
  },
  {
    keywords: ['sticky', 'gecko', 'spider', 'clingy', 'grippy'],
    archetype: 'sticky',
    physicsHints: ['adhesive pads', 'wall-climbing', 'high friction']
  },
  {
    keywords: ['bouncy', 'spring', 'rubber', 'elastic', 'kangaroo'],
    archetype: 'bouncy',
    physicsHints: ['super elastic', 'high jumps', 'trampoline-like']
  }
];
```

### AI Texture Generation Pipeline

1. **Prompt Analysis**: Parse user input for archetype keywords and visual descriptors
2. **Archetype Assignment**: Map to physics archetype based on keywords
3. **Prompt Enhancement**: Add archetype-specific visual cues to AI prompt
4. **Base Generation**: Generate pet texture at 512x512px resolution
5. **Archetype Fitting**: Resize and adjust to match archetype proportions
6. **Accessory Preparation**: Generate attachment point masks for accessories

### Example AI Prompts

```typescript
const promptTemplates = {
  round: "A cute, round ${animal} with ${description}, spherical body shape, chubby and rotund, perfect circle silhouette, cartoon style, clean background",
  
  long: "A cute, elongated ${animal} with ${description}, stretched sausage-like body, long and flexible, dachshund proportions, cartoon style, clean background",
  
  sticky: "A cute ${animal} with ${description}, gecko-like appearance, visible grip pads on feet, wall-climbing features, cartoon style, clean background",
  
  bouncy: "A cute, springy ${animal} with ${description}, elastic rubber-like texture, kangaroo-inspired proportions, bouncy appearance, cartoon style, clean background"
};
```

### Accessory Attachment System

Each generated pet includes attachment point metadata:

```typescript
interface AttachmentPoints {
  head: { x: number; y: number; rotation: number };
  back: { x: number; y: number; rotation: number };
  feet: Array<{ x: number; y: number; rotation: number }>;
  tail?: { x: number; y: number; rotation: number };
}
```

Accessories are dynamically positioned and scaled based on these points, ensuring proper fit regardless of the AI-generated pet's unique proportions.

### Animation Consistency

The system generates animation frames that maintain the pet's unique AI-generated appearance:

1. **Base Frame**: AI-generated static pet image
2. **Deformation Maps**: Define how the pet's shape changes during animations
3. **Texture Warping**: Apply deformations while preserving visual details
4. **Accessory Tracking**: Ensure accessories follow attachment points through animations

---

## UI/UX Flow

### Pet Customization Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ [Back] Pet Customization                    [Play] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │                 │    │ Archetype Selection         │ │
│  │   Pet Preview   │    │ ○ Round  ○ Long            │ │
│  │   (Rotatable)   │    │ ○ Sticky ○ Bouncy          │ │
│  │                 │    │                             │ │
│  └─────────────────┘    │ AI Description:             │ │
│                         │ ┌─────────────────────────┐ │ │
│  ┌─────────────────┐    │ │"fluffy orange tabby    │ │ │
│  │ Physics Preview │    │ │ with tiny wings"       │ │ │
│  │ (Mini Sandbox)  │    │ └─────────────────────────┘ │ │
│  └─────────────────┘    │ [Generate Pet]              │ │
│                         └─────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Accessory Inventory                                 │ │
│  │ [Hat] [Glasses] [Jetpack] [Shoes] [Collar] [...]   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Interaction Flow
1. **Archetype Selection**: Tap archetype → Preview physics in mini sandbox
2. **AI Generation**: Enter description → Generate button → Loading → Preview result
3. **Accessory Equipping**: Drag accessories from inventory to pet preview
4. **Physics Testing**: Mini sandbox shows how pet moves with current setup
5. **Confirmation**: Play button launches into level select

### Level Select Map

#### World Map Structure
```
┌─────────────────────────────────────────────────────────┐
│ [Customize Pet]  World 1: Forest      [Settings] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     ○ ──── ○ ──── ○ ──── ○                             │
│    1-1    1-2    1-3    1-4                            │
│   ★★★    ★★☆    ★☆☆    🔒                             │
│                                                         │
│           ○ ──── ○ ──── ○                              │
│          1-5    1-6    1-7                             │
│         ★★☆    ★☆☆    🔒                              │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Level 1-2: "Bouncy Canyon"                         │ │
│  │ Recommended: Round or Bouncy archetype             │ │
│  │ Best Time: 45.2s  Your Best: 52.1s                │ │
│  │ Stars: ★★☆  Coins: 15/20                          │ │
│  │ [Play Level]                                       │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Navigation Features
- **Path Progression**: Levels unlock sequentially along branching paths
- **Star Requirements**: Some levels require minimum stars to unlock
- **Archetype Hints**: Visual indicators suggest optimal pet types
- **Progress Tracking**: Clear display of completion status and best scores

### Gameplay HUD

#### In-Game Interface
```
┌─────────────────────────────────────────────────────────┐
│ ★ 2/3    💰 45    ⏱️ 0:32    😊 Pet Mood: Happy      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    [Game World]                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│ │ 🚀      │  │ 🧲      │  │         │  │         │     │
│ │Jetpack  │  │Magnet   │  │         │  │         │     │
│ │ Ready   │  │ 3s      │  │         │  │         │     │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────────────────┘
```

#### HUD Elements
- **Star Progress**: Shows current stars collected in level
- **Coin Counter**: Real-time coin collection display
- **Timer**: Counts up, changes color near time limits
- **Pet Mood**: Affects physics, shown with emoji and bar
- **Accessory Status**: Shows active accessories and cooldowns

### Level Complete Screen

#### Results Display
```
┌─────────────────────────────────────────────────────────┐
│                 Level Complete!                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────┐                        │
│              │                 │                        │
│              │   [Pet Happy    │                        │
│              │    Animation]   │                        │
│              │                 │                        │
│              └─────────────────┘                        │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Results:                                            │ │
│  │ Time: 47.3s  (Silver: <50s ✓)                     │ │
│  │ Coins: 18/20  (Gold: 20 ✗)                        │ │
│  │ Stars Earned: ★★☆                                  │ │
│  │                                                     │ │
│  │ Rewards:                                            │ │
│  │ + 50 coins                                          │ │
│  │ + Pilot Goggles (new accessory!)                   │ │
│  │ + Pet Bond +5                                       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│     [Retry]    [Next Level]    [Level Select]          │
└─────────────────────────────────────────────────────────┘
```

#### Progression Feedback
- **Performance Analysis**: Clear breakdown of star requirements
- **Reward Display**: Show earned coins, accessories, and bond increases
- **Next Steps**: Easy navigation to continue playing or retry for better score
- **Pet Reaction**: Animated pet response based on performance level

---

## Technical Notes

### Pet Physics Parameter Tuning

#### Archetype Base Values
```typescript
const archetypePhysics = {
  round: {
    density: 1.0,
    friction: 0.2,
    restitution: 0.8,
    linearDamping: 0.1,
    angularDamping: 0.05,
    jumpForce: 8,
    moveSpeed: 5
  },
  
  long: {
    density: 0.8,
    friction: 0.5,
    restitution: 0.1,
    linearDamping: 0.3,
    angularDamping: 0.2,
    jumpForce: 6,
    moveSpeed: 3
  },
  
  sticky: {
    density: 1.2,
    friction: 0.9,
    restitution: 0.05,
    linearDamping: 0.5,
    angularDamping: 0.4,
    jumpForce: 4,
    moveSpeed: 2
  },
  
  bouncy: {
    density: 0.6,
    friction: 0.3,
    restitution: 1.2,
    linearDamping: 0.05,
    angularDamping: 0.1,
    jumpForce: 12,
    moveSpeed: 4
  }
};
```

#### Mood Multipliers
```typescript
const moodEffects = {
  happy: {
    jumpMultiplier: 1.2,
    speedMultiplier: 1.1,
    frictionMultiplier: 0.9
  },
  neutral: {
    jumpMultiplier: 1.0,
    speedMultiplier: 1.0,
    frictionMultiplier: 1.0
  },
  tired: {
    jumpMultiplier: 0.8,
    speedMultiplier: 0.7,
    frictionMultiplier: 1.3
  }
};
```

### Body Shape → Collider Mapping

#### Dynamic Collider Generation
```typescript
interface ColliderConfig {
  shape: 'circle' | 'box' | 'polygon';
  dimensions: {
    radius?: number;
    width?: number;
    height?: number;
    vertices?: Array<{x: number, y: number}>;
  };
}

function generateCollider(archetype: PetArchetype, aiImageData: ImageData): ColliderConfig {
  switch(archetype) {
    case 'round':
      return {
        shape: 'circle',
        dimensions: { radius: calculateAverageRadius(aiImageData) }
      };
      
    case 'long':
      const bounds = calculateBoundingBox(aiImageData);
      return {
        shape: 'box',
        dimensions: { 
          width: bounds.width * 0.9,  // Slight padding
          height: bounds.height * 0.8 
        }
      };
      
    case 'sticky':
      return {
        shape: 'polygon',
        dimensions: { 
          vertices: generateConvexHull(aiImageData, 8) // 8-sided approximation
        }
      };
      
    case 'bouncy':
      return {
        shape: 'circle',
        dimensions: { radius: calculateAverageRadius(aiImageData) * 1.1 } // Slightly larger for bounce effect
      };
  }
}
```

### Accessory Attachment Points

#### Dynamic Attachment Detection
```typescript
interface AttachmentPoint {
  id: string;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
  priority: number; // For conflict resolution
}

function detectAttachmentPoints(petImage: ImageData, archetype: PetArchetype): AttachmentPoint[] {
  const points: AttachmentPoint[] = [];
  
  // Head detection (highest point with sufficient width)
  const headPoint = findHighestWidthPoint(petImage);
  points.push({
    id: 'head',
    position: headPoint,
    rotation: 0,
    scale: 1.0,
    priority: 1
  });
  
  // Back detection (top center of mass)
  const backPoint = findCenterOfMass(petImage, 'top');
  points.push({
    id: 'back',
    position: backPoint,
    rotation: 0,
    scale: 0.8,
    priority: 2
  });
  
  // Feet detection (bottom contact points)
  const feetPoints = findGroundContactPoints(petImage);
  feetPoints.forEach((point, index) => {
    points.push({
      id: `foot_${index}`,
      position: point,
      rotation: 0,
      scale: 0.6,
      priority: 3
    });
  });
  
  return points;
}
```

### Procedural Level Generation

#### Level Template System
```typescript
interface LevelTemplate {
  id: string;
  difficulty: number;
  recommendedArchetype?: PetArchetype;
  platformDensity: number;
  hazardDensity: number;
  collectibleDensity: number;
  specialFeatures: string[];
}

const levelTemplates: LevelTemplate[] = [
  {
    id: 'rolling_hills',
    difficulty: 1,
    recommendedArchetype: 'round',
    platformDensity: 0.3,
    hazardDensity: 0.1,
    collectibleDensity: 0.4,
    specialFeatures: ['slopes', 'bouncy_platforms']
  },
  
  {
    id: 'gap_crossing',
    difficulty: 2,
    recommendedArchetype: 'long',
    platformDensity: 0.2,
    hazardDensity: 0.2,
    collectibleDensity: 0.3,
    specialFeatures: ['wide_gaps', 'narrow_passages']
  },
  
  {
    id: 'wall_climbing',
    difficulty: 3,
    recommendedArchetype: 'sticky',
    platformDensity: 0.4,
    hazardDensity: 0.3,
    collectibleDensity: 0.2,
    specialFeatures: ['vertical_walls', 'ceiling_sections']
  },
  
  {
    id: 'bounce_house',
    difficulty: 2,
    recommendedArchetype: 'bouncy',
    platformDensity: 0.5,
    hazardDensity: 0.2,
    collectibleDensity: 0.5,
    specialFeatures: ['trampolines', 'high_platforms']
  }
];
```

#### Generation Algorithm
```typescript
function generateLevel(template: LevelTemplate, seed: number): GameDefinition {
  const rng = new SeededRandom(seed);
  const platforms: GameEntity[] = [];
  const collectibles: GameEntity[] = [];
  const hazards: GameEntity[] = [];
  
  // Generate main path
  const pathPoints = generateMainPath(template, rng);
  
  // Place platforms along path
  pathPoints.forEach((point, index) => {
    if (rng.random() < template.platformDensity) {
      platforms.push(createPlatform(point, template, rng));
    }
  });
  
  // Add collectibles
  const collectibleCount = Math.floor(pathPoints.length * template.collectibleDensity);
  for (let i = 0; i < collectibleCount; i++) {
    const position = selectCollectiblePosition(pathPoints, platforms, rng);
    collectibles.push(createCollectible(position, rng));
  }
  
  // Add hazards
  const hazardCount = Math.floor(pathPoints.length * template.hazardDensity);
  for (let i = 0; i < hazardCount; i++) {
    const position = selectHazardPosition(pathPoints, platforms, rng);
    hazards.push(createHazard(position, template, rng));
  }
  
  return buildGameDefinition(template, platforms, collectibles, hazards);
}
```

---

## Success Metrics

### Player Engagement Metrics

#### Session Metrics
- **Average Session Length**: Target 15-20 minutes
- **Levels Per Session**: Target 3-5 levels completed
- **Customization Time**: Target 2-3 minutes per pet creation
- **Retry Rate**: Target <30% of levels require multiple attempts

#### Retention Metrics
- **Day 1 Retention**: Target >70%
- **Day 7 Retention**: Target >40%
- **Day 30 Retention**: Target >20%
- **Pet Attachment**: Players who customize >3 pets have 2x retention

#### Progression Metrics
- **Level Completion Rate**: Target >80% for first world
- **Star Collection Rate**: Target 60% silver stars, 30% gold stars
- **Archetype Usage**: Each archetype used by >60% of players
- **Accessory Engagement**: Target >5 accessories equipped per active player

### Technical Performance Metrics

#### Performance Targets
- **Frame Rate**: Maintain 60 FPS on target devices
- **Load Times**: 
  - Pet generation: <5 seconds
  - Level load: <2 seconds
  - Asset download: <10 seconds for full world
- **Memory Usage**: <200MB peak on mobile devices
- **Battery Impact**: <5% drain per 30-minute session

#### AI Generation Metrics
- **Generation Success Rate**: >95% of prompts produce usable pets
- **Generation Time**: <5 seconds average per pet
- **Player Satisfaction**: >80% of generated pets are kept (not regenerated)
- **Prompt Diversity**: Support >1000 unique pet combinations

### Business Metrics

#### Monetization (Future Considerations)
- **Accessory Purchase Rate**: Target 15% of players purchase premium accessories
- **World Unlock Rate**: Target 40% of players unlock second world
- **Premium Pet Slots**: Target 25% of players upgrade pet storage
- **Season Pass Engagement**: Target 60% completion rate for battle pass

#### Content Consumption
- **World Progression**: Target 70% of players complete World 1
- **Level Replay Rate**: Target 30% of levels replayed for better scores
- **Pet Collection**: Target 3.5 pets created per active player
- **Social Sharing**: Target 10% of players share pet creations

### Quality Assurance Metrics

#### Bug Tracking
- **Critical Bugs**: 0 tolerance for game-breaking issues
- **Physics Glitches**: <1% of gameplay sessions affected
- **AI Generation Failures**: <5% failure rate, graceful fallbacks
- **Platform Compatibility**: 100% compatibility across target devices

#### Player Satisfaction
- **App Store Rating**: Target >4.5 stars
- **Support Ticket Volume**: <2% of players contact support
- **Positive Feedback**: >80% of reviews mention pet customization positively
- **Gameplay Balance**: <10% of players report archetype imbalance

---

## Implementation Roadmap

### Phase 1: Core Engine (4-6 weeks)
- [ ] Basic pet physics archetypes
- [ ] Platform and hazard templates
- [ ] Simple level progression system
- [ ] Basic UI framework

### Phase 2: AI Integration (3-4 weeks)
- [ ] AI pet generation pipeline
- [ ] Attachment point detection
- [ ] Accessory system implementation
- [ ] Pet animation system

### Phase 3: Content Creation (4-5 weeks)
- [ ] World 1 level design (15 levels)
- [ ] Accessory catalog (20+ items)
- [ ] Background and UI art
- [ ] Sound effects and music

### Phase 4: Polish & Launch (3-4 weeks)
- [ ] Performance optimization
- [ ] Tutorial and onboarding
- [ ] Analytics integration
- [ ] App store preparation

**Total Estimated Timeline**: 14-19 weeks

---

## Risk Assessment

### Technical Risks
- **AI Generation Consistency**: Mitigation through extensive prompt testing and fallback systems
- **Physics Balance**: Mitigation through iterative playtesting and parameter tuning
- **Performance on Low-End Devices**: Mitigation through scalable graphics settings
- **Cross-Platform Compatibility**: Mitigation through comprehensive device testing

### Design Risks
- **Archetype Balance**: Risk of one archetype being overpowered; mitigation through level design variety
- **Complexity Overwhelm**: Risk of too many systems; mitigation through gradual feature introduction
- **Pet Attachment Failure**: Risk of players not bonding with AI pets; mitigation through personality systems

### Market Risks
- **Niche Appeal**: Risk of limited audience; mitigation through broad accessibility features
- **Competition**: Risk from established pet/platformer games; mitigation through unique AI differentiation
- **Monetization Challenges**: Risk of low conversion; mitigation through generous free content

---

## Conclusion

Pet Pocket Parkour represents an innovative fusion of AI-generated content, physics-based gameplay, and emotional pet bonding. The game's unique morphology-driven mechanics create a strategic layer that goes beyond traditional platformers, while the AI pet generation system ensures every player has a truly unique companion.

The modular design allows for rapid content expansion, with new worlds, archetypes, and accessories easily integrated into the existing framework. The focus on short, replayable levels makes it ideal for mobile gaming sessions while maintaining depth through the pet customization and progression systems.

Success will depend on achieving the right balance between accessibility and depth, ensuring the AI generation system produces consistently appealing results, and creating an emotional connection between players and their AI-generated pets. With careful execution, Pet Pocket Parkour has the potential to establish a new subgenre of AI-enhanced casual games.