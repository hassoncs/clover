import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Slopeggle",
  description: "Clear all orange pegs by bouncing a ball through the board",
};

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/slopeggle";

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const PEG_RADIUS = 0.125;
const BALL_RADIUS = 0.15;

function generatePegLayout(): Array<{ x: number; y: number; isOrange: boolean }> {
  const pegs: Array<{ x: number; y: number; isOrange: boolean }> = [];
  
  const rows = [
    { y: 3.5, count: 9, offset: 0 },
    { y: 4.3, count: 10, offset: 0.5 },
    { y: 5.1, count: 9, offset: 0 },
    { y: 5.9, count: 10, offset: 0.5 },
    { y: 6.7, count: 9, offset: 0 },
    { y: 7.5, count: 10, offset: 0.5 },
    { y: 8.3, count: 9, offset: 0 },
    { y: 9.1, count: 10, offset: 0.5 },
    { y: 9.9, count: 9, offset: 0 },
    { y: 10.7, count: 10, offset: 0.5 },
    { y: 11.5, count: 9, offset: 0 },
    { y: 12.3, count: 8, offset: 0.5 },
  ];

  for (const row of rows) {
    const startX = 1.2 + row.offset * 0.5;
    const spacing = (WORLD_WIDTH - 2.4) / (row.count - 1);
    for (let i = 0; i < row.count; i++) {
      pegs.push({
        x: startX + i * spacing,
        y: row.y,
        isOrange: false,
      });
    }
  }

  const orangeIndices = [5, 15, 24, 35, 44, 55, 63, 74, 82, 95];
  for (const idx of orangeIndices) {
    if (idx < pegs.length) {
      pegs[idx].isOrange = true;
    }
  }

  return pegs;
}

const pegLayout = generatePegLayout();

const bluePegEntities = pegLayout
  .filter((p) => !p.isOrange)
  .map((p, i) => ({
    id: `blue-peg-${i}`,
    name: `Blue Peg ${i + 1}`,
    template: "bluePeg",
    transform: { x: p.x, y: p.y, angle: 0, scaleX: 1, scaleY: 1 },
  }));

const orangePegEntities = pegLayout
  .filter((p) => p.isOrange)
  .map((p, i) => ({
    id: `orange-peg-${i}`,
    name: `Orange Peg ${i + 1}`,
    template: "orangePeg",
    transform: { x: p.x, y: p.y, angle: 0, scaleX: 1, scaleY: 1 },
  }));

const game: GameDefinition = {
  metadata: {
    id: "test-slopeggle",
    title: "Slopeggle",
    description: "Clear all orange pegs by bouncing a ball through the board",
    instructions: "Touch and hold to aim the cannon, then release to fire! Clear all 10 orange pegs to win. You have 10 balls.",
    version: "1.0.0",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  },
  world: {
    gravity: { x: 0, y: 5 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    multiplier: 1,
    turn: 0,
  },
  ui: {
    showScore: true,
    showLives: true,
    livesLabel: "Balls",
    showTimer: false,
    backgroundColor: "#0a1628",
    entityCountDisplays: [
      { tag: "orange-peg", label: "Orange Pegs", color: "#F97316" },
    ],
    variableDisplays: [
      { name: "multiplier", label: "Multiplier", color: "#FBBF24", showWhen: "not_default", defaultValue: 1 },
      { name: "turn", label: "Shot", color: "#94A3B8" },
    ],
  },
  winCondition: {
    type: "destroy_all",
    tag: "orange-peg",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 10,
  templates: {
    ball: {
      id: "ball",
      tags: ["ball"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/ball.png`, imageWidth: BALL_RADIUS * 2, imageHeight: BALL_RADIUS * 2 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: BALL_RADIUS,
        density: 1,
        friction: 0.05,
        restitution: 0.75,
        bullet: true,
      },
    },
    cannon: {
      id: "cannon",
      tags: ["cannon"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/cannon.png`, imageWidth: 0.6, imageHeight: 0.25 },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.6,
        height: 0.25,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "rotate_toward", target: "touch", speed: 200, offset: 0 },
      ],
    },
    cannonBase: {
      id: "cannonBase",
      tags: ["cannon-base"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/cannonBase.png`, imageWidth: 0.6, imageHeight: 0.6 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.3,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    bluePeg: {
      id: "bluePeg",
      tags: ["peg", "blue-peg"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/bluePeg.png`, imageWidth: PEG_RADIUS * 2, imageHeight: PEG_RADIUS * 2 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: PEG_RADIUS,
        density: 0,
        friction: 0.05,
        restitution: 0.85,
      },
      behaviors: [
        { 
          type: "destroy_on_collision", 
          withTags: ["ball"], 
          effect: "fade",
          delay: { type: "event", eventName: "turn_end" },
          markedEffect: "glow",
          markedColor: "#60A5FA",
        },
        { type: "score_on_collision", withTags: ["ball"], points: { expr: "10 * multiplier" } },
      ],
    },
    orangePeg: {
      id: "orangePeg",
      tags: ["peg", "orange-peg"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/orangePeg.png`, imageWidth: PEG_RADIUS * 2, imageHeight: PEG_RADIUS * 2 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: PEG_RADIUS,
        density: 0,
        friction: 0.05,
        restitution: 0.85,
      },
      behaviors: [
        { 
          type: "destroy_on_collision", 
          withTags: ["ball"], 
          effect: "fade",
          delay: { type: "event", eventName: "turn_end" },
          markedEffect: "glow",
          markedColor: "#FBBF24",
        },
        { type: "score_on_collision", withTags: ["ball"], points: { expr: "100 * multiplier" } },
      ],
    },
    wallVertical: {
      id: "wallVertical",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.2, height: WORLD_HEIGHT, color: "#1e3a5f" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.2,
        height: WORLD_HEIGHT,
        density: 0,
        friction: 0.1,
        restitution: 0.6,
      },
    },
    drain: {
      id: "drain",
      tags: ["drain"],
      sprite: { type: "rect", width: WORLD_WIDTH, height: 1, color: "#FF000011" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH,
        height: 1,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    bucket: {
      id: "bucket",
      tags: ["bucket"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/bucket.png`, imageWidth: 1.2, imageHeight: 0.35 },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 1.2,
        height: 0.35,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "oscillate", axis: "x", amplitude: 4, frequency: 0.25 },
      ],
    },
    portalA: {
      id: "portalA",
      tags: ["portal"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/portalA.png`, imageWidth: 0.8, imageHeight: 0.8 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.4,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "teleport", destinationEntityId: "portal-b", withTags: ["ball"], preserveVelocity: true, cooldown: 0.3 },
      ],
    },
    portalB: {
      id: "portalB",
      tags: ["portal"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/portalB.png`, imageWidth: 0.8, imageHeight: 0.8 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.4,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "teleport", destinationEntityId: "portal-a", withTags: ["ball"], preserveVelocity: true, cooldown: 0.3 },
      ],
    },
  },
  entities: [
    { id: "wall-left", name: "Left Wall", template: "wallVertical", transform: { x: 0.1, y: WORLD_HEIGHT / 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wallVertical", transform: { x: WORLD_WIDTH - 0.1, y: WORLD_HEIGHT / 2, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-top",
      name: "Top Wall",
      tags: ["wall"],
      transform: { x: WORLD_WIDTH / 2, y: 0.1, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: WORLD_WIDTH, height: 0.2, color: "#1e3a5f" },
      physics: { bodyType: "static", shape: "box", width: WORLD_WIDTH, height: 0.2, density: 0, friction: 0.1, restitution: 0.6 },
    },
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT + 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bucket", name: "Free Ball Bucket", template: "bucket", transform: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 0.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "portal-a", name: "Portal A", template: "portalA", transform: { x: 1.5, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "portal-b", name: "Portal B", template: "portalB", transform: { x: WORLD_WIDTH - 1.5, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "cannon-base", name: "Cannon Base", template: "cannonBase", transform: { x: WORLD_WIDTH / 2, y: 1.0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "cannon", name: "Cannon", template: "cannon", transform: { x: WORLD_WIDTH / 2, y: 1.0, angle: Math.PI / 2, scaleX: 1, scaleY: 1 } },
    ...bluePegEntities,
    ...orangePegEntities,
  ],
  rules: [
    {
      id: "fire_ball",
      name: "Fire ball on release (only if no ball in play)",
      trigger: { type: "drag", phase: "end" },
      conditions: [
        { type: "entity_count", tag: "ball", max: 0 },
      ],
      actions: [
        { type: "spawn", template: "ball", position: { type: "fixed", x: WORLD_WIDTH / 2, y: 1.0 } },
        { type: "apply_impulse", target: { type: "by_tag", tag: "ball" }, direction: "toward_touch", force: 1, sourceEntityId: "cannon" },
        { type: "set_variable", name: "turn", operation: "add", value: 1 },
      ],
    },
    {
      id: "ball_drain",
      name: "Ball falls through drain - lose a life, destroy marked pegs",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "event", eventName: "turn_end" },
        { type: "destroy_marked", tag: "peg" },
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
      ],
    },
    {
      id: "bucket_catch",
      name: "Bucket catches ball - free ball bonus!",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "bucket" },
      actions: [
        { type: "event", eventName: "turn_end" },
        { type: "destroy_marked", tag: "peg" },
        { type: "score", operation: "add", value: 500 },
        { type: "lives", operation: "add", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "camera_shake", intensity: 0.15, duration: 0.2 },
      ],
    },
    {
      id: "blue_peg_hit_shake",
      name: "Camera shake on blue peg hit",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "blue-peg" },
      actions: [
        { type: "camera_shake", intensity: 0.03, duration: 0.1 },
      ],
    },
    {
      id: "orange_peg_hit_shake",
      name: "Stronger camera shake on orange peg hit",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "orange-peg" },
      actions: [
        { type: "camera_shake", intensity: 0.08, duration: 0.15 },
      ],
    },
    {
      id: "last_orange_peg_slowmo",
      name: "Dramatic slow-mo when hitting the last orange peg",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "orange-peg" },
      conditions: [
        { type: "entity_count", tag: "orange-peg", max: 1 },
      ],
      actions: [
        { type: "set_time_scale", scale: 0.25, duration: 2.5 },
        { type: "camera_shake", intensity: 0.12, duration: 0.3 },
      ],
      fireOnce: true,
    },
    {
      id: "peg_hit_multiplier",
      name: "Increment score multiplier on peg hit",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "peg" },
      actions: [
        { type: "set_variable", name: "multiplier", operation: "add", value: 1 },
      ],
    },
    {
      id: "reset_multiplier",
      name: "Reset score multiplier at turn end",
      trigger: { type: "event", eventName: "turn_end" },
      actions: [
        { type: "set_variable", name: "multiplier", operation: "set", value: 1 },
      ],
    },
    {
      id: "proximity_slowmo",
      name: "Slow time and zoom when ball is near orange peg",
      trigger: { type: "frame" },
      conditions: [
        { type: "entity_count", tag: "ball", min: 1 },
        { type: "expression", expr: "minDistanceToTag('orange-peg', entityPos('ball')) < 1.2" },
      ],
      actions: [
        { type: "set_time_scale", scale: 0.5 },
        { type: "camera_zoom", scale: 1.4, duration: 0.15, focusTag: "ball" },
      ],
    },
    {
      id: "proximity_normal_speed",
      name: "Restore normal time and zoom when ball is far from orange pegs",
      trigger: { type: "frame" },
      conditions: [
        { type: "entity_count", tag: "ball", min: 1 },
        { type: "expression", expr: "minDistanceToTag('orange-peg', entityPos('ball')) >= 1.2" },
      ],
      actions: [
        { type: "set_time_scale", scale: 1.0 },
        { type: "camera_zoom", scale: 1.0, duration: 0.2, focusTag: "ball" },
      ],
    },
  ],
};

export default game;
