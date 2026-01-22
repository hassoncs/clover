import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Bouncing Balls",
  description: "Tap to spawn balls with varying bounciness - reach 500 points!",
};

const game: GameDefinition = {
  metadata: {
    id: "test-bouncing-balls",
    title: "Bouncing Balls",
    description: "Tap to spawn balls with varying bounciness - reach 500 points!",
    instructions: "Drag the spawner, tap to drop balls. Score 500 points before time runs out!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: true,
    timerCountdown: true,
    backgroundColor: "#1e293b",
  },
  winCondition: {
    type: "score",
    score: 500,
  },
  loseCondition: {
    type: "time_up",
    time: 60,
  },
  templates: {
    ground: {
      id: "ground",
      tags: ["ground", "target"],
      sprite: { type: "rect", width: 18, height: 0.5, color: "#374151" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 18,
        height: 0.5,
        density: 1,
        friction: 0.5,
        restitution: 1,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["ball"], points: 10 },
      ],
    },
    wallLeft: {
      id: "wallLeft",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.3, height: 10, color: "#374151" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.3,
        height: 10,
        density: 1,
        friction: 0.5,
        restitution: 1,
      },
    },
    wallRight: {
      id: "wallRight",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.3, height: 10, color: "#374151" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 0.3,
        height: 10,
        density: 1,
        friction: 0.5,
        restitution: 1,
      },
    },
    ballSpawner: {
      id: "ballSpawner",
      tags: ["spawner"],
      sprite: { type: "rect", width: 2, height: 0.3, color: "#666666" },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 2,
        height: 0.3,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [
        { type: "control", controlType: "drag_to_move" },
        { type: "spawn_on_event", event: "tap", entityTemplate: "bouncyBall", spawnPosition: "at_self" },
      ],
    },
    bouncyBall: {
      id: "bouncyBall",
      tags: ["ball"],
      sprite: { type: "circle", radius: 0.5, color: "#3B82F6" },
      physics: { bodyType: "dynamic", shape: "circle", radius: 0.5, density: 1, friction: 0.3, restitution: 1.0 },
      behaviors: [
        { type: "timer", duration: 10, action: "destroy" },
      ],
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 10, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-left", name: "Left Wall", template: "wallLeft", transform: { x: 1, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wallRight", transform: { x: 19, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "spawner", name: "Ball Spawner", template: "ballSpawner", transform: { x: 10, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
