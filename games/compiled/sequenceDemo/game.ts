import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Sequence Demo",
  description: "Demonstrates startSequence() with chained animations",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;

const game: GameDefinition = {
  metadata: {
    id: "sequenceDemo",
    title: "Sequence Demo",
    description: "Demonstrates startSequence() with chained animations",
    instructions: "Tap anywhere to spawn a ball. Watch the intro sequence on start!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#0f172a",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    ballCount: 0,
  },
  ui: {
    showTimer: false,
    backgroundColor: "#1e293b",
    variableDisplays: [
      { name: "score", label: "Score", position: "top-right" },
      { name: "ballCount", label: "Balls", position: "top-left" },
    ],
  },
  templates: {
    title: {
      id: "title",
      tags: ["title"],
      visual: {
        type: "text",
        text: "Sequence Demo",
        fontSize: 48,
        color: "#60a5fa",
      },
      collider: {
        shape: "box",
        width: 6,
        height: 1,
        isSensor: true,
      },
    },
    ball: {
      id: "ball",
      tags: ["ball"],
      visual: {
        type: "circle",
        radius: 0.3,
        color: "#f472b6",
      },
      physics: {
        bodyType: "dynamic",
        density: 1,
        ccd: true,
      },
      collider: {
        shape: "circle",
        radius: 0.3,
        friction: 0.3,
        restitution: 0.7,
      },
    },
    floor: {
      id: "floor",
      tags: ["floor"],
      visual: {
        type: "rect",
        width: WORLD_WIDTH,
        height: 0.5,
        color: "#334155",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: WORLD_WIDTH,
        height: 0.5,
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      visual: {
        type: "rect",
        width: 0.5,
        height: WORLD_HEIGHT,
        color: "#334155",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 0.5,
        height: WORLD_HEIGHT,
      },
    },
  },
  entities: [
    {
      id: "title",
      name: "Title",
      template: "title",
      transform: { x: 0, y: 6, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "floor",
      name: "Floor",
      template: "floor",
      transform: { x: 0, y: -WORLD_HEIGHT / 2 + 0.25, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wall",
      transform: { x: -WORLD_WIDTH / 2 + 0.25, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wall",
      transform: { x: WORLD_WIDTH / 2 - 0.25, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  script: `
// Intro sequence on game start
exports.onStart = function(ctx) {
  ctx.world.setVariable('score', 0);
  ctx.world.setVariable('ballCount', 0);
  
  ctx.startSequence('intro', async (world) => {
    await world.animate('title', { opacity: 0 }, { duration: 0 });
    await world.wait(300);
    await world.animate('title', { opacity: 1 }, { duration: 800, easing: 'ease-out' });
    await world.wait(1500);
    await world.animate('title', { opacity: 0, y: 8 }, { duration: 500, easing: 'ease-in' });
    await world.destroy('title');
  });
};

// Spawn ball on tap with score animation
exports.onInput = function(ctx, event) {
  if (event.type !== 'tap' || !event.position) return;
  
  const ballId = 'ball-' + ctx.frameId;
  ctx.world.spawn('ball', event.position, { tags: ['ball'] });
  
  const count = ctx.getVariable('ballCount');
  ctx.world.setVariable('ballCount', count + 1);
};

// Death animation on collision with floor
exports.onCollision = function(ctx, collision) {
  const ballId = ctx.hasTag(collision.entityA, 'ball') ? collision.entityA :
                 ctx.hasTag(collision.entityB, 'ball') ? collision.entityB : null;
  const floorId = ctx.hasTag(collision.entityA, 'floor') ? collision.entityA :
                  ctx.hasTag(collision.entityB, 'floor') ? collision.entityB : null;
  
  if (ballId && floorId) {
    ctx.startSequence('death-' + ballId, async (world) => {
      await world.animate(ballId, { scaleX: 1.5, scaleY: 0.5 }, { duration: 100, easing: 'ease-out' });
      await world.wait(50);
      await world.animate(ballId, { opacity: 0, scaleY: 0.1 }, { duration: 200, easing: 'ease-in' });
      await world.destroy(ballId);
      
      const score = await world.getVariable('score');
      await world.setVariable('score', score + 10);
      
      const count = await world.getVariable('ballCount');
      await world.setVariable('ballCount', count - 1);
    });
  }
};
`,
};

export default game;
