import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Breakout Bouncer",
  description: "Classic brick-breaker: ball bounces off paddle to destroy bricks",
};

const game: GameDefinition = {
  metadata: {
    id: "test-breakout-bouncer",
    title: "Breakout Bouncer",
    description: "Classic brick-breaker: ball bounces off paddle to destroy bricks",
    instructions: "Drag the paddle left/right to bounce the ball. Destroy all bricks to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 20 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#0a0a2e",
  },
  winCondition: {
    type: "destroy_all",
    tag: "brick",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    ball: {
      id: "ball",
      tags: ["ball"],
      sprite: { type: "circle", radius: 0.25, color: "#FFFFFF" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.25,
        density: 1,
        friction: 0,
        restitution: 1,
        linearDamping: 0,
        initialVelocity: { x: 3, y: -6 },
        bullet: true,
      },
    },
    paddle: {
      id: "paddle",
      tags: ["paddle"],
      sprite: { type: "rect", width: 2, height: 0.4, color: "#00FFFF" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 2,
        height: 0.4,
        density: 0,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "control", controlType: "drag_to_move" },
      ],
    },
    brickRed: {
      id: "brickRed",
      tags: ["brick"],
      sprite: { type: "rect", width: 1.2, height: 0.5, color: "#FF0066" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 1.2,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 40 },
      ],
    },
    brickBlue: {
      id: "brickBlue",
      tags: ["brick"],
      sprite: { type: "rect", width: 1.2, height: 0.5, color: "#00FFFF" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 1.2,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 10 },
      ],
    },
    brickGreen: {
      id: "brickGreen",
      tags: ["brick"],
      sprite: { type: "rect", width: 1.2, height: 0.5, color: "#00FF66" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 1.2,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 20 },
      ],
    },
    brickYellow: {
      id: "brickYellow",
      tags: ["brick"],
      sprite: { type: "rect", width: 1.2, height: 0.5, color: "#FFFF00" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 1.2,
        height: 0.5,
        density: 0,
        friction: 0,
        restitution: 1,
      },
      behaviors: [
        { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
        { type: "score_on_collision", withTags: ["ball"], points: 30 },
      ],
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.3, height: 20, color: "#333366" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.3,
        height: 20,
        density: 0,
        friction: 0,
        restitution: 1,
      },
    },
    drain: {
      id: "drain",
      tags: ["drain"],
      sprite: { type: "rect", width: 14, height: 2, color: "#FF000033" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 14,
        height: 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [
    // Walls
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: 0.15, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 13.85, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "wall-top",
      name: "Top Wall",
      tags: ["wall"],
      transform: { x: 7, y: 0.15, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 14, height: 0.3, color: "#333366" },
      physics: { bodyType: "static", shape: "box", width: 14, height: 0.3, density: 0, friction: 0, restitution: 1 },
    },
    // Drain zone at bottom (loses a life when ball enters)
    { id: "drain", name: "Drain Zone", template: "drain", transform: { x: 7, y: 21, angle: 0, scaleX: 1, scaleY: 1 } },
    // Paddle
    { id: "paddle", name: "Paddle", template: "paddle", transform: { x: 7, y: 18, angle: 0, scaleX: 1, scaleY: 1 } },
    // Ball with initial velocity
    {
      id: "ball",
      name: "Ball",
      template: "ball",
      transform: { x: 7, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
    },
    // Row 1 - Red bricks (top row, most points)
    { id: "brick-1-1", name: "Brick 1-1", template: "brickRed", transform: { x: 1.5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-2", name: "Brick 1-2", template: "brickRed", transform: { x: 2.9, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-3", name: "Brick 1-3", template: "brickRed", transform: { x: 4.3, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-4", name: "Brick 1-4", template: "brickRed", transform: { x: 5.7, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-5", name: "Brick 1-5", template: "brickRed", transform: { x: 7.1, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-6", name: "Brick 1-6", template: "brickRed", transform: { x: 8.5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-7", name: "Brick 1-7", template: "brickRed", transform: { x: 9.9, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-8", name: "Brick 1-8", template: "brickRed", transform: { x: 11.3, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-1-9", name: "Brick 1-9", template: "brickRed", transform: { x: 12.7, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    // Row 2 - Yellow bricks
    { id: "brick-2-1", name: "Brick 2-1", template: "brickYellow", transform: { x: 1.5, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-2", name: "Brick 2-2", template: "brickYellow", transform: { x: 2.9, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-3", name: "Brick 2-3", template: "brickYellow", transform: { x: 4.3, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-4", name: "Brick 2-4", template: "brickYellow", transform: { x: 5.7, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-5", name: "Brick 2-5", template: "brickYellow", transform: { x: 7.1, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-6", name: "Brick 2-6", template: "brickYellow", transform: { x: 8.5, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-7", name: "Brick 2-7", template: "brickYellow", transform: { x: 9.9, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-8", name: "Brick 2-8", template: "brickYellow", transform: { x: 11.3, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-2-9", name: "Brick 2-9", template: "brickYellow", transform: { x: 12.7, y: 2.7, angle: 0, scaleX: 1, scaleY: 1 } },
    // Row 3 - Green bricks
    { id: "brick-3-1", name: "Brick 3-1", template: "brickGreen", transform: { x: 1.5, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-2", name: "Brick 3-2", template: "brickGreen", transform: { x: 2.9, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-3", name: "Brick 3-3", template: "brickGreen", transform: { x: 4.3, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-4", name: "Brick 3-4", template: "brickGreen", transform: { x: 5.7, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-5", name: "Brick 3-5", template: "brickGreen", transform: { x: 7.1, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-6", name: "Brick 3-6", template: "brickGreen", transform: { x: 8.5, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-7", name: "Brick 3-7", template: "brickGreen", transform: { x: 9.9, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-8", name: "Brick 3-8", template: "brickGreen", transform: { x: 11.3, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-3-9", name: "Brick 3-9", template: "brickGreen", transform: { x: 12.7, y: 3.4, angle: 0, scaleX: 1, scaleY: 1 } },
    // Row 4 - Blue bricks (bottom row, fewest points)
    { id: "brick-4-1", name: "Brick 4-1", template: "brickBlue", transform: { x: 1.5, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-2", name: "Brick 4-2", template: "brickBlue", transform: { x: 2.9, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-3", name: "Brick 4-3", template: "brickBlue", transform: { x: 4.3, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-4", name: "Brick 4-4", template: "brickBlue", transform: { x: 5.7, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-5", name: "Brick 4-5", template: "brickBlue", transform: { x: 7.1, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-6", name: "Brick 4-6", template: "brickBlue", transform: { x: 8.5, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-7", name: "Brick 4-7", template: "brickBlue", transform: { x: 9.9, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-8", name: "Brick 4-8", template: "brickBlue", transform: { x: 11.3, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "brick-4-9", name: "Brick 4-9", template: "brickBlue", transform: { x: 12.7, y: 4.1, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      id: "ball_drain",
      name: "Ball falls through drain - lose a life and respawn",
      trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
      actions: [
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "by_tag", tag: "ball" } },
        { type: "spawn", template: "ball", position: { type: "fixed", x: 7, y: 15 } },
      ],
    },
  ],
};

export default game;
