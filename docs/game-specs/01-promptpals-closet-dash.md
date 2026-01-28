# Game Specification: PromptPals Closet Dash

> **Status**: Design Document  
> **Priority**: 🔴 HIGHEST - Phase 1, Week 1  
> **Type**: Endless Runner + Avatar Customization  
> **Target**: Kids 6-12, Casual Players  
> **Estimated Effort**: 2-3 days  

---

## Executive Summary

PromptPals Closet Dash combines the proven endless runner mechanic with AI-powered avatar customization. Players collect outfit pieces during runs, then customize their avatar between rounds. The "magic" comes from AI-generated themes—one text prompt transforms the entire visual experience.

**Core Loop**: Run → Collect → Customize → Share → Run Again  
**Unique Hook**: "Type any theme, get a unique game"  
**Viral Moment**: Screenshot of custom avatar in themed world

---

## Game Mechanics

### 1. Endless Runner Core

**Movement System**:
- 3-lane horizontal runner (like Subway Surfers)
- Auto-forward movement at increasing speed
- Swipe left/right to change lanes
- Swipe up to jump (over obstacles)
- Swipe down to slide (under barriers)

**World Generation**:
- Procedural chunk-based level generation
- Pre-designed chunk templates (straight, curved, obstacles)
- Speed increases over time (difficulty curve)
- Run ends on collision with obstacle

**Collectibles**:
- **Coins**: Basic currency, spawn in patterns
- **Outfit Pieces**: Hats, shirts, pants, shoes, accessories
- **Power-ups**: Magnet, Shield, Score Multiplier

### 2. Avatar Customization System

**Body Structure** (Layered Sprite System):
```
Avatar Hierarchy:
├── Base Body (skin tone, shape)
├── Face (eyes, mouth, expression)
├── Hair (style, color)
├── Top (shirts, jackets, dresses)
├── Bottom (pants, skirts, shorts)
├── Shoes (sneakers, boots, sandals)
└── Accessories (hats, glasses, jewelry, wings, etc.)
```

**Customization Flow**:
1. Post-run screen shows collected items
2. Tap "Customize" to enter wardrobe
3. Tap body part category → Select item → Preview on avatar
4. Save outfit or randomize
5. Outfit persists across runs

### 3. Theme System (AI-Powered)

**Theme Generation**:
```
User Input: "space skater with neon helmet"

AI Generates:
├── Player Avatar:
│   ├── Helmet sprite (neon glowing)
│   ├── Jacket sprite (space suit style)
│   ├── Shoes sprite (rocket boots)
│   └── Trail effect (star particles)
├── World Theme:
│   ├── Background (space station, planets)
│   ├── Ground texture (metal grating)
│   ├── Obstacles (asteroids, satellites)
│   └── Collectibles (energy orbs, alien artifacts)
└── UI Theme:
    ├── Color palette (neon blues/purples)
    └── Font style (futuristic)
```

**Theme Categories** (Preset Prompts):
- **Fantasy**: "Dragon princess in crystal castle"
- **Sci-Fi**: "Robot explorer on Mars"
- **Nature**: "Forest fairy with butterfly wings"
- **Food**: "Pizza chef in cheese world"
- **Animals**: "Cat astronaut in space"
- **Seasonal**: "Winter wonderland snowman"

**Theme Unlocking**:
- Free daily theme
- Unlock with coins
- Special event themes (holiday limited)
- Pro subscription: All themes + custom prompts

---

## Game Engine Integration

### GameDefinition Structure

```typescript
const game: GameDefinition = {
  metadata: {
    id: "promptpals-closet-dash",
    title: "PromptPals Closet Dash",
    version: "1.0.0",
  },
  
  world: {
    gravity: { x: 0, y: -15 }, // Slight gravity for jump arc
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 20 },
  },
  
  camera: {
    type: "follow",
    target: "player",
    offset: { x: 0, y: -5 },
    zoom: 1,
  },
  
  input: {
    swipe: {
      enabled: true,
      directions: ["left", "right", "up", "down"],
    },
  },
  
  variables: {
    // Game state
    score: 0,
    coins: 0,
    runDistance: 0,
    speed: 10,
    
    // Avatar state (persistent)
    avatarConfig: {
      bodyType: "default",
      skinTone: "#ffdbac",
      hairStyle: "short",
      hairColor: "#4a3b2a",
      topItem: "tshirt_blue",
      bottomItem: "jeans",
      shoesItem: "sneakers",
      accessories: ["baseball_cap"],
    },
    
    // Current theme
    currentThemeId: "default",
    
    // Inventory
    unlockedItems: ["tshirt_blue", "jeans", "sneakers", "baseball_cap"],
    unlockedThemes: ["default"],
  },
  
  templates: {
    // Player avatar - composed of multiple sprites
    player: {
      id: "player",
      tags: ["player", "runner"],
      // Avatar is a composite - see entity setup
    },
    
    // Outfit piece collectibles
    hatPiece: {
      id: "hatPiece",
      tags: ["collectible", "outfit", "hat"],
      sprite: {
        type: "image",
        imageUrl: "{theme}/collectibles/hat.png",
        imageWidth: 0.8,
        imageHeight: 0.8,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.8,
        height: 0.8,
        isSensor: true,
      },
      behaviors: [
        {
          type: "move",
          direction: "left",
          speed: "{speed}",
        },
      ],
    },
    
    shirtPiece: { /* similar */ },
    pantsPiece: { /* similar */ },
    shoesPiece: { /* similar */ },
    accessoryPiece: { /* similar */ },
    
    // Currency
    coin: {
      id: "coin",
      tags: ["collectible", "coin"],
      sprite: {
        type: "image",
        imageUrl: "{theme}/collectibles/coin.png",
        imageWidth: 0.6,
        imageHeight: 0.6,
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: 0.3,
        isSensor: true,
      },
      behaviors: [
        {
          type: "oscillate",
          axis: "y",
          amplitude: 0.2,
          frequency: 2,
        },
        {
          type: "move",
          direction: "left",
          speed: "{speed}",
        },
      ],
    },
    
    // Obstacles
    obstacleLow: {
      id: "obstacleLow",
      tags: ["obstacle", "ground"],
      sprite: {
        type: "image",
        imageUrl: "{theme}/obstacles/barrier_low.png",
        imageWidth: 1.5,
        imageHeight: 1.0,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 1.5,
        height: 1.0,
      },
      behaviors: [
        {
          type: "move",
          direction: "left",
          speed: "{speed}",
        },
      ],
    },
    
    obstacleHigh: {
      id: "obstacleHigh",
      tags: ["obstacle", "air"],
      sprite: {
        type: "image",
        imageUrl: "{theme}/obstacles/barrier_high.png",
        imageWidth: 1.5,
        imageHeight: 2.5,
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 1.5,
        height: 2.5,
      },
      behaviors: [
        {
          type: "move",
          direction: "left",
          speed: "{speed}",
        },
      ],
    },
    
    // Ground
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: {
        type: "image",
        imageUrl: "{theme}/world/ground.png",
        imageWidth: 20,
        imageHeight: 2,
        repeat: "horizontal",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 20,
        height: 2,
      },
    },
  },
  
  entities: [
    // Player composite entity
    {
      id: "player",
      name: "Player Avatar",
      template: "player",
      transform: { x: -3, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      // Composite sprites reference avatarConfig variables
    },
    
    // Ground segments (spawned dynamically)
    {
      id: "ground-1",
      name: "Ground",
      template: "ground",
      transform: { x: 0, y: -8, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  
  rules: [
    // Collect outfit piece
    {
      id: "collect-outfit",
      trigger: {
        type: "collision",
        entityATag: "player",
        entityBTag: "outfit",
      },
      actions: [
        {
          type: "add_to_inventory",
          item: "{collisionEntity.outfitType}",
        },
        {
          type: "destroy",
          target: { type: "collision_entity" },
        },
        {
          type: "sound",
          soundId: "collect.mp3",
        },
        {
          type: "particle_effect",
          effect: "sparkle",
        },
      ],
    },
    
    // Collect coin
    {
      id: "collect-coin",
      trigger: {
        type: "collision",
        entityATag: "player",
        entityBTag: "coin",
      },
      actions: [
        {
          type: "set_variable",
          name: "coins",
          operation: "add",
          value: 1,
        },
        {
          type: "score",
          operation: "add",
          value: 10,
        },
        {
          type: "destroy",
          target: { type: "collision_entity" },
        },
      ],
    },
    
    // Hit obstacle = game over
    {
      id: "hit-obstacle",
      trigger: {
        type: "collision",
        entityATag: "player",
        entityBTag: "obstacle",
      },
      actions: [
        {
          type: "game_state",
          state: "lose",
        },
        {
          type: "particle_effect",
          effect: "explosion",
        },
      ],
    },
    
    // Speed increase over time
    {
      id: "speed-increase",
      trigger: {
        type: "timer",
        interval: 5,
      },
      actions: [
        {
          type: "set_variable",
          name: "speed",
          operation: "multiply",
          value: 1.05,
        },
      ],
    },
  ],
  
  // Spawning system for endless runner
  spawners: [
    {
      id: "chunk-spawner",
      type: "chunk",
      interval: "{10 / speed}",
      chunkTemplates: ["chunk_easy", "chunk_medium", "chunk_hard"],
      difficultyScaling: true,
    },
  ],
};
```

### Avatar Composite System

The avatar is rendered as multiple overlapping sprites:

```typescript
// Avatar rendering hierarchy
interface AvatarRenderConfig {
  layers: [
    { type: "body_base", sprite: "{bodyType}_{skinTone}", zIndex: 0 },
    { type: "face", sprite: "{faceStyle}", zIndex: 1 },
    { type: "hair_back", sprite: "{hairStyle}_back", zIndex: 2 },
    { type: "bottom", sprite: "{bottomItem}", zIndex: 3 },
    { type: "top", sprite: "{topItem}", zIndex: 4 },
    { type: "shoes", sprite: "{shoesItem}", zIndex: 5 },
    { type: "hair_front", sprite: "{hairStyle}_front", zIndex: 6 },
    { type: "accessory", sprite: "{accessoryItem}", zIndex: 7 },
  ];
}
```

---

## Graphics & Asset Requirements

### 1. UI Assets (Theme-Agnostic)

| Asset | Type | Size | Description |
|-------|------|------|-------------|
| `ui/button_primary.png` | PNG | 256x128 | Primary action button |
| `ui/button_secondary.png` | PNG | 256x128 | Secondary button |
| `ui/coin_icon.png` | PNG | 64x64 | Currency icon |
| `ui/wardrobe_icon.png` | PNG | 64x64 | Wardrobe menu icon |
| `ui/pause_button.png` | PNG | 64x64 | Pause overlay |
| `ui/share_button.png` | PNG | 64x64 | Share screenshot |
| `fonts/game_font.ttf` | TTF | - | Main game font |
| `fonts/fancy_font.ttf` | TTF | - | Theme titles |

### 2. Avatar Base Assets (Theme-Agnostic)

**Body Parts** (Required for every theme):

| Part | Variations | Size | Notes |
|------|------------|------|-------|
| `avatar/body_base.png` | 5 skin tones | 128x256 | Base body shape |
| `avatar/faces/default.png` | 10 expressions | 64x64 | Facial features |
| `avatar/hair/short_{color}.png` | 5 colors | 128x128 | Short hair |
| `avatar/hair/long_{color}.png` | 5 colors | 128x160 | Long hair |
| `avatar/hair/curly_{color}.png` | 5 colors | 128x128 | Curly hair |
| `avatar/hair/spiky_{color}.png` | 5 colors | 128x128 | Spiky hair |

**Clothing Categories** (Theme-Specific):

| Category | Base Assets | Theme Override |
|----------|-------------|----------------|
| Tops | 20 base styles | `{theme}/tops/*.png` |
| Bottoms | 15 base styles | `{theme}/bottoms/*.png` |
| Shoes | 10 base styles | `{theme}/shoes/*.png` |
| Accessories | 30 base items | `{theme}/accessories/*.png` |

### 3. Theme Assets (AI-Generated Per Theme)

**Each theme generates:**

```
themes/{theme_id}/
├── avatar/
│   ├── tops/
│   │   ├── tshirt_01.png (5 styles per theme)
│   │   ├── jacket_01.png
│   │   └── dress_01.png
│   ├── bottoms/
│   │   ├── pants_01.png (3 styles per theme)
│   │   └── skirt_01.png
│   ├── shoes/
│   │   ├── sneakers_01.png (3 styles per theme)
│   │   └── boots_01.png
│   └── accessories/
│       ├── hat_01.png (5 styles per theme)
│       ├── glasses_01.png
│       └── wings_01.png
├── world/
│   ├── background.png (parallax layer 1)
│   ├── midground.png (parallax layer 2)
│   ├── ground.png (tiling texture)
│   └── sky.png (background color/gradient)
├── collectibles/
│   ├── coin.png (animated spin)
│   ├── coin_shine.png (sparkle overlay)
│   ├── outfit_generic.png (generic collectible)
│   └── powerup_*.png (magnet, shield, multiplier)
├── obstacles/
│   ├── barrier_low.png (slide under)
│   ├── barrier_high.png (jump over)
│   └── pit.png (fall through)
└── ui/
    ├── theme_preview.jpg (wardrobe thumbnail)
    └── color_palette.json (theme colors)
```

### 4. Particle Effects

| Effect | Description | Use Case |
|--------|-------------|----------|
| `sparkle` | White sparkles | Collecting items |
| `coin_burst` | Gold particles | Coin collection |
| `explosion` | Fire/smoke | Hitting obstacle |
| `trail` | Player color streak | Running |
| `jump_dust` | Ground dust | Jumping |
| `theme_transition` | Swirl effect | Changing themes |

### 5. Audio Assets

| Sound | File | Trigger |
|-------|------|---------|
| Jump | `sfx/jump.mp3` | Swipe up |
| Slide | `sfx/slide.mp3` | Swipe down |
| Collect | `sfx/collect.mp3` | Get item |
| Coin | `sfx/coin.mp3` | Get coin |
| Crash | `sfx/crash.mp3` | Hit obstacle |
| Theme Change | `sfx/theme_change.mp3` | New theme |
| UI Click | `sfx/ui_click.mp3` | Button tap |
| Music - Menu | `music/menu.mp3` | Looping |
| Music - Run | `music/run_{theme}.mp3` | Theme-specific |

---

## AI Asset Generation Pipeline

### Theme Generation Flow

```mermaid
graph TD
    A[User Input: "space skater"] --> B[Prompt Enhancement]
    B --> C[Generate Outfit Pieces]
    B --> D[Generate World Assets]
    C --> E[Validate & Process]
    D --> E
    E --> F[Cache & Serve]
    F --> G[Update Game Assets]
```

### Prompt Enhancement System

#### Input Processing
```typescript
interface ThemePrompt {
  userInput: string;           // "space skater"
  enhancedPrompt: string;      // "futuristic space-themed skateboarding outfit with neon accents..."
  styleModifiers: string[];    // ["sci-fi", "athletic", "colorful"]
  colorPalette: string[];      // ["#00FFFF", "#FF00FF", "#FFFF00"]
}
```

#### Enhancement Examples
```typescript
const promptEnhancements = {
  "space skater": {
    outfit: "Futuristic skateboarding outfit with space helmet, neon-lit protective gear, anti-gravity boots, and cosmic-themed accessories",
    world: "Alien skate park with floating ramps, nebula backgrounds, and asteroid obstacles",
    colors: ["electric blue", "neon pink", "cosmic purple", "silver chrome"]
  },
  
  "underwater princess": {
    outfit: "Elegant mermaid-inspired dress with flowing fabric, seashell accessories, coral crown, and pearl jewelry",
    world: "Underwater palace with coral reefs, swimming fish, and bubble streams",
    colors: ["ocean blue", "pearl white", "coral pink", "seaweed green"]
  },
  
  "cyberpunk ninja": {
    outfit: "High-tech ninja suit with LED strips, digital mask, cyber weapons, and holographic elements",
    world: "Neon-lit cityscape with digital billboards, laser obstacles, and rain effects",
    colors: ["neon green", "electric purple", "chrome silver", "warning orange"]
  }
};
```

### Asset Generation Constraints

#### Technical Specifications
- **Image Dimensions**: 512x512px for outfit pieces, 2048x1024px for backgrounds
- **File Format**: PNG with transparency support
- **Color Depth**: 32-bit RGBA
- **Compression**: Optimized for mobile (< 200KB per piece)

#### Style Guidelines
- **Art Style**: Consistent cartoon/anime aesthetic
- **Age Appropriate**: Kid-friendly, no violent or scary elements
- **High Contrast**: Clear visibility on mobile screens
- **Animation Ready**: Clean lines suitable for sprite animation

#### Content Filtering
```typescript
interface ContentFilter {
  bannedWords: string[];       // Violence, inappropriate content
  requiredElements: string[];  // Must include clothing items
  styleConstraints: string[];  // Art style requirements
  colorLimitations: string[];  // Accessibility considerations
}
```

### Asset Constraints for Generation

| Asset Type | Dimensions | Format | Notes |
|------------|------------|--------|-------|
| Avatar parts | 128x128 to 128x256 | PNG transparent | Consistent anchor points |
| World sprites | 512x512 to 1024x1024 | PNG | Tiling-friendly |
| Backgrounds | 2048x1024 | JPG | Parallax layers |
| UI icons | 128x128 | PNG | Consistent style |

---

## UI/UX Flow

### Main Menu Layout

```
┌─────────────────────────────────────┐
│  🎮 PromptPals Closet Dash 🎮       │
│                                     │
│        [Avatar Preview]             │
│         (Animated)                  │
│                                     │
│    ┌─────────┐  ┌─────────┐        │
│    │  PLAY   │  │ THEMES  │        │
│    └─────────┘  └─────────┘        │
│                                     │
│    ┌─────────┐  ┌─────────┐        │
│    │WARDROBE │  │SETTINGS │        │
│    └─────────┘  └─────────┘        │
│                                     │
│  Coins: 1,247    Best: 2,856m      │
└─────────────────────────────────────┘
```

### Theme Selection Screen

```
┌─────────────────────────────────────┐
│  ← Back          THEMES          ⚙️  │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ Type your theme idea...         │ │
│  │ "magical fairy princess"       │ │
│  └─────────────────────────────────┘ │
│                                     │
│  Popular Themes:                    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Space│ │Ocean│ │Ninja│ │Chef │   │
│  │ 🚀  │ │ 🌊  │ │ 🥷  │ │ 👨‍🍳 │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  Recent Themes:                     │
│  • Cyberpunk Skater                 │
│  • Forest Ranger                    │
│  • Ice Cream Vendor                 │
│                                     │
│         [GENERATE THEME]            │
└─────────────────────────────────────┘
```

### Wardrobe/Customization Screen

```
┌─────────────────────────────────────┐
│  ← Back         WARDROBE         💎  │
│                                     │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │             │ │ Hair Tops Bottoms│ │
│  │   Avatar    │ │ [💇] [👕] [👖]   │ │
│  │  Preview    │ │                 │ │
│  │             │ │ Shoes Access.   │ │
│  │ (Animated)  │ │ [👟] [🎩]       │ │
│  │             │ │                 │ │
│  │             │ │ ┌─┬─┬─┬─┐       │ │
│  │             │ │ │ │ │ │ │ Hair  │ │
│  │             │ │ ├─┼─┼─┼─┤       │ │
│  │             │ │ │ │ │ │ │       │ │
│  │             │ │ ├─┼─┼─┼─┤       │ │
│  │             │ │ │ │ │ │ │       │ │
│  │             │ │ └─┴─┴─┴─┘       │ │
│  └─────────────┘ │                 │ │
│                  │ Colors: ●●●●●   │ │
│  [SAVE OUTFIT]   │ [EQUIP] [SHARE] │ │
└─────────────────────────────────────┘
```

### Gameplay HUD

```
┌─────────────────────────────────────┐
│ 🪙 1,247    🏃 2,856m    Space 🚀   │
│                               ⏸️    │
│                                     │
│                                     │
│        [Player Avatar Running]      │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                          [Wardrobe] │
│                             👗      │
└─────────────────────────────────────┘
```

---

## Technical Implementation Notes

### 1. Chunk Spawning System

#### Endless Generation Algorithm
```typescript
interface GameChunk {
  id: string;
  length: number;           // Chunk length in world units
  difficulty: number;       // 1-10 difficulty rating
  obstacles: ObstacleData[];
  collectibles: CollectibleData[];
  theme: string;           // Current theme for styling
}

class ChunkSpawner {
  private activeChunks: GameChunk[] = [];
  private chunkPool: GameChunk[] = [];
  private playerPosition: number = 0;
  
  update(playerX: number) {
    this.playerPosition = playerX;
    this.despawnOldChunks();
    this.spawnNewChunks();
  }
  
  private generateChunk(difficulty: number): GameChunk {
    // Generate obstacles and collectibles based on difficulty
    // Ensure proper spacing and lane distribution
    // Apply current theme styling
  }
}
```

#### Chunk Templates
```typescript
const chunkTemplates = {
  easy: {
    obstacles: 2-3,
    collectibles: 5-8,
    spacing: "wide",
    patterns: ["single_lane", "alternating"]
  },
  
  medium: {
    obstacles: 4-6,
    collectibles: 4-6,
    spacing: "medium", 
    patterns: ["double_obstacle", "zigzag"]
  },
  
  hard: {
    obstacles: 6-8,
    collectibles: 2-4,
    spacing: "tight",
    patterns: ["triple_threat", "timing_challenge"]
  }
};
```

### 2. Avatar Composite Rendering System

#### Layer Management
```typescript
class AvatarRenderer {
  private layers: Map<string, SpriteComponent> = new Map();
  private animationState: 'idle' | 'running' | 'jumping' | 'sliding' = 'idle';
  
  updateLayer(layerName: string, assetUrl: string) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.imageUrl = assetUrl;
      this.refreshComposite();
    }
  }
  
  setAnimationState(state: string) {
    this.animationState = state;
    this.updateAllLayerAnimations();
  }
  
  private refreshComposite() {
    // Combine all layers into single composite sprite
    // Maintain proper z-order (body < clothing < accessories)
    // Update physics body if needed
  }
}
```

#### Animation Synchronization
```typescript
interface LayerAnimation {
  frames: string[];        // Asset URLs for each frame
  frameRate: number;       // Frames per second
  loop: boolean;          // Whether to loop
  syncGroup: string;      // Sync with other layers
}

class AnimationSync {
  private syncGroups: Map<string, LayerAnimation[]> = new Map();
  
  addToSyncGroup(groupName: string, animation: LayerAnimation) {
    // Ensure all animations in group stay synchronized
  }
  
  update(deltaTime: number) {
    // Update all sync groups simultaneously
  }
}
```

### 3. Theme Switching Mechanics

#### Asset Loading Strategy
```typescript
class ThemeManager {
  private currentTheme: string = "default";
  private loadedThemes: Map<string, ThemeAssets> = new Map();
  private preloadQueue: string[] = [];
  
  async switchTheme(themeName: string) {
    // Show loading indicator
    this.showThemeTransition();
    
    // Load theme assets if not cached
    if (!this.loadedThemes.has(themeName)) {
      await this.loadThemeAssets(themeName);
    }
    
    // Apply theme to all game objects
    this.applyThemeToWorld(themeName);
    this.applyThemeToUI(themeName);
    
    // Hide loading indicator
    this.hideThemeTransition();
    
    this.currentTheme = themeName;
  }
  
  private async loadThemeAssets(themeName: string): Promise<void> {
    // Load background, obstacles, collectibles, UI elements
    // Use progressive loading for better UX
  }
}
```

#### Dynamic Asset Replacement
```typescript
interface ThemeAssets {
  background: {
    far: string;
    mid: string; 
    near: string;
  };
  obstacles: Record<string, string>;
  collectibles: Record<string, string>;
  ui: {
    backgroundColor: string;
    accentColor: string;
    textColor: string;
  };
  particles: Record<string, ParticleConfig>;
}
```

### 4. Persistence & Save Data

#### Save Data Structure
```typescript
interface SaveData {
  version: string;
  player: {
    coins: number;
    gems: number;
    totalDistance: number;
    gamesPlayed: number;
    bestDistance: number;
  };
  
  wardrobe: {
    unlockedItems: string[];      // Item IDs
    equippedItems: {
      hair: string;
      top: string;
      bottom: string;
      shoes: string;
      accessory: string;
    };
  };
  
  themes: {
    unlocked: string[];           // Theme names
    favorites: string[];
    recent: string[];
    custom: CustomTheme[];        // User-generated themes
  };
  
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
    difficulty: 'easy' | 'normal' | 'hard';
  };
  
  achievements: {
    unlocked: string[];
    progress: Record<string, number>;
  };
}
```

#### Auto-Save Strategy
```typescript
class SaveManager {
  private saveData: SaveData;
  private isDirty: boolean = false;
  private autoSaveInterval: number = 30000; // 30 seconds
  
  markDirty() {
    this.isDirty = true;
  }
  
  async autoSave() {
    if (this.isDirty) {
      await this.save();
      this.isDirty = false;
    }
  }
  
  async save() {
    // Encrypt sensitive data
    // Compress for storage efficiency
    // Handle save failures gracefully
  }
}
```

---

## Monetization Integration

### Coin Economy

#### Earning Rates
```typescript
const coinEarningRates = {
  gameplay: {
    baseRate: 1,              // Coins per second
    distanceBonus: 0.1,       // Per 100m traveled
    comboMultiplier: 1.5,     // For collecting streaks
    perfectRunBonus: 50       // No obstacles hit
  },
  
  achievements: {
    firstRun: 100,
    distance1000m: 200,
    collect100Items: 150,
    createCustomTheme: 300
  },
  
  dailyRewards: [50, 75, 100, 150, 200, 300, 500] // Day 1-7
};
```

#### Spending Options
```typescript
const coinPrices = {
  themes: {
    basic: 500,               // Pre-made themes
    premium: 1000,            // High-quality themes
    custom: 200              // Unlock custom theme creation
  },
  
  outfitPieces: {
    common: 100,
    rare: 250,
    epic: 500,
    legendary: 1000
  },
  
  powerups: {
    speedBoost: 50,
    magnet: 75,
    shield: 100,
    doubleCoins: 125
  }
};
```

### Pro Subscription Benefits

#### Subscription Tiers
```typescript
interface SubscriptionTier {
  name: string;
  monthlyPrice: number;
  benefits: string[];
}

const subscriptionTiers = {
  basic: {
    name: "Closet Pro",
    monthlyPrice: 2.99,
    benefits: [
      "Unlimited custom themes",
      "2x coin earning rate", 
      "Exclusive outfit pieces",
      "Priority theme generation",
      "No ads",
      "Cloud save backup"
    ]
  },
  
  family: {
    name: "Family Closet",
    monthlyPrice: 4.99,
    benefits: [
      "All Closet Pro benefits",
      "Up to 6 family accounts",
      "Shared wardrobe items",
      "Family challenges",
      "Parental controls"
    ]
  }
};
```

#### Free vs Pro Features
| Feature | Free | Pro |
|---------|------|-----|
| Custom Themes | 3 per week | Unlimited |
| Coin Earning | 1x rate | 2x rate |
| Outfit Pieces | Common + Rare | All rarities |
| Theme Generation | Standard queue | Priority queue |
| Cloud Save | Local only | Cloud backup |
| Ads | Yes | No |

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Retention Metrics
```typescript
interface RetentionMetrics {
  d1Retention: number;      // Target: 40%+
  d7Retention: number;      // Target: 20%+
  d30Retention: number;     // Target: 10%+
  
  sessionLength: number;    // Target: 5+ minutes
  sessionsPerDay: number;   // Target: 2+ sessions
  daysActive: number;       // Target: 15+ days/month
}
```

#### Engagement Metrics
```typescript
interface EngagementMetrics {
  avatarCreations: number;      // Target: 5+ per user
  themesGenerated: number;      // Target: 3+ per user
  outfitChanges: number;        // Target: 10+ per session
  socialShares: number;         // Target: 1+ per week
  
  averageDistance: number;      // Target: 1000m+ per run
  totalPlaytime: number;        // Target: 30+ minutes/week
  achievementsUnlocked: number; // Target: 5+ per user
}
```

#### Monetization Metrics
```typescript
interface MonetizationMetrics {
  conversionRate: number;       // Target: 5%+ to paid
  arpu: number;                 // Average revenue per user
  ltv: number;                  // Lifetime value
  
  coinPurchases: number;        // In-app purchases
  subscriptionRate: number;     // Target: 2%+ subscribers
  churnRate: number;           // Target: <10% monthly
}
```

### Success Benchmarks

#### Launch Targets (First 30 Days)
- **Downloads**: 10,000+ installs
- **D1 Retention**: 35%+
- **User-Generated Themes**: 1,000+ created
- **Social Shares**: 500+ avatar shares
- **Revenue**: $1,000+ from subscriptions

#### Growth Targets (First 6 Months)
- **Monthly Active Users**: 50,000+
- **Theme Library**: 10,000+ AI-generated themes
- **Community Features**: User theme sharing, contests
- **Platform Expansion**: iOS, Android, Web versions
- **Revenue**: $10,000+ monthly recurring

| Metric | Target | Measurement |
|--------|--------|-------------|
| Day 1 Retention | 45% | Return next day |
| Avatar Creations | 3+ per user | First session |
| Theme Switches | 2+ per user | First week |
| Avg Run Time | 2+ minutes | Per session |
| Share Rate | 10% | Screenshots shared |
| Conversion to Pro | 3% | Free → Pro |

---

## Dependencies and Risk Mitigation

### Technical Dependencies

#### Core Systems
```typescript
interface TechnicalDependencies {
  gameEngine: "Slopcade Engine v2.0+";
  aiGeneration: "Scenario.com API";
  cloudStorage: "Cloudflare R2";
  analytics: "Custom analytics system";
  
  platforms: ["iOS", "Android", "Web"];
  frameworks: ["React Native", "Expo"];
  backend: ["Cloudflare Workers", "D1 Database"];
}
```

#### External Services
- **Scenario.com**: AI image generation (critical path)
- **Cloudflare R2**: Asset storage and CDN
- **App Store/Play Store**: Distribution platforms
- **Payment Processing**: Apple/Google in-app purchases

### Risk Assessment & Mitigation

#### High-Risk Items

**1. AI Generation Quality**
- **Risk**: Generated assets don't meet quality standards
- **Mitigation**: 
  - Implement quality scoring system
  - Manual review queue for new themes
  - Fallback to curated asset library
  - User rating system for generated content

**2. Performance on Low-End Devices**
- **Risk**: Game runs poorly on older phones
- **Mitigation**:
  - Implement quality settings (low/medium/high)
  - Asset compression and optimization
  - Progressive loading system
  - Performance testing on target devices

**3. Content Moderation**
- **Risk**: AI generates inappropriate content
- **Mitigation**:
  - Strict prompt filtering system
  - Content moderation API integration
  - User reporting system
  - Manual review for flagged content

#### Medium-Risk Items

**4. Monetization Balance**
- **Risk**: Too aggressive monetization hurts retention
- **Mitigation**:
  - A/B testing for pricing
  - Generous free tier
  - Focus on cosmetic purchases only
  - Regular player feedback surveys

**5. Technical Complexity**
- **Risk**: Avatar system too complex to implement reliably
- **Mitigation**:
  - Prototype core systems early
  - Modular architecture for easy debugging
  - Comprehensive testing suite
  - Gradual feature rollout

#### Low-Risk Items

**6. Market Competition**
- **Risk**: Similar games launch before us
- **Mitigation**: Focus on unique AI generation hook
- **Timeline**: 3-month development window

**7. Platform Policy Changes**
- **Risk**: App store policy changes affect distribution
- **Mitigation**: Multi-platform strategy, web version backup

### Contingency Plans

#### Plan A: Full Feature Set (Ideal)
- Complete AI generation system
- Full avatar customization
- Social sharing features
- Pro subscription model

#### Plan B: Reduced Scope (Realistic)
- Pre-generated theme library (50+ themes)
- Basic avatar customization
- Local save only
- One-time purchase model

#### Plan C: Minimum Viable Product (Fallback)
- 10 fixed themes
- Simple outfit swapping
- Endless runner core only
- Ad-supported model

### Dependencies Status

- ✅ Godot 4 physics engine
- ✅ Asset generation pipeline (Scenario.com)
- ✅ Variable system for avatar state
- ✅ GodotBridge for dynamic sprite updates
- ✅ Chunk spawning system
- ⏳ Swipe input handling
- ⏳ Parallax background system
- ⏳ Theme asset preloading

---

## Development Timeline

### Phase 1: Core Systems (Weeks 1-4)
- [ ] Endless runner mechanics
- [ ] Basic avatar system
- [ ] Chunk spawning system
- [ ] Collision detection
- [ ] UI framework

### Phase 2: Customization (Weeks 5-8)
- [ ] Wardrobe system
- [ ] Asset layering
- [ ] Theme switching
- [ ] Save/load system
- [ ] Basic AI integration

### Phase 3: Polish & Features (Weeks 9-12)
- [ ] Advanced AI generation
- [ ] Social features
- [ ] Monetization integration
- [ ] Performance optimization
- [ ] Platform testing

### Phase 4: Launch Preparation (Weeks 13-16)
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Store submission
- [ ] Marketing materials
- [ ] Launch day preparation

---

## Conclusion

PromptPals Closet Dash represents a unique fusion of endless runner gameplay and AI-powered creativity. By focusing on the core loop of running, collecting, and customizing, while leveraging AI to provide unlimited content variety, the game offers a compelling experience for its target audience.

The technical implementation leverages the Slopcade engine's strengths while introducing new systems for avatar customization and AI integration. The monetization strategy balances free-to-play accessibility with premium features that enhance rather than gate the core experience.

Success will depend on execution quality, particularly in the AI generation system and avatar customization features. The phased development approach allows for iterative improvement and risk mitigation throughout the development process.

**Next Steps**: Begin Phase 1 development with core endless runner mechanics and basic avatar system implementation.

---

*This specification document serves as the foundation for PromptPals Closet Dash development. It should be updated as features are implemented and requirements evolve.*
