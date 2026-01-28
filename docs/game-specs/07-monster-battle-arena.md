# Monster Battle Arena - Game Specification

**Version**: 1.0  
**Date**: 2026-01-27  
**Status**: Draft

---

## Executive Summary

Monster Battle Arena is a physics-based monster collection and battle game that combines AI-generated creatures with real-time combat mechanics. Players create unique monsters by describing them in natural language ("Fire-breathing dragon made of lava rocks"), then engage in physics-driven battles where positioning, momentum, and environmental hazards determine victory.

**Core Innovation**: AI transforms creative prompts into fully-realized monsters with appropriate stats, abilities, and physics properties, creating endless variety in both appearance and gameplay.

**Target Audience**: Monster collection enthusiasts, physics game fans, creative players who enjoy customization

**Platform**: Cross-platform (iOS, Android, Web) via Expo/React Native

---

## Detailed Game Mechanics

### Monster Generation System

#### Prompt-to-Monster Pipeline
1. **Player Input**: Natural language description
   - Examples: "Crystalline ice wolf", "Mechanical spider with laser eyes", "Fluffy cloud sheep that shoots lightning"
2. **AI Processing**: 
   - Generate monster sprite via Scenario.com
   - Infer type from keywords (fire, ice, metal, nature, etc.)
   - Calculate base stats from descriptive elements
   - Determine special ability from unique traits
3. **Physics Integration**: 
   - Analyze generated sprite for collision shape
   - Set physics properties based on material keywords
   - Apply type-specific physics modifiers

#### Monster Stats System
```typescript
interface MonsterStats {
  hp: number;           // Health points (50-200)
  attack: number;       // Damage per hit (10-50)
  defense: number;      // Damage reduction (0-30)
  speed: number;        // Movement velocity (1-10)
  weight: number;       // Physics mass (0.5-5.0)
  specialPower: number; // Ability strength (1-100)
}
```

**Stat Calculation from Prompts**:
- **Size keywords** → HP/Weight: "tiny" (low), "massive" (high), "giant" (very high)
- **Material keywords** → Defense: "armored" (+defense), "crystalline" (+defense), "fluffy" (-defense)
- **Speed keywords** → Speed: "swift", "lightning-fast" (+speed), "lumbering" (-speed)
- **Aggressive keywords** → Attack: "fierce", "razor-sharp", "explosive" (+attack)

### Type System

#### Primary Types
| Type | Strengths | Weaknesses | Physics Properties |
|------|-----------|------------|-------------------|
| **Fire** | vs Ice, Nature | vs Water, Earth | Low friction, explosive knockback |
| **Water** | vs Fire, Earth | vs Ice, Lightning | Medium friction, fluid movement |
| **Earth** | vs Lightning, Fire | vs Nature, Water | High mass, slow but stable |
| **Ice** | vs Nature, Water | vs Fire, Lightning | Low friction, brittle (shatters) |
| **Lightning** | vs Water, Metal | vs Earth, Rubber | Fast movement, chain reactions |
| **Nature** | vs Earth, Water | vs Fire, Ice | Regeneration, entangling abilities |
| **Metal** | vs Ice, Earth | vs Fire, Lightning | High defense, magnetic interactions |
| **Shadow** | vs Light, Psychic | vs Fire, Lightning | Phase through attacks briefly |

#### Type Effectiveness Multipliers
- **Super Effective**: 2x damage
- **Normal**: 1x damage  
- **Not Very Effective**: 0.5x damage
- **Immune**: 0x damage (rare)

### Physics-Based Battle System

#### Arena Mechanics
- **Real-time combat**: No turns, continuous action
- **Physics interactions**: Monsters push, bump, and knock each other around
- **Momentum matters**: Heavier monsters harder to move but deal more impact damage
- **Environmental hazards**: Lava pits, ice patches, electric barriers, wind currents
- **Power-ups**: Speed boost, damage amplifier, shield, temporary invincibility

#### Combat Actions
1. **Basic Attack**: Charge forward, deal damage on contact
2. **Special Ability**: Type-specific power with cooldown
3. **Dodge Roll**: Quick evasive maneuver
4. **Block**: Reduce incoming damage, build up counter-attack energy
5. **Environmental Interaction**: Push opponents into hazards

#### Battle Victory Conditions
- **Knockout**: Reduce opponent HP to 0
- **Ring Out**: Push opponent out of arena bounds
- **Time Victory**: Higher HP when timer expires
- **Environmental**: Opponent falls into hazard (lava, pit, etc.)

### Training and Evolution System

#### Experience and Leveling
- **Battle XP**: Gain experience from wins, partial XP from losses
- **Training XP**: Spend time/resources to train specific stats
- **Level Cap**: 50 levels maximum per monster
- **Stat Growth**: Each level increases 2-3 random stats

#### Evolution Mechanics
- **Evolution Triggers**: 
  - Level thresholds (Level 15, 30, 45)
  - Stat requirements (Attack > 40, Defense > 30, etc.)
  - Battle achievements (Win 10 battles, Defeat fire-type, etc.)
- **Evolution Prompts**: Player describes evolved form
  - "My ice wolf grows larger and sprouts crystal spikes"
  - AI generates new sprite and recalculates stats
- **Stat Inheritance**: Base stats carry over with bonuses

#### Monster Breeding
- **Fusion System**: Combine two monsters to create hybrid
- **Trait Mixing**: New monster inherits traits from both parents
- **Prompt Fusion**: "Combine my fire dragon and ice wolf" → AI creates unique hybrid
- **Genetic Diversity**: Encourage experimentation with different combinations

---

## Game Engine Integration

### GameDefinition Structure

```typescript
interface MonsterBattleArena extends GameDefinition {
  metadata: {
    id: "monster-battle-arena";
    title: "Monster Battle Arena";
    gameType: "battle-arena";
  };
  
  world: {
    gravity: { x: 0, y: 5 };  // Lighter gravity for more aerial combat
    pixelsPerMeter: 60;
    bounds: { width: 16, height: 12 };
  };
  
  arena: ArenaConfig;
  monsters: MonsterTemplate[];
  battleRules: BattleRule[];
  progression: ProgressionConfig;
}
```

### Monster Templates

```typescript
interface MonsterTemplate extends EntityTemplate {
  id: string;
  name: string;
  description: string;           // Original prompt
  type: MonsterType;
  baseStats: MonsterStats;
  sprite: {
    type: "image";
    imageUrl: string;            // AI-generated sprite
    imageWidth: number;
    imageHeight: number;
    animations?: SpriteAnimation[];
  };
  physics: {
    bodyType: "dynamic";
    shape: "polygon" | "circle";  // Inferred from sprite
    vertices?: Vector2[];         // Auto-generated collision shape
    density: number;              // Based on weight stat
    friction: number;             // Based on type
    restitution: number;          // Based on material keywords
  };
  abilities: SpecialAbility[];
  behaviors: MonsterBehavior[];
}
```

### Battle Arena Setup

```typescript
interface ArenaConfig {
  theme: "volcanic" | "frozen" | "forest" | "mechanical" | "cosmic";
  hazards: ArenaHazard[];
  powerUps: PowerUpSpawn[];
  boundaries: ArenaBoundary;
  backgroundLayers: ParallaxLayer[];
}

interface ArenaHazard {
  type: "lava_pit" | "ice_patch" | "electric_barrier" | "wind_current" | "spike_trap";
  position: Vector2;
  size: Vector2;
  damage?: number;
  effect?: "knockback" | "slow" | "stun" | "burn" | "freeze";
  duration?: number;
}
```

### Stats and Progression System

```typescript
interface MonsterProgression {
  level: number;
  experience: number;
  experienceToNext: number;
  statGrowth: StatGrowthRates;
  evolutionProgress: EvolutionRequirement[];
  battleHistory: BattleRecord[];
}

interface StatGrowthRates {
  hp: number;        // HP gained per level
  attack: number;    // Attack gained per level
  defense: number;   // Defense gained per level
  speed: number;     // Speed gained per level
  specialPower: number; // Special power gained per level
}
```

### AI Generation Pipeline Integration

```typescript
interface MonsterGenerationRequest {
  prompt: string;
  playerLevel: number;        // Affects stat ranges
  preferredType?: MonsterType;
  evolutionBase?: MonsterTemplate; // For evolutions
}

interface MonsterGenerationResponse {
  sprite: GeneratedSprite;
  inferredType: MonsterType;
  calculatedStats: MonsterStats;
  suggestedAbilities: SpecialAbility[];
  physicsProperties: PhysicsConfig;
  flavorText: string;
}
```

---

## Graphics & Asset Requirements

### Monster Sprites
- **Resolution**: 512x512px base, scalable
- **Style**: Consistent cartoon/fantasy art style
- **Variations**: Base form, evolved forms, battle poses
- **Animation Frames**: Idle, attack, hurt, victory, defeat
- **Special Effects**: Ability activation, type-specific auras

### Battle Arena Backgrounds
- **Volcanic Arena**: Lava flows, rocky platforms, fire geysers
- **Frozen Arena**: Ice formations, snow effects, aurora lighting
- **Forest Arena**: Ancient trees, mushroom platforms, nature magic
- **Mechanical Arena**: Gears, pistons, electric conduits, metal platforms
- **Cosmic Arena**: Floating asteroids, nebula backgrounds, zero-gravity zones

### UI Elements
- **Health Bars**: Type-colored, animated damage/healing
- **Status Indicators**: Burn, freeze, stun, boost icons
- **Ability Cooldowns**: Circular progress indicators
- **Type Effectiveness**: Color-coded damage numbers (red=super, white=normal, blue=weak)
- **Monster Collection Grid**: Pokédex-style roster view

### Particle Effects
- **Fire Type**: Flames, embers, explosion bursts
- **Water Type**: Splashes, bubbles, steam clouds
- **Lightning Type**: Electric arcs, sparks, chain lightning
- **Ice Type**: Frost crystals, ice shards, freezing mist
- **Earth Type**: Rock debris, dust clouds, seismic cracks
- **Nature Type**: Leaves, vines, pollen, healing sparkles

### Special Visual Effects
- **Evolution Sequence**: Glowing transformation with particle swirl
- **Critical Hits**: Screen shake, slow-motion, impact flash
- **Type Matchups**: Color-coded damage indicators
- **Environmental Interactions**: Splash effects for water, burn effects for lava

---

## AI Monster Generation

### Prompt Analysis Pipeline

#### 1. Keyword Extraction
```typescript
interface PromptAnalysis {
  sizeKeywords: string[];      // "tiny", "massive", "giant"
  materialKeywords: string[];  // "crystalline", "metallic", "fluffy"
  elementKeywords: string[];   // "fire", "ice", "lightning"
  behaviorKeywords: string[];  // "aggressive", "swift", "defensive"
  uniqueTraits: string[];      // "laser eyes", "crystal spikes"
}
```

#### 2. Type Detection
- **Primary Type**: Most prominent element keyword
- **Secondary Type**: Secondary element or material
- **Hybrid Types**: Multiple strong element keywords → dual-type monster

#### 3. Stats Calculation Algorithm
```typescript
function calculateStats(analysis: PromptAnalysis, playerLevel: number): MonsterStats {
  const baseStats = getBaseStatsForLevel(playerLevel);
  
  // Size modifiers
  const sizeMultiplier = getSizeMultiplier(analysis.sizeKeywords);
  
  // Material modifiers  
  const materialBonus = getMaterialBonus(analysis.materialKeywords);
  
  // Behavior modifiers
  const behaviorBonus = getBehaviorBonus(analysis.behaviorKeywords);
  
  return {
    hp: baseStats.hp * sizeMultiplier.hp + materialBonus.hp,
    attack: baseStats.attack + behaviorBonus.attack,
    defense: baseStats.defense + materialBonus.defense,
    speed: baseStats.speed + behaviorBonus.speed,
    weight: baseStats.weight * sizeMultiplier.weight,
    specialPower: baseStats.specialPower + getUniqueTraitBonus(analysis.uniqueTraits)
  };
}
```

#### 4. Physics Body Generation
- **Shape Detection**: Analyze generated sprite for collision boundaries
- **Convex Hull**: Generate simplified polygon collision shape
- **Physics Properties**: 
  - Density from weight stat
  - Friction from material keywords
  - Restitution from type (bouncy vs solid)

#### 5. Ability Generation
```typescript
interface AbilityGenerator {
  generateFromTraits(uniqueTraits: string[], type: MonsterType): SpecialAbility[];
}

// Examples:
// "laser eyes" + Lightning type → "Lightning Beam" ability
// "crystal spikes" + Ice type → "Crystal Barrage" ability  
// "fire breath" + Fire type → "Flame Burst" ability
```

### Monster Validation System
- **Stat Balance**: Ensure no monster is overpowered for its level
- **Physics Sanity**: Verify collision shape makes sense
- **Type Consistency**: Check abilities match inferred type
- **Visual Quality**: Reject low-quality generated sprites

---

## UI/UX Flow

### Monster Generation Screen
1. **Prompt Input**: Large text field with placeholder examples
2. **Generation Button**: "Create Monster" with loading animation
3. **Preview Panel**: Shows generated sprite, stats, and abilities
4. **Refinement Options**: "Regenerate", "Adjust Stats", "Change Type"
5. **Confirmation**: "Add to Roster" or "Try Again"

### Monster Roster/Collection
- **Grid View**: Thumbnail sprites with level indicators
- **Filter Options**: By type, level, favorite status
- **Sort Options**: By level, stats, recently acquired
- **Monster Details**: Tap to view full stats, abilities, battle history
- **Quick Actions**: Set as active, evolve, train, release

### Battle Arena View
- **Arena Viewport**: Main battle area with physics simulation
- **Monster Health**: Floating health bars above monsters
- **Control Scheme**: 
  - **Touch**: Tap to move, hold to charge attack
  - **Swipe**: Direction for dodge/dash
  - **Double-tap**: Activate special ability
- **Battle UI**: Timer, score, ability cooldowns
- **Pause Menu**: Settings, forfeit, replay controls

### Training/Evolution Interface
- **Training Modes**:
  - **Stat Training**: Spend resources to boost specific stats
  - **Sparring**: Practice battles against AI for XP
  - **Meditation**: Passive XP gain over time
- **Evolution Tree**: Visual progression path with requirements
- **Evolution Preview**: Show what evolved form will look like
- **Resource Management**: Training costs, evolution materials

### Monster Trading/Sharing
- **QR Codes**: Generate shareable codes for monsters
- **Gallery**: Browse community-created monsters
- **Import System**: Scan codes to add others' monsters to roster
- **Rating System**: Like/favorite community monsters
- **Challenge System**: Battle other players' monsters

---

## Technical Implementation Notes

### Physics-Based Combat Balancing

#### Mass vs Speed Trade-offs
- **Heavy Monsters**: High HP/Defense, low Speed, hard to knock around
- **Light Monsters**: Low HP, high Speed, easy to knock around but agile
- **Medium Monsters**: Balanced stats, versatile gameplay

#### Knockback Calculations
```typescript
function calculateKnockback(attacker: Monster, defender: Monster, attackForce: number): Vector2 {
  const massRatio = attacker.stats.weight / defender.stats.weight;
  const speedBonus = attacker.stats.speed / 10;
  const knockbackMagnitude = attackForce * massRatio * speedBonus;
  
  return {
    x: Math.cos(attackAngle) * knockbackMagnitude,
    y: Math.sin(attackAngle) * knockbackMagnitude
  };
}
```

#### Arena Boundary Physics
- **Soft Boundaries**: Invisible walls that slow monsters near edges
- **Ring-Out Zones**: Areas where monsters take damage or lose instantly
- **Bounce Zones**: Elastic barriers that reflect monsters back into arena

### AI-Generated Collider Approximation

#### Sprite Analysis Pipeline
1. **Edge Detection**: Find sprite boundaries using computer vision
2. **Simplification**: Reduce complex shapes to 8-12 vertex polygons
3. **Convex Hull**: Ensure physics-compatible collision shapes
4. **Validation**: Test collision shape against sprite for accuracy

#### Fallback Shapes
- **Complex Sprites**: Default to circle or rectangle if polygon generation fails
- **Shape Library**: Pre-defined shapes for common monster archetypes
- **Manual Override**: Allow players to adjust collision shapes if needed

### Stats Progression System

#### Experience Curves
```typescript
function getExperienceRequired(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getStatGrowth(monster: Monster, level: number): StatBonus {
  const growthRate = monster.type.baseGrowthRate;
  const randomVariation = Math.random() * 0.2 + 0.9; // ±10% variation
  
  return {
    hp: Math.floor(growthRate.hp * randomVariation),
    attack: Math.floor(growthRate.attack * randomVariation),
    defense: Math.floor(growthRate.defense * randomVariation),
    speed: Math.floor(growthRate.speed * randomVariation)
  };
}
```

#### Evolution Requirements
- **Level Gates**: Must reach certain level thresholds
- **Stat Requirements**: Specific stats must exceed thresholds
- **Battle Achievements**: Win streaks, type matchup victories
- **Item Requirements**: Special evolution stones or materials
- **Friendship/Bond**: Monsters must be used frequently in battles

### Monster Data Persistence

#### Local Storage Schema
```typescript
interface SavedMonster {
  id: string;
  originalPrompt: string;
  generatedSpriteUrl: string;
  currentStats: MonsterStats;
  level: number;
  experience: number;
  evolutionStage: number;
  battleHistory: BattleRecord[];
  createdAt: Date;
  lastUsed: Date;
}
```

#### Cloud Sync (Optional)
- **Monster Backup**: Save roster to cloud for cross-device play
- **Community Sharing**: Upload monsters to public gallery
- **Battle Replays**: Store and share epic battle moments

### Battle Modes

#### PvE (Player vs Environment)
- **Campaign Mode**: Progressive difficulty with story elements
- **Arena Challenges**: Special rule battles (low gravity, hazard-heavy, etc.)
- **Boss Battles**: Giant monsters with unique mechanics
- **Survival Mode**: Endless waves of increasingly difficult opponents

#### PvP (Player vs Player)
- **Ranked Battles**: Competitive ladder with seasonal rewards
- **Casual Matches**: Unranked battles for fun and practice
- **Tournament Mode**: Bracket-style competitions
- **Guild Battles**: Team-based monster battles

---

## Success Metrics

### Player Engagement
- **Monster Creation Rate**: Average monsters generated per player per week
- **Battle Frequency**: Battles initiated per player per session
- **Session Length**: Average time spent in-game per session
- **Retention Rate**: 1-day, 7-day, 30-day player retention

### Content Quality
- **Monster Diversity**: Unique monster types created by players
- **AI Generation Success**: Percentage of generated monsters kept by players
- **Evolution Rate**: Percentage of monsters that reach evolution stages
- **Community Sharing**: Monsters shared via QR codes or gallery

### Monetization (If Applicable)
- **Premium Features**: Advanced AI generation, extra roster slots
- **Cosmetic Items**: Special arenas, particle effects, monster accessories
- **Battle Passes**: Seasonal content with exclusive rewards
- **Training Boosters**: Accelerated XP gain or stat training

### Technical Performance
- **Generation Speed**: Time from prompt to playable monster
- **Physics Stability**: Battle simulation performance and accuracy
- **Asset Loading**: Sprite generation and caching efficiency
- **Cross-Platform Sync**: Data consistency across devices

### Community Health
- **Positive Interactions**: Helpful sharing, creative monster designs
- **Content Moderation**: Inappropriate prompt detection and filtering
- **Player Feedback**: Ratings and reviews for game features
- **Bug Reports**: Issue identification and resolution time

---

## Development Phases

### Phase 1: Core Monster System (4-6 weeks)
- [ ] AI monster generation pipeline
- [ ] Basic monster stats and types
- [ ] Simple battle arena with physics
- [ ] Monster roster management
- [ ] Local data persistence

### Phase 2: Battle Enhancement (3-4 weeks)
- [ ] Special abilities system
- [ ] Arena hazards and power-ups
- [ ] Battle animations and effects
- [ ] Victory/defeat conditions
- [ ] Battle replay system

### Phase 3: Progression System (3-4 weeks)
- [ ] Experience and leveling
- [ ] Monster evolution mechanics
- [ ] Training and stat growth
- [ ] Achievement system
- [ ] Monster breeding/fusion

### Phase 4: Social Features (2-3 weeks)
- [ ] Monster sharing via QR codes
- [ ] Community gallery
- [ ] PvP battle system
- [ ] Leaderboards and rankings
- [ ] Guild/team features

### Phase 5: Polish and Launch (2-3 weeks)
- [ ] UI/UX refinement
- [ ] Performance optimization
- [ ] Tutorial and onboarding
- [ ] Monetization integration
- [ ] App store submission

---

## Risk Assessment

### Technical Risks
- **AI Generation Quality**: Inconsistent or low-quality monster sprites
  - *Mitigation*: Robust validation, fallback generation, manual curation
- **Physics Performance**: Complex battles causing frame rate drops
  - *Mitigation*: Optimize collision shapes, limit simultaneous effects
- **Asset Storage**: Large number of generated sprites consuming storage
  - *Mitigation*: Compression, cloud storage, selective caching

### Design Risks
- **Balance Issues**: Some monster types or abilities being overpowered
  - *Mitigation*: Extensive playtesting, data-driven balance adjustments
- **Complexity Overload**: Too many systems overwhelming new players
  - *Mitigation*: Progressive feature unlocking, clear tutorials
- **Prompt Limitations**: Players struggling to create desired monsters
  - *Mitigation*: Example prompts, suggestion system, prompt templates

### Business Risks
- **Market Saturation**: Competing with established monster collection games
  - *Mitigation*: Focus on unique AI generation and physics combat
- **Content Moderation**: Inappropriate monster prompts or names
  - *Mitigation*: AI content filtering, community reporting, human review
- **Platform Restrictions**: App store policies on AI-generated content
  - *Mitigation*: Clear content guidelines, age-appropriate filtering

---

## Conclusion

Monster Battle Arena represents an innovative fusion of AI-powered creativity and physics-based gameplay. By allowing players to bring their imagination to life through natural language prompts, the game creates a unique experience where every monster is both personally meaningful and mechanically distinct.

The combination of real-time physics combat, deep progression systems, and community sharing creates multiple engagement loops that cater to different player motivations: creative expression, competitive battling, collection completion, and social interaction.

Success will depend on the quality and consistency of AI-generated content, the balance and depth of the battle system, and the game's ability to foster a creative and engaged community of monster creators and battlers.

**Next Steps**: Begin Phase 1 development with focus on core monster generation pipeline and basic battle mechanics. Conduct early user testing to validate the prompt-to-monster experience and iterate based on player feedback.