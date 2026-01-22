import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Pinball Lite",
  description: "Pinball table with bumpers, flippers - reach 5000 points to win!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-pinball-lite",
    title: "Pinball Lite",
    description: "Pinball table with bumpers, flippers - reach 5000 points to win!",
    instructions: "Tap left/right side to flip. Hit bumpers and targets to score 5000 points!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 8 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 16 },
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
      sprite: { type: "circle", radius: 0.3, color: "#C0C0C0" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.3,
        density: 2,
        friction: 0.1,
        restitution: 0.6,
      },
    },
    bumper: {
      id: "bumper",
      tags: ["bumper"],
      sprite: { type: "circle", radius: 0.6, color: "#9b59b6" },
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
      sprite: { type: "circle", radius: 0.4, color: "#e91e63" },
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
      sprite: { type: "rect", width: 0.8, height: 0.3, color: "#00FF00" },
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
      sprite: { type: "rect", width: 1.5, height: 0.3, color: "#e74c3c" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 1.5,
        height: 0.3,
        density: 1,
        friction: 0.5,
        restitution: 0.3,
      },
      behaviors: [],
    },
    drain: {
      id: "drain",
      tags: ["drain"],
      sprite: { type: "rect", width: 10, height: 0.5, color: "#FF000033" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 10,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: 0.15, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 9.85, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-top",
      name: "Top Wall",
      tags: ["wall"],
      transform: { x: 5, y: 0.15, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 10, height: 0.3, color: "#333366" },
      physics: { bodyType: "static", shape: "box", width: 10, height: 0.3, density: 0, friction: 0.1, restitution: 0.5 },
    },
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: 5, y: 16.25, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-1", name: "Bumper 1", template: "bumper", transform: { x: 3, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-2", name: "Bumper 2", template: "bumper", transform: { x: 7, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-3", name: "Bumper 3", template: "bumper", transform: { x: 5, y: 5.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-1", name: "Small Bumper 1", template: "smallBumper", transform: { x: 2, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-2", name: "Small Bumper 2", template: "smallBumper", transform: { x: 8, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "small-bumper-3", name: "Small Bumper 3", template: "smallBumper", transform: { x: 5, y: 8, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-1", name: "Target 1", template: "target", transform: { x: 2, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-2", name: "Target 2", template: "target", transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "target-3", name: "Target 3", template: "target", transform: { x: 8, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "slingshot-left",
      name: "Left Slingshot",
      tags: ["slingshot"],
      transform: { x: 1.5, y: 11, angle: Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 2, height: 0.2, color: "#f39c12" },
      physics: { bodyType: "static", shape: "box", width: 2, height: 0.2, density: 0, friction: 0, restitution: 1.2 },
    },
    {
      id: "slingshot-right",
      name: "Right Slingshot",
      tags: ["slingshot"],
      transform: { x: 8.5, y: 11, angle: -Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 2, height: 0.2, color: "#f39c12" },
      physics: { bodyType: "static", shape: "box", width: 2, height: 0.2, density: 0, friction: 0, restitution: 1.2 },
    },
    { id: "flipper-left", name: "Left Flipper", template: "flipper", transform: { x: 3, y: 13.5, angle: 0.3, scaleX: 1, scaleY: 1 } },
    { id: "flipper-right", name: "Right Flipper", template: "flipper", transform: { x: 7, y: 13.5, angle: -0.3, scaleX: 1, scaleY: 1 } },
    { id: "ball", name: "Ball", template: "pinball", transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "flip_flippers",
      name: "Flip Flippers",
      trigger: { type: "tap" },
      actions: [
        { type: "apply_impulse", target: { type: "by_tag", tag: "flipper" }, y: -50 },
      ],
    },
    {
      id: "ball_drain",
      name: "Ball drains",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
      ],
    },
  ],
};

export default game;
