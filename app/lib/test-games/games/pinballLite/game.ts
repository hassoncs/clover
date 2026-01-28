import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/pinball-lite";

export const metadata: TestGameMeta = {
  title: "Pinball Lite",
  description: "Pinball table with bumpers, flippers - reach 5000 points to win!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
  status: "archived",
};

const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const game: GameDefinition = {
  metadata: {
    id: "test-pinball-lite",
    title: "Pinball Lite",
    description: "Pinball table with bumpers, flippers - reach 5000 points to win!",
    instructions: "Tap left/right side to flip. Hit bumpers and targets to score 5000 points!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#0a0a2e",
  },
  winCondition: {
    type: "score",
    score: 5000,
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    pinball: {
      id: "pinball",
      tags: ["ball"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/pinball.png`, imageWidth: 0.6, imageHeight: 0.6 },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.3,
        density: 2,
        friction: 0.1,
        restitution: 0.6,
        initialVelocity: { x: 1, y: -3 },
      },
    },
    bumper: {
      id: "bumper",
      tags: ["bumper"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/bumper.png`, imageWidth: 1.2, imageHeight: 1.2 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.6,
        density: 0,
        friction: 0,
        restitution: 1.5,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["ball"], points: 100 },
      ],
    },
    smallBumper: {
      id: "smallBumper",
      tags: ["bumper"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/smallBumper.png`, imageWidth: 0.8, imageHeight: 0.8 },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.4,
        density: 0,
        friction: 0,
        restitution: 1.3,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["ball"], points: 50 },
      ],
    },
    target: {
      id: "target",
      tags: ["target"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/target.png`, imageWidth: 0.8, imageHeight: 0.3 },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.8,
        height: 0.3,
        density: 0,
        friction: 0,
        restitution: 1.0,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["ball"], points: 200 },
      ],
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.3, height: 16, color: "#333366" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.3,
        height: 16,
        density: 0,
        friction: 0.1,
        restitution: 0.5,
      },
    },
    flipper: {
      id: "flipper",
      tags: ["flipper"],
      sprite: { type: "image", imageUrl: `${ASSET_BASE}/flipper.png`, imageWidth: 1.5, imageHeight: 0.3 },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 1.5,
        height: 0.3,
        density: 5,
        friction: 0.5,
        restitution: 0.3,
        fixedRotation: false,
      },
      behaviors: [],
    },
    drain: {
      id: "drain",
      tags: ["drain"],
      sprite: { type: "rect", width: 10, height: 0.5, color: "#FF000033" },
      type: "zone",
      zone: {
        shape: { type: "box", width: 10, height: 0.5 },
      },
    },
  },
  entities: [
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: cx(0.15), y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: cx(9.85), y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-top",
      name: "Top Wall",
      tags: ["wall"],
      transform: { x: 0, y: cy(0.15), angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 10, height: 0.3, color: "#333366" },
      physics: { bodyType: "static", shape: "box", width: 10, height: 0.3, density: 0, friction: 0.1, restitution: 0.5 },
    },
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: 0, y: cy(16.25), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-1", name: "Bumper 1", template: "bumper", transform: { x: cx(3), y: cy(4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-2", name: "Bumper 2", template: "bumper", transform: { x: cx(7), y: cy(4), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-3", name: "Bumper 3", template: "bumper", transform: { x: cx(5), y: cy(5.5), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-1", name: "Small Bumper 1", template: "smallBumper", transform: { x: cx(2), y: cy(7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-2", name: "Small Bumper 2", template: "smallBumper", transform: { x: cx(8), y: cy(7), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-3", name: "Small Bumper 3", template: "smallBumper", transform: { x: cx(5), y: cy(8), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-1", name: "Target 1", template: "target", transform: { x: cx(2), y: cy(2.5), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-2", name: "Target 2", template: "target", transform: { x: cx(5), y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-3", name: "Target 3", template: "target", transform: { x: cx(8), y: cy(2.5), angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "slingshot-left",
      name: "Left Slingshot",
      tags: ["slingshot"],
      transform: { x: cx(1.5), y: cy(11), angle: -Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 2, height: 0.2, color: "#f39c12" },
      physics: { bodyType: "static", shape: "box", width: 2, height: 0.2, density: 0, friction: 0, restitution: 1.2 },
    },
    {
      id: "slingshot-right",
      name: "Right Slingshot",
      tags: ["slingshot"],
      transform: { x: cx(8.5), y: cy(11), angle: Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 2, height: 0.2, color: "#f39c12" },
      physics: { bodyType: "static", shape: "box", width: 2, height: 0.2, density: 0, friction: 0, restitution: 1.2 },
    },
    { id: "flipper-left", name: "Left Flipper", template: "flipper", transform: { x: cx(3), y: cy(13.5), angle: -0.3, scaleX: 1, scaleY: 1 } },
    { id: "flipper-right", name: "Right Flipper", template: "flipper", transform: { x: cx(7), y: cy(13.5), angle: 0.3, scaleX: 1, scaleY: 1 } },
    { id: "ball", name: "Ball", template: "pinball", transform: { x: 0, y: cy(2), angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "flip_left",
      name: "Flip Left Flipper",
      trigger: { type: "button", button: "left", state: "pressed" },
      actions: [
        { type: "apply_impulse", target: { type: "by_id", entityId: "flipper-left" }, y: 50 },
      ],
    },
    {
      id: "flip_right",
      name: "Flip Right Flipper",
      trigger: { type: "button", button: "right", state: "pressed" },
      actions: [
        { type: "apply_impulse", target: { type: "by_id", entityId: "flipper-right" }, y: 50 },
      ],
    },
    {
      id: "flip_flippers_tap",
      name: "Flip Both Flippers on Tap",
      trigger: { type: "tap" },
      actions: [
        { type: "apply_impulse", target: { type: "by_tag", tag: "flipper" }, y: 50 },
      ],
    },
    {
      id: "ball_drain",
      name: "Ball drains - lose life and respawn",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "spawn", template: "pinball", position: { type: "fixed", x: 0, y: 6 } },
      ],
    },
  ],
};

export default game;
