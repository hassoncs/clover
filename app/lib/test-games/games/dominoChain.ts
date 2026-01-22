import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Domino Chain",
  description: "Tap to launch the ball and knock down all dominoes!",
};

const dominoPositions: Array<{ x: number; y: number; angle: number }> = [];
for (let i = 0; i < 15; i++) {
  dominoPositions.push({ x: 3 + i * 0.8, y: 9.5, angle: 0 });
}

const game: GameDefinition = {
  metadata: {
    id: "test-domino-chain",
    title: "Domino Chain",
    description: "Tap to launch the ball and knock down all dominoes!",
    instructions: "Drag back on the red ball to aim, release to launch. Knock down all dominoes!",
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
    showLives: true,
    showTimer: false,
    backgroundColor: "#1e293b",
  },
  winCondition: {
    type: "destroy_all",
    tag: "domino",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 3,
  templates: {
    domino: {
      id: "domino",
      tags: ["domino", "target"],
      sprite: { type: "rect", width: 0.2, height: 1, color: "#FBBF24" },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: 0.2,
        height: 1,
        density: 1,
        friction: 0.6,
        restitution: 0.1,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["pusher", "domino"], points: 50, once: true },
        { type: "destroy_on_collision", withTags: ["ground"], effect: "fade" },
      ],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: { type: "rect", width: 18, height: 0.5, color: "#374151" },
      physics: {
        bodyType: "static",
        shape: "box",
        width: 18,
        height: 0.5,
        density: 0,
        friction: 0.8,
        restitution: 0.1,
      },
    },
    pusher: {
      id: "pusher",
      tags: ["pusher", "projectile"],
      sprite: { type: "circle", radius: 0.5, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 3,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "control", controlType: "drag_to_aim", force: 15, aimLine: true, maxPullDistance: 4 },
      ],
    },
    targetBall: {
      id: "targetBall",
      tags: ["target", "bonus"],
      sprite: { type: "circle", radius: 0.6, color: "#10B981" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.5,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["pusher", "domino"], points: 200, once: true },
        { type: "destroy_on_collision", withTags: ["pusher"], effect: "fade" },
      ],
    },
  },
  entities: [
    { id: "ground", name: "Ground", template: "ground", transform: { x: 10, y: 10.5, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "pusher", name: "Pusher Ball", template: "pusher", transform: { x: 1, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    ...dominoPositions.map((pos, i) => ({
      id: `domino-${i + 1}`,
      name: `Domino ${i + 1}`,
      template: "domino" as const,
      transform: { x: pos.x, y: pos.y, angle: pos.angle, scaleX: 1, scaleY: 1 },
    })),
    {
      id: "ramp",
      name: "Ramp",
      tags: ["ground"],
      transform: { x: 1.5, y: 6, angle: Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 4, height: 0.3, color: "#6B7280" },
      physics: { bodyType: "static", shape: "box", width: 4, height: 0.3, density: 0, friction: 0.4, restitution: 0.1 },
    },
    { id: "target-ball", name: "Bonus Ball", template: "targetBall", transform: { x: 18, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
