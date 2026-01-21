import type { GameDefinition } from "@clover/shared";

const dominoPositions: Array<{ x: number; y: number; angle: number }> = [];
for (let i = 0; i < 15; i++) {
  dominoPositions.push({ x: 3 + i * 0.8, y: 9.5, angle: 0 });
}

export const dominoChainGame: GameDefinition = {
  metadata: {
    id: "test-domino-chain",
    title: "Domino Chain",
    description: "Chain reaction physics - dominoes falling in sequence",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 20, height: 12 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1e293b",
  },
  templates: {
    domino: {
      id: "domino",
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
    },
    ground: {
      id: "ground",
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
      sprite: { type: "circle", radius: 0.5, color: "#EF4444" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 3,
        friction: 0.3,
        restitution: 0.2,
      },
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
      transform: { x: 1.5, y: 6, angle: Math.PI / 6, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 4, height: 0.3, color: "#6B7280" },
      physics: { bodyType: "static", shape: "box", width: 4, height: 0.3, density: 0, friction: 0.4, restitution: 0.1 },
    },
    {
      id: "target-ball",
      name: "Target Ball",
      transform: { x: 18, y: 9.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 0.6, color: "#10B981" },
      physics: { bodyType: "dynamic", shape: "circle", radius: 0.6, density: 1, friction: 0.3, restitution: 0.5 },
    },
  ],
};
