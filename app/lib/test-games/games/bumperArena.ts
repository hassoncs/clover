import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Bumper Arena",
  description: "Push enemies out of the arena using tilt controls - survive 60 seconds to win!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-bumper-arena",
    title: "Bumper Arena",
    description: "Push enemies out of the arena using tilt controls - survive 60 seconds to win!",
    instructions: "Tilt your device to move. Avoid the red edges and survive for 60 seconds!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 14 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: true,
    timerCountdown: true,
    backgroundColor: "#1a1a2e",
  },
  winCondition: {
    type: "survive_time",
    time: 60,
  },
  loseCondition: {
    type: "entity_destroyed",
    tag: "player",
  },
  templates: {
    playerBot: {
      id: "playerBot",
      tags: ["player"],
      sprite: { type: "circle", radius: 0.6, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.8,
        linearDamping: 0.5,
      },
      behaviors: [
        { type: "control", controlType: "tilt_to_move", force: 8, maxSpeed: 10 },
      ],
    },
    enemyBot: {
      id: "enemyBot",
      tags: ["enemy"],
      sprite: { type: "circle", radius: 0.5, color: "#e74c3c" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.3,
        restitution: 0.8,
        linearDamping: 0.3,
      },
      behaviors: [
        { type: "move", direction: "toward_target", target: "player", speed: 3, movementType: "force" },
        { type: "score_on_collision", withTags: ["boundary"], points: 100 },
      ],
    },
    bumper: {
      id: "bumper",
      tags: ["bumper"],
      sprite: { type: "circle", radius: 0.7, color: "#9b59b6" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.7,
        density: 0,
        friction: 0,
        restitution: 1.5,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["player", "enemy"], points: 10 },
      ],
    },
    boundary: {
      id: "boundary",
      tags: ["boundary", "hazard"],
      sprite: { type: "rect", width: 14, height: 0.4, color: "#FF4444" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 14,
        height: 0.4,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    {
      id: "arena-floor",
      name: "Arena Floor",
      tags: ["floor"],
      transform: { x: 7, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 5.5, color: "#2d3436" },
      physics: { bodyType: "static", shape: "circle", radius: 5.5, density: 0, friction: 0.5, restitution: 0 },
    },
    {
      id: "boundary-top",
      name: "Top Boundary",
      template: "boundary",
      transform: { x: 7, y: 0.2, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "boundary-bottom",
      name: "Bottom Boundary",
      template: "boundary",
      transform: { x: 7, y: 13.8, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "boundary-left",
      name: "Left Boundary",
      tags: ["boundary", "hazard"],
      transform: { x: 0.2, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.4, height: 14, color: "#FF4444" },
      physics: { bodyType: "static", shape: "box", width: 0.4, height: 14, density: 0, friction: 0, restitution: 0, isSensor: true },
    },
    {
      id: "boundary-right",
      name: "Right Boundary",
      tags: ["boundary", "hazard"],
      transform: { x: 13.8, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.4, height: 14, color: "#FF4444" },
      physics: { bodyType: "static", shape: "box", width: 0.4, height: 14, density: 0, friction: 0, restitution: 0, isSensor: true },
    },
    { id: "bumper-1", name: "Bumper 1", template: "bumper", transform: { x: 4, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-2", name: "Bumper 2", template: "bumper", transform: { x: 10, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-3", name: "Bumper 3", template: "bumper", transform: { x: 7, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-4", name: "Bumper 4", template: "bumper", transform: { x: 4, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-5", name: "Bumper 5", template: "bumper", transform: { x: 10, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "spinner",
      name: "Spinning Hazard",
      tags: ["hazard"],
      transform: { x: 7, y: 3.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 3, height: 0.3, color: "#F59E0B" },
      physics: { bodyType: "kinematic", shape: "box", width: 3, height: 0.3, density: 0, friction: 0, restitution: 1.2 },
      behaviors: [
        { type: "rotate", speed: 2, direction: "clockwise", affectsPhysics: true },
      ],
    },
    {
      id: "spinner-2",
      name: "Spinning Hazard 2",
      tags: ["hazard"],
      transform: { x: 7, y: 10.5, angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 3, height: 0.3, color: "#F59E0B" },
      physics: { bodyType: "kinematic", shape: "box", width: 3, height: 0.3, density: 0, friction: 0, restitution: 1.2 },
      behaviors: [
        { type: "rotate", speed: 2, direction: "counterclockwise", affectsPhysics: true },
      ],
    },
    { id: "player", name: "Player", template: "playerBot", transform: { x: 7, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-1", name: "Enemy 1", template: "enemyBot", transform: { x: 3, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-2", name: "Enemy 2", template: "enemyBot", transform: { x: 11, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-3", name: "Enemy 3", template: "enemyBot", transform: { x: 7, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "player_out",
      name: "Player touches boundary",
      trigger: { type: "collision", entityATag: "player", entityBTag: "boundary" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "player" } },
      ],
    },
    {
      id: "enemy_out",
      name: "Enemy touches boundary",
      trigger: { type: "collision", entityATag: "enemy", entityBTag: "boundary" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
      ],
    },
  ],
};

export default game;
