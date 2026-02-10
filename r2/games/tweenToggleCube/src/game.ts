import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Tween Toggle Cube",
  description: "Tap a button to tween a cube left and right.",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const CUBE_LEFT_X = -2;
const CUBE_RIGHT_X = 2;
const CUBE_Y = 1;

const game: GameDefinition = {
  metadata: {
    id: "9da2e0ff-6cb6-4ecb-a827-3c7a7c312f09",
    slug: "tweenToggleCube",
    title: "Tween Toggle Cube",
    description: "Tap a button to tween a cube between two positions.",
    instructions: "Tap Animate to move the cube. Tap again to move it back.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#0f172a",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  overlay: {
    elements: [],
  },
  templates: {
    cube: {
      id: "cube",
      tags: ["cube"],
      visual: {
        type: "rect",
        width: 1.2,
        height: 1.2,
        color: "#38bdf8",
      },
      physics: {
        bodyType: "kinematic",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 1.2,
        height: 1.2,
      },
    },
    animateButton: {
      id: "animateButton",
      tags: ["animateButton"],
      visual: {
        type: "rect",
        width: 3.6,
        height: 1,
        color: "#22c55e",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 3.6,
        height: 1,
      },
    },
    animateLabel: {
      id: "animateLabel",
      tags: ["animateLabel"],
      visual: {
        type: "text",
        text: "Animate",
        fontSize: 20,
        color: "#052e16",
      },
    },
  },
  entities: [
    {
      id: "cube",
      name: "Cube",
      template: "cube",
      transform: { x: CUBE_LEFT_X, y: CUBE_Y, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 1,
    },
    {
      id: "animateButton",
      name: "Animate Button",
      template: "animateButton",
      transform: { x: 0, y: -6, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "animateLabel",
      name: "Animate Label",
      template: "animateLabel",
      transform: { x: 0, y: -6, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 3,
    },
  ],
  rules: [
    {
      id: "toggle_cube_tween",
      name: "Toggle cube tween on animate button tap",
      trigger: { type: "tap" },
      actions: [{ type: "run_script", export: "toggleCubeTween" }],
    },
  ],
  script: `
exports.toggleCubeTween = function(ctx) {
  if (ctx.isSequenceRunning('cube_toggle')) return;

  var pos = ctx.getEntityPosition('cube');
  var targetX = pos && pos.x > 0 ? ${CUBE_LEFT_X} : ${CUBE_RIGHT_X};

  ctx.startSequence('cube_toggle', async function(world) {
    await world.animate('cube', { x: targetX, y: ${CUBE_Y} }, { duration: 450, easing: 'ease-in-out' });
  });
};
`,
};

export default game;
