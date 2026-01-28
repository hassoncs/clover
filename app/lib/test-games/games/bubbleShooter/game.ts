import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/bubbleShooter";

export const metadata: TestGameMeta = {
  title: "Bubble Shooter",
  description: "Match 3+ bubbles of the same color to pop them and clear the board",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  status: "archived",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const BUBBLE_RADIUS = 0.35;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const SHOOTER_WIDTH = 0.8;
const SHOOTER_HEIGHT = 0.4;
const WALL_WIDTH = 0.3;

const BUBBLE_COLORS = {
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  yellow: "#FDD835",
  purple: "#8E24AA",
};

const COLOR_KEYS = Object.keys(BUBBLE_COLORS) as Array<keyof typeof BUBBLE_COLORS>;

function generateHexGrid(): Array<{ x: number; y: number; color: keyof typeof BUBBLE_COLORS }> {
  const bubbles: Array<{ x: number; y: number; color: keyof typeof BUBBLE_COLORS }> = [];
  const rows = 6;
  const startY = 1.5;
  const rowHeight = BUBBLE_DIAMETER * 0.866;

  for (let row = 0; row < rows; row++) {
    const isOffsetRow = row % 2 === 1;
    const bubblesInRow = isOffsetRow ? 7 : 8;
    const startX = isOffsetRow ? 2.0 + BUBBLE_RADIUS : 1.65;
    const spacing = BUBBLE_DIAMETER;

    for (let col = 0; col < bubblesInRow; col++) {
      const x = startX + col * spacing;
      const y = startY + row * rowHeight;
      const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
      bubbles.push({ x, y, color });
    }
  }

  return bubbles;
}

const bubbleGrid = generateHexGrid();

const bubbleEntities = bubbleGrid.map((b, i) => ({
  id: `bubble-${i}`,
  name: `Bubble ${i + 1}`,
  template: `bubble_${b.color}`,
  transform: { x: cx(b.x), y: cy(b.y), angle: 0, scaleX: 1, scaleY: 1 },
}));

const game: GameDefinition = {
  metadata: {
    id: "test-bubble-shooter",
    title: "Bubble Shooter",
    description: "Match 3+ bubbles of the same color to pop them and clear the board",
    instructions: "Drag to aim, release to shoot. Match 3+ same-colored bubbles to pop them!",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "destroy_all",
    tag: "bubble",
  },
  loseCondition: {
    type: "custom",
  },
  templates: {
    bubble_red: {
      id: "bubble_red",
      tags: ["bubble", "bubble-red"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bubble_red.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    bubble_blue: {
      id: "bubble_blue",
      tags: ["bubble", "bubble-blue"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bubble_blue.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    bubble_green: {
      id: "bubble_green",
      tags: ["bubble", "bubble-green"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bubble_green.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    bubble_yellow: {
      id: "bubble_yellow",
      tags: ["bubble", "bubble-yellow"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bubble_yellow.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    bubble_purple: {
      id: "bubble_purple",
      tags: ["bubble", "bubble-purple"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bubble_purple.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    projectile: {
      id: "projectile",
      tags: ["projectile"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/projectile.png`,
        imageWidth: BUBBLE_DIAMETER,
        imageHeight: BUBBLE_DIAMETER,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: BUBBLE_RADIUS,
        density: 1,
        friction: 0,
        restitution: 1,
        bullet: true,
      },
    },
    shooter: {
      id: "shooter",
      tags: ["shooter"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/shooter.png`,
        imageWidth: SHOOTER_WIDTH,
        imageHeight: SHOOTER_HEIGHT,
      },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: SHOOTER_WIDTH,
          height: SHOOTER_HEIGHT,
        },
        movement: "kinematic",
      },
      behaviors: [
        { type: "rotate_toward", target: "touch", speed: 200, offset: 0 },
      ],
    },
    shooterBase: {
      id: "shooterBase",
      tags: ["shooter-base"],
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/shooterBase.png`,
        imageWidth: 1.0,
        imageHeight: 1.0,
      },
      type: "zone",
      zone: {
        shape: {
          type: "circle",
          radius: 0.5,
        },
      },
    },
    wallLeft: {
      id: "wallLeft",
      tags: ["wall"],
      sprite: { type: "rect", width: WALL_WIDTH, height: WORLD_HEIGHT, color: "#2D3748" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WALL_WIDTH,
        height: WORLD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 1,
      },
    },
    wallRight: {
      id: "wallRight",
      tags: ["wall"],
      sprite: { type: "rect", width: WALL_WIDTH, height: WORLD_HEIGHT, color: "#2D3748" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WALL_WIDTH,
        height: WORLD_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 1,
      },
    },
    ceiling: {
      id: "ceiling",
      tags: ["ceiling"],
      sprite: { type: "rect", width: WORLD_WIDTH, height: WALL_WIDTH, color: "#2D3748" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH,
        height: WALL_WIDTH,
        density: 0,
        friction: 0,
        restitution: 0,
      },
    },
    deathLine: {
      id: "deathLine",
      tags: ["death-line"],
      sprite: { type: "rect", width: WORLD_WIDTH, height: 0.1, color: "#FF000044" },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: WORLD_WIDTH,
          height: 0.1,
        },
      },
    },
    aimLine: {
      id: "aimLine",
      tags: ["aim-line"],
      sprite: { type: "rect", width: 0.05, height: 3, color: "#FFFFFF44" },
      type: "zone",
      zone: {
        shape: {
          type: "box",
          width: 0.05,
          height: 3,
        },
        movement: "kinematic",
      },
      behaviors: [
        { type: "rotate_toward", target: "touch", speed: 200, offset: 0 },
      ],
    },
  },
  entities: [
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wallLeft",
      transform: { x: cx(WALL_WIDTH / 2), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wallRight",
      transform: { x: cx(WORLD_WIDTH - WALL_WIDTH / 2), y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "ceiling",
      name: "Ceiling",
      template: "ceiling",
      transform: { x: 0, y: cy(WALL_WIDTH / 2), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "death-line",
      name: "Death Line",
      template: "deathLine",
      transform: { x: 0, y: cy(WORLD_HEIGHT - 3), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "shooter-base",
      name: "Shooter Base",
      template: "shooterBase",
      transform: { x: 0, y: cy(WORLD_HEIGHT - 1.5), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "shooter",
      name: "Shooter",
      template: "shooter",
      transform: { x: 0, y: cy(WORLD_HEIGHT - 1.5), angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
    },
    {
      id: "aim-line",
      name: "Aim Line",
      template: "aimLine",
      transform: { x: 0, y: cy(WORLD_HEIGHT - 3), angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
    },
    ...bubbleEntities,
  ],
  rules: [
    {
      id: "fire_projectile",
      name: "Fire projectile on release (only if no projectile in play)",
      trigger: { type: "drag", phase: "end" },
      conditions: [
        { type: "entity_count", tag: "projectile", max: 0 },
      ],
      actions: [
        { type: "spawn", template: "projectile", position: { type: "fixed", x: 0, y: cy(WORLD_HEIGHT - 1.5) } },
        { type: "apply_impulse", target: { type: "by_tag", tag: "projectile" }, direction: "toward_touch", force: 8, sourceEntityId: "shooter" },
      ],
    },
    {
      id: "projectile_hits_bubble",
      name: "Projectile hits bubble - destroy both and add score",
      trigger: { type: "collision", entityATag: "projectile", entityBTag: "bubble" },
      actions: [
        { type: "score", operation: "add", value: 100 },
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "camera_shake", intensity: 0.05, duration: 0.1 },
      ],
    },
    {
      id: "projectile_hits_ceiling",
      name: "Projectile hits ceiling - destroy it",
      trigger: { type: "collision", entityATag: "projectile", entityBTag: "ceiling" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "projectile" } },
      ],
    },
    {
      id: "bubble_hits_death_line",
      name: "Game over if bubble reaches death line",
      trigger: { type: "collision", entityATag: "bubble", entityBTag: "death-line" },
      actions: [
        { type: "game_state", state: "lose" },
      ],
      fireOnce: true,
    },
  ],
};

export default game;
