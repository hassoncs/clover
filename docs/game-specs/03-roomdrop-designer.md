# RoomDrop Designer - Game Specification

**Version**: 1.0  
**Date**: 2026-01-27  
**Status**: Specification Draft

---

## Executive Summary

**RoomDrop Designer** is a physics-based room decoration game that combines creative interior design with realistic physics simulation. Players drop furniture into rooms and watch items bounce, stack, and settle naturally while trying to meet specific design goals.

**Core Innovation**: Unlike static decoration games, every item has realistic physics - chairs tip over, lamps wobble, books stack and tumble. Players must consider both aesthetics and physics when designing their spaces.

**AI Magic**: Players can request furniture with natural language ("frog lamp on wooden nightstand") and the AI generates contextually appropriate items with proper physics properties.

**Target Audience**: Creative players who enjoy interior design, physics sandbox games, and sharing their creations.

---

## Game Mechanics

### Core Gameplay Loop

1. **Select Room**: Choose from various room templates (bedroom, living room, kitchen, etc.)
2. **Drop Furniture**: Drag items from catalog and drop them into the room
3. **Physics Simulation**: Watch items fall, bounce, stack, and settle realistically
4. **Meet Goals**: Satisfy design objectives (comfort, accessibility, stability)
5. **Share Creation**: Save and share completed room designs

### Furniture Dropping System

**Drag & Drop Interface**:
- Drag furniture from side catalog into room space
- Items spawn at cursor position with slight upward velocity
- Physics takes over immediately - no "ghost placement"
- Items can be dropped on top of each other for stacking

**Drop Mechanics**:
- **Height Matters**: Dropping from higher positions creates more impact
- **Rotation**: Items can be rotated mid-air by swiping during drop
- **Momentum**: Quick drag gestures add horizontal velocity
- **Precision Mode**: Hold for slower, more controlled placement

### Physics Simulation

**Realistic Behavior**:
- **Gravity**: All items fall at 9.8 m/s² unless supported
- **Collision**: Items bounce off walls, floor, and each other
- **Friction**: Different materials have varying friction coefficients
- **Stability**: Tall/narrow items tip over if center of mass shifts
- **Stacking**: Items can stack on each other with realistic weight distribution

**Material Properties**:
- **Wood**: Medium density, moderate bounce, good friction
- **Metal**: High density, low bounce, low friction  
- **Fabric**: Low density, high bounce absorption, high friction
- **Glass**: Medium density, very low bounce, breaks on high impact
- **Plastic**: Low density, high bounce, medium friction

### Design Goals System

**Comfort Score** (0-100):
- Seating availability and arrangement
- Lighting adequacy and placement
- Traffic flow and accessibility
- Temperature regulation (fans, heaters)

**Stability Score** (0-100):
- Items properly supported and balanced
- No precarious stacking or tipping
- Secure mounting for wall items
- Safe walkways free of obstacles

**Accessibility Score** (0-100):
- Clear pathways (minimum 36" wide)
- Door clearance maintained
- Essential items within reach
- No trip hazards or blocked exits

**Style Coherence** (0-100):
- Color palette consistency
- Material harmony
- Scale and proportion balance
- Theme adherence (modern, rustic, etc.)

### Room Constraints

**Physical Boundaries**:
- **Walls**: Solid barriers that items bounce off
- **Doors**: Must maintain 32" minimum clearance
- **Windows**: Cannot be blocked by tall furniture
- **Electrical**: Outlets and switches must remain accessible

**Item Limits**:
- **Weight Capacity**: Floors have maximum load limits
- **Volume Limits**: Rooms have maximum item density
- **Category Limits**: Some rooms restrict certain furniture types
- **Budget Constraints**: Items have costs in challenge mode

### Challenge Mode

**Specific Requirements**:
- "Create a cozy reading nook with under $500 budget"
- "Design accessible bedroom for wheelchair user"
- "Arrange living room for family of 6 with pets"
- "Create home office with maximum storage"

**Scoring Criteria**:
- Goal completion percentage
- Physics stability over time
- Aesthetic bonus points
- Efficiency bonuses (unused budget, space)

---

## Game Engine Integration

### GameDefinition Structure

```typescript
interface RoomDropGameDefinition extends GameDefinition {
  room: {
    type: 'bedroom' | 'living_room' | 'kitchen' | 'bathroom' | 'office';
    dimensions: { width: number; height: number };
    walls: WallDefinition[];
    doors: DoorDefinition[];
    windows: WindowDefinition[];
    fixtures: FixtureDefinition[]; // built-in elements
  };
  
  furnitureCatalog: FurnitureTemplate[];
  designGoals: DesignGoal[];
  constraints: RoomConstraints;
  
  // Standard game definition fields
  world: WorldConfig;
  camera: CameraConfig;
  ui: UIConfig;
  templates: Record<string, EntityTemplate>;
  entities: GameEntity[];
  rules: GameRule[];
}
```

### Furniture Templates

```typescript
interface FurnitureTemplate extends EntityTemplate {
  category: 'seating' | 'tables' | 'storage' | 'lighting' | 'decor' | 'beds';
  archetype: FurnitureArchetype; // predefined collider shape
  material: 'wood' | 'metal' | 'fabric' | 'glass' | 'plastic';
  
  // Physics properties derived from material and archetype
  physics: {
    bodyType: 'dynamic';
    density: number;      // based on material
    friction: number;     // based on material  
    restitution: number;  // based on material
    shape: 'box' | 'circle' | 'polygon';
    // dimensions from archetype
  };
  
  // Design scoring properties
  comfort: number;        // contribution to comfort score
  stability: number;      // base stability rating
  accessibility: number;  // accessibility impact
  style: string[];        // style tags for coherence
  
  // Gameplay properties
  cost: number;          // for budget challenges
  weight: number;        // for floor load calculations
  stackable: boolean;    // can other items be placed on top
  wallMountable: boolean; // can be mounted on walls
}
```

### Room Boundary System

```typescript
interface WallDefinition {
  start: { x: number; y: number };
  end: { x: number; y: number };
  height: number;
  material: 'drywall' | 'brick' | 'wood' | 'glass';
  color: string;
}

interface DoorDefinition {
  position: { x: number; y: number };
  width: number;
  swingDirection: 'in' | 'out' | 'sliding';
  clearanceRequired: number; // minimum space needed
}

interface WindowDefinition {
  position: { x: number; y: number };
  width: number;
  height: number;
  sillHeight: number;
  blockageThreshold: number; // how much furniture can block
}
```

### Design Goal Validation Rules

```typescript
interface DesignGoal {
  id: string;
  name: string;
  description: string;
  weight: number; // importance multiplier
  validator: GoalValidator;
}

interface GoalValidator {
  type: 'comfort' | 'stability' | 'accessibility' | 'style';
  conditions: ValidationCondition[];
  scoringFunction: (entities: GameEntity[], room: RoomDefinition) => number;
}

// Example validation rules
const comfortValidation: GameRule[] = [
  {
    id: 'seating_availability',
    trigger: { type: 'entity_count', tag: 'seating' },
    conditions: [
      { type: 'minimum_count', value: 2 },
      { type: 'proper_spacing', minDistance: 1.5 }
    ],
    actions: [
      { type: 'score', operation: 'add', value: 20, category: 'comfort' }
    ]
  }
];
```

### Container System

```typescript
interface FurnitureContainer {
  entityId: string;
  capacity: number;        // max items that can be stored
  acceptedTypes: string[]; // what item types can be stored
  contents: StoredItem[];
  
  // Visual representation of contents
  showContents: boolean;
  contentPositions: { x: number; y: number; rotation: number }[];
}

interface StoredItem {
  template: string;
  position: 'inside' | 'on_top' | 'hanging';
  visible: boolean;
}
```

---

## Graphics & Asset Requirements

### Furniture Categories & Assets

**Seating** (12-15 items):
- Chairs: dining, office, accent, rocking
- Sofas: 2-seat, 3-seat, sectional, loveseat
- Stools: bar, counter, ottoman
- Benches: entryway, dining, storage

**Tables** (10-12 items):
- Dining tables: round, rectangular, extendable
- Coffee tables: glass, wood, metal
- Side tables: nightstand, end table, console
- Desks: computer, writing, standing

**Storage** (15-18 items):
- Dressers: tall, wide, vintage
- Bookcases: tall, short, modular
- Cabinets: kitchen, bathroom, display
- Wardrobes: single, double, corner
- Shelving: floating, ladder, cube

**Lighting** (8-10 items):
- Table lamps: desk, bedside, accent
- Floor lamps: reading, torchiere, arc
- Ceiling fixtures: chandelier, pendant, flush
- Wall sconces: modern, traditional

**Beds** (6-8 items):
- Single, double, queen, king
- Bunk beds, daybeds, futons
- Various headboard styles

**Decor** (20+ items):
- Plants: small, medium, large, hanging
- Artwork: paintings, photos, mirrors
- Textiles: rugs, curtains, pillows
- Accessories: vases, books, candles

### Room Backgrounds

**Wall Textures**:
- Paint colors: 20+ options across color wheel
- Wallpapers: floral, geometric, textured
- Materials: brick, wood paneling, tile

**Floor Materials**:
- Hardwood: oak, maple, cherry, bamboo
- Carpet: plush, berber, area rugs
- Tile: ceramic, stone, vinyl
- Concrete: polished, stained, raw

**Architectural Elements**:
- Crown molding, baseboards, wainscoting
- Built-in shelving, window seats
- Fireplaces, columns, archways

### Physics Debug Visualization

**Optional Debug Overlays**:
- Collision boundaries (wireframe boxes)
- Center of mass indicators (red dots)
- Stability zones (green = stable, red = unstable)
- Force vectors during impacts
- Weight distribution heatmaps

### Goal Completion Indicators

**Visual Feedback**:
- Progress bars for each design goal
- Color-coded room zones (accessibility paths)
- Stability warnings (wobbling items highlighted)
- Comfort heat map overlay
- Style coherence indicators

---

## AI Furniture Generation

### Furniture Archetypes

**Predefined Collider Shapes**:

```typescript
interface FurnitureArchetype {
  id: string;
  name: string;
  category: string;
  
  // Physics collider definition
  collider: {
    type: 'compound' | 'simple';
    shapes: ColliderShape[];
  };
  
  // Typical dimensions (can be scaled)
  baseDimensions: {
    width: number;
    height: number; 
    depth: number;
  };
  
  // Attachment points for AI texture mapping
  surfaces: Surface[];
  
  // Behavioral properties
  centerOfMass: { x: number; y: number; z: number };
  tipThreshold: number; // angle before tipping over
  stackingSurface?: 'top' | 'none'; // where other items can be placed
}

// Example archetypes
const CHAIR_ARCHETYPE: FurnitureArchetype = {
  id: 'standard_chair',
  category: 'seating',
  collider: {
    type: 'compound',
    shapes: [
      { type: 'box', position: { x: 0, y: 0.2, z: 0 }, size: { x: 0.4, y: 0.05, z: 0.4 } }, // seat
      { type: 'box', position: { x: 0, y: 0.5, z: -0.15 }, size: { x: 0.4, y: 0.6, z: 0.05 } }, // back
      { type: 'cylinder', position: { x: 0.15, y: 0.1, z: 0.15 }, radius: 0.02, height: 0.2 }, // leg
      // ... other legs
    ]
  },
  baseDimensions: { width: 0.4, height: 0.8, depth: 0.4 },
  centerOfMass: { x: 0, y: 0.3, z: -0.05 },
  tipThreshold: 30, // degrees
  stackingSurface: 'none'
};
```

### AI Texture Generation

**Material Inference Pipeline**:
1. Parse user request: "wooden dining chair with red cushion"
2. Extract material keywords: "wooden", "red", "cushion"
3. Map to archetype: CHAIR_ARCHETYPE
4. Generate textures for each surface:
   - Frame surfaces → wood texture
   - Seat surface → red fabric texture
   - Back surface → red fabric texture

**Surface Mapping**:
```typescript
interface Surface {
  id: string;
  name: string; // "seat", "back", "frame", "legs"
  uvCoordinates: number[]; // texture mapping coordinates
  materialHint: string; // "wood", "fabric", "metal", "leather"
  defaultColor: string;
}
```

**AI Generation Prompt Templates**:
```typescript
const TEXTURE_PROMPTS = {
  wood: "High-quality {wood_type} wood texture, {finish} finish, realistic grain pattern, furniture quality",
  fabric: "{color} {fabric_type} fabric texture, upholstery quality, realistic weave pattern",
  metal: "{metal_type} metal texture, {finish} finish, realistic surface properties",
  leather: "{color} leather texture, furniture grade, realistic grain and aging"
};
```

### Material Property Mapping

**Physics Properties by Material**:
```typescript
const MATERIAL_PHYSICS = {
  wood: { density: 0.6, friction: 0.7, restitution: 0.3 },
  metal: { density: 2.5, friction: 0.4, restitution: 0.2 },
  fabric: { density: 0.3, friction: 0.9, restitution: 0.1 },
  leather: { density: 0.4, friction: 0.8, restitution: 0.2 },
  glass: { density: 1.2, friction: 0.3, restitution: 0.1 },
  plastic: { density: 0.4, friction: 0.5, restitution: 0.6 }
};
```

---

## UI/UX Flow

### Room Editor Interface

**Main Screen Layout**:
- **Center**: 3D room view with physics simulation
- **Left Panel**: Furniture catalog with search and filters
- **Right Panel**: Design goals checklist and scoring
- **Bottom Bar**: Tool palette (rotate, delete, undo, settings)
- **Top Bar**: Room selector, save/load, share button

**Camera Controls**:
- **Orbit**: Drag to rotate around room
- **Zoom**: Pinch or scroll to zoom in/out
- **Pan**: Two-finger drag to pan view
- **Preset Views**: Top-down, front, side, corner perspectives

### Furniture Catalog

**Organization**:
- **Categories**: Tabs for seating, tables, storage, etc.
- **Search Bar**: Natural language search ("red chair", "small table")
- **Filters**: Material, style, price range, size
- **Favorites**: Save frequently used items

**Item Display**:
- **Thumbnail**: 3D preview of item
- **Info Card**: Name, price, dimensions, material
- **Physics Preview**: Shows how item behaves when dropped
- **Style Tags**: Modern, rustic, industrial, etc.

### Design Goal Checklist

**Real-time Scoring**:
- **Progress Bars**: Visual progress for each goal (0-100%)
- **Suggestions**: Hints for improving scores
- **Warnings**: Red alerts for accessibility violations
- **Achievements**: Unlock badges for exceptional designs

**Goal Categories**:
- ✅ **Comfort**: 85/100 - Add more seating
- ⚠️ **Stability**: 60/100 - Secure tall bookshelf
- ❌ **Accessibility**: 45/100 - Clear door pathway
- ✅ **Style**: 92/100 - Excellent color harmony

### Share Room Feature

**Export Options**:
- **Screenshot**: High-quality render of final design
- **3D Model**: Shareable 3D file for viewing in AR
- **Recipe**: List of items and positions for recreation
- **Video**: Time-lapse of decoration process

**Social Features**:
- **Gallery**: Browse community creations
- **Challenges**: Weekly design contests
- **Ratings**: Like and comment on designs
- **Collections**: Curated room themes and styles

---

## Technical Implementation

### Furniture Collider Archetypes

**Standard Archetypes Library**:

```typescript
// Seating archetypes
CHAIR_STANDARD: compound collider (seat + back + 4 legs)
CHAIR_ARMCHAIR: compound collider (seat + back + arms + 4 legs)  
SOFA_2SEAT: compound collider (long seat + back + 2 arm rests)
STOOL_ROUND: simple cylinder collider

// Table archetypes  
TABLE_DINING_4LEG: compound collider (top + 4 legs)
TABLE_COFFEE_GLASS: compound collider (glass top + metal frame)
DESK_COMPUTER: compound collider (desktop + drawers + legs)

// Storage archetypes
BOOKCASE_TALL: compound collider (shelves + back + sides)
DRESSER_6DRAWER: compound collider (top + drawer boxes + frame)
CABINET_KITCHEN: compound collider (doors + shelves + frame)

// Lighting archetypes
LAMP_TABLE: compound collider (base + shade + cord)
LAMP_FLOOR: compound collider (base + pole + shade)
CHANDELIER: compound collider (center + arms + crystals)
```

### Stability Scoring Algorithm

**Physics-Based Stability Calculation**:

```typescript
function calculateStabilityScore(entities: GameEntity[]): number {
  let totalStability = 0;
  let itemCount = 0;
  
  for (const entity of entities) {
    if (entity.tags.includes('furniture')) {
      const stability = calculateItemStability(entity);
      totalStability += stability;
      itemCount++;
    }
  }
  
  return itemCount > 0 ? (totalStability / itemCount) * 100 : 100;
}

function calculateItemStability(entity: GameEntity): number {
  // Check if item is properly supported
  const supportRatio = calculateSupportRatio(entity);
  
  // Check center of mass vs support base
  const balanceScore = calculateBalanceScore(entity);
  
  // Check for excessive movement/vibration
  const movementPenalty = calculateMovementPenalty(entity);
  
  // Check stacking safety
  const stackingScore = calculateStackingSafety(entity);
  
  return Math.min(1.0, 
    supportRatio * 0.3 + 
    balanceScore * 0.3 + 
    (1 - movementPenalty) * 0.2 + 
    stackingScore * 0.2
  );
}
```

### Save/Load Room Configurations

**Room Save Format**:
```typescript
interface SavedRoom {
  version: string;
  roomType: string;
  timestamp: number;
  
  // Room configuration
  room: RoomDefinition;
  
  // Furniture placement
  furniture: PlacedFurniture[];
  
  // Design scores at save time
  scores: {
    comfort: number;
    stability: number;
    accessibility: number;
    style: number;
  };
  
  // Metadata
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
}

interface PlacedFurniture {
  id: string;
  template: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  
  // AI-generated properties
  materials: Record<string, string>; // surface -> texture URL
  colors: Record<string, string>;    // surface -> color hex
  
  // Physics state (for exact recreation)
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
}
```

### Performance Optimization

**Physics Simulation**:
- **Sleep System**: Static items enter sleep mode to reduce CPU
- **LOD System**: Distant items use simplified colliders
- **Culling**: Items outside camera view skip visual updates
- **Batching**: Group similar items for efficient rendering

**Memory Management**:
- **Asset Streaming**: Load furniture textures on-demand
- **Texture Compression**: Use compressed formats for mobile
- **Geometry Instancing**: Reuse meshes for identical items
- **Garbage Collection**: Clean up destroyed items promptly

---

## Success Metrics

### Player Engagement

**Core Metrics**:
- **Session Length**: Average time spent decorating (target: 15+ minutes)
- **Completion Rate**: Percentage of rooms finished (target: 70%+)
- **Return Rate**: Players returning within 7 days (target: 40%+)
- **Sharing Rate**: Rooms shared publicly (target: 25%+)

**Depth Metrics**:
- **Items per Room**: Average furniture count (target: 12-20 items)
- **Goal Achievement**: Average design score (target: 75%+)
- **Iteration Count**: How many times players adjust layouts (target: 8+ adjustments)
- **Catalog Usage**: Percentage of furniture catalog explored (target: 60%+)

### Technical Performance

**Performance Targets**:
- **Frame Rate**: Maintain 60 FPS on target devices
- **Load Time**: Room loading under 3 seconds
- **Physics Stability**: No simulation explosions or glitches
- **Memory Usage**: Under 512MB on mobile devices

**Quality Metrics**:
- **Physics Accuracy**: Realistic behavior for 95%+ of interactions
- **Visual Fidelity**: High-quality textures and lighting
- **Responsiveness**: Input lag under 50ms
- **Crash Rate**: Under 0.1% of sessions

### Business Metrics

**Monetization** (if applicable):
- **Furniture Pack Sales**: Premium furniture collections
- **Room Template Sales**: Designer-created room layouts
- **Customization Options**: Premium materials and textures
- **Challenge Mode**: Premium design challenges

**Community Growth**:
- **User-Generated Content**: Rooms created and shared
- **Social Engagement**: Likes, comments, follows
- **Challenge Participation**: Weekly contest entries
- **Tutorial Completion**: New player onboarding success

---

## Development Phases

### Phase 1: Core Physics (4-6 weeks)
- Basic room with walls and floor
- Furniture dropping and physics simulation
- 5-10 basic furniture archetypes
- Simple stability scoring

### Phase 2: Design Goals (3-4 weeks)  
- Comfort, stability, accessibility scoring
- Goal validation system
- UI for goal tracking and feedback
- Basic room constraints (doors, windows)

### Phase 3: AI Integration (4-5 weeks)
- Furniture archetype system
- AI texture generation pipeline
- Material property mapping
- Natural language furniture requests

### Phase 4: Polish & Content (3-4 weeks)
- Full furniture catalog (50+ items)
- Multiple room types
- Save/load system
- Performance optimization

### Phase 5: Social Features (2-3 weeks)
- Room sharing system
- Community gallery
- Challenge mode
- Achievement system

---

## Risk Assessment

### Technical Risks

**Physics Simulation Complexity**:
- **Risk**: Performance issues with many dynamic objects
- **Mitigation**: Implement sleep system and LOD optimization
- **Fallback**: Reduce max item count or simplify physics

**AI Generation Reliability**:
- **Risk**: AI-generated textures may not match expectations
- **Mitigation**: Curated prompt templates and quality filtering
- **Fallback**: Pre-made texture library as backup

**Mobile Performance**:
- **Risk**: Complex 3D scenes may struggle on older devices
- **Mitigation**: Scalable quality settings and device detection
- **Fallback**: 2D mode for low-end devices

### Design Risks

**Learning Curve**:
- **Risk**: Physics-based placement may frustrate casual players
- **Mitigation**: Tutorial mode and placement assistance options
- **Fallback**: "Easy mode" with snap-to-grid placement

**Goal Balancing**:
- **Risk**: Design goals may be too restrictive or unclear
- **Mitigation**: Extensive playtesting and iterative tuning
- **Fallback**: Optional goals mode for pure creative play

### Market Risks

**Niche Appeal**:
- **Risk**: Physics-based decoration may have limited audience
- **Mitigation**: Strong tutorial and multiple difficulty modes
- **Fallback**: Traditional decoration mode alongside physics mode

**Competition**:
- **Risk**: Established decoration games have large user bases
- **Mitigation**: Unique physics differentiator and AI features
- **Fallback**: Focus on physics sandbox community

---

## Conclusion

RoomDrop Designer represents an innovative fusion of interior design creativity and physics simulation gameplay. By making furniture placement feel natural and consequential through realistic physics, the game creates a unique experience that differentiates it from static decoration games.

The AI-powered furniture generation system allows for unprecedented customization while maintaining consistent physics properties. The design goal system provides structure and challenge while still allowing creative freedom.

Success will depend on balancing the complexity of physics simulation with accessibility for casual players, while delivering the satisfying "drop and watch" gameplay that makes the concept compelling.

The modular development approach allows for iterative testing and refinement, ensuring each system works well before adding complexity. The strong technical foundation will support future expansion into multiplayer collaboration, AR visualization, and advanced AI features.

---

## Appendices

### A. Furniture Archetype Reference
[Detailed specifications for all 50+ furniture archetypes]

### B. Physics Tuning Parameters  
[Complete list of material properties and simulation settings]

### C. AI Prompt Templates
[Full library of texture generation prompts by material and style]

### D. Accessibility Guidelines
[Detailed requirements for ADA compliance and universal design]

### E. Performance Benchmarks
[Target performance metrics across device categories]