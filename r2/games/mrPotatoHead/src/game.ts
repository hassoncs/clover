import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Mr. Potato Head",
  description:
    "Drag and drop pieces onto the potato to build your own Mr. Potato Head!",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;

const PACK_ID = "b3f4a5d6-0001-4000-8000-potato000001";

const PIECE_COLLIDER_SCALE = 0.9;

function makeDraggablePiece(
  id: string,
  tags: string[],
  whatDesc: string,
  w: number,
  h: number,
): NonNullable<GameDefinition["templates"]>[string] {
  return {
    id,
    tags: ["piece", ...tags],
    whatDescription: whatDesc,
    visual: {
      type: "image",
      imageWidth: w,
      imageHeight: h,
    },
    physics: {
      bodyType: "kinematic",
      density: 0,
    },
    collider: {
      shape: "box",
      width: w * PIECE_COLLIDER_SCALE,
      height: h * PIECE_COLLIDER_SCALE,
    },
    behaviors: [
      { type: "draggable", mode: "kinematic", requireDirectHit: true },
    ],
  };
}

const game: GameDefinition = {
  metadata: {
    id: "02b87353-0c1f-45a3-8868-f75ea5362778",
    slug: "mrPotatoHead",
    title: "Mr. Potato Head",
    description:
      "Drag and drop pieces onto the potato to build your own Mr. Potato Head!",
    instructions:
      "Drag pieces from the drawer onto the potato. Tap Reset to start over!",
    version: "1.0.0",
  },
  assetSystem: {
    activePackId: PACK_ID,
    packIds: [PACK_ID],
  },
  background: {
    type: "static",
    whatDescription:
      "A soft, blurry, colorful children's bedroom background with warm lighting, toys on shelves, pastel walls, and a cozy playful atmosphere, out of focus bokeh effect",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  templates: {
    potatoBody: {
      id: "potatoBody",
      tags: ["potato"],
      whatDescription:
        "A large, blank, smooth brown potato body shape for Mr. Potato Head, simple and clean with no facial features, slightly oval, cartoon style, front-facing",
      visual: {
        type: "image",
        imageWidth: 5,
        imageHeight: 6,
      },
    },
    drawer: {
      id: "drawer",
      tags: ["drawer"],
      whatDescription:
        "A wooden toy drawer or tray with a flat bottom, cartoon style, warm brown wood grain, slightly rounded edges, viewed from the front, open top",
      visual: {
        type: "image",
        imageWidth: 11,
        imageHeight: 5,
      },
    },
    leftEye: makeDraggablePiece(
      "leftEye",
      ["eye", "leftEye"],
      "A single cartoon googly eye for Mr. Potato Head, round white with black pupil, plastic toy style, left eye",
      0.8,
      0.8,
    ),
    rightEye: makeDraggablePiece(
      "rightEye",
      ["eye", "rightEye"],
      "A single cartoon googly eye for Mr. Potato Head, round white with black pupil, plastic toy style, right eye",
      0.8,
      0.8,
    ),
    nose: makeDraggablePiece(
      "nose",
      ["nose"],
      "A big orange carrot-shaped nose for Mr. Potato Head, cartoon plastic toy style, pointing forward",
      0.8,
      1.0,
    ),
    mouth: makeDraggablePiece(
      "mouth",
      ["mouth"],
      "A wide red smiling mouth with white teeth for Mr. Potato Head, plastic toy style, cartoon, happy expression",
      1.4,
      0.7,
    ),
    mustache: makeDraggablePiece(
      "mustache",
      ["mustache"],
      "A thick black handlebar mustache for Mr. Potato Head, plastic toy style, cartoon, curled ends",
      1.6,
      0.6,
    ),
    leftArm: makeDraggablePiece(
      "leftArm",
      ["arm", "leftArm"],
      "A small blue plastic left arm and hand for Mr. Potato Head, cartoon toy style, open palm, waving gesture",
      1.2,
      0.8,
    ),
    rightArm: makeDraggablePiece(
      "rightArm",
      ["arm", "rightArm"],
      "A small blue plastic right arm and hand for Mr. Potato Head, cartoon toy style, open palm, waving gesture",
      1.2,
      0.8,
    ),
    hat: makeDraggablePiece(
      "hat",
      ["hat"],
      "A small black bowler hat or derby hat for Mr. Potato Head, classic style, plastic toy, cartoon, shiny",
      1.8,
      1.0,
    ),
    ears: makeDraggablePiece(
      "ears",
      ["ears"],
      "A pair of large pink plastic ears for Mr. Potato Head, attached by a headband piece, cartoon toy style",
      2.0,
      0.8,
    ),
    resetButton: {
      id: "resetButton",
      tags: ["resetButton"],
      visual: {
        type: "rect",
        width: 2.4,
        height: 0.8,
        color: "#e74c3c",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: 2.4,
        height: 0.8,
      },
    },
    resetLabel: {
      id: "resetLabel",
      tags: ["resetLabel"],
      visual: {
        type: "text",
        text: "Reset",
        fontSize: 18,
        color: "#ffffff",
      },
    },
  },
  entities: [
    {
      id: "potatoBody",
      name: "Potato Body",
      template: "potatoBody",
      transform: { x: 0, y: 2.5, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 0,
    },
    {
      id: "drawer",
      name: "Drawer",
      template: "drawer",
      transform: { x: 0, y: -4.5, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 0,
    },

    // Row 1 (top of drawer): eyes, nose, ears, hat
    {
      id: "leftEye",
      name: "Left Eye",
      template: "leftEye",
      transform: { x: -3.5, y: -3.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "rightEye",
      name: "Right Eye",
      template: "rightEye",
      transform: { x: -2.0, y: -3.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "nose",
      name: "Nose",
      template: "nose",
      transform: { x: -0.5, y: -3.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "ears",
      name: "Ears",
      template: "ears",
      transform: { x: 1.5, y: -3.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "hat",
      name: "Hat",
      template: "hat",
      transform: { x: 3.5, y: -3.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },

    // Row 2 (bottom of drawer): mouth, mustache, arms
    {
      id: "mouth",
      name: "Mouth",
      template: "mouth",
      transform: { x: -3.0, y: -5.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "mustache",
      name: "Mustache",
      template: "mustache",
      transform: { x: -0.5, y: -5.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "leftArm",
      name: "Left Arm",
      template: "leftArm",
      transform: { x: 2.0, y: -5.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },
    {
      id: "rightArm",
      name: "Right Arm",
      template: "rightArm",
      transform: { x: 4.0, y: -5.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 2,
    },

    // Reset button at very bottom
    {
      id: "resetButton",
      name: "Reset Button",
      template: "resetButton",
      transform: { x: 0, y: -7.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 3,
    },
    {
      id: "resetLabel",
      name: "Reset Label",
      template: "resetLabel",
      transform: { x: 0, y: -7.2, angle: 0, scaleX: 1, scaleY: 1 },
      layer: 4,
    },
  ],
  rules: [
    {
      id: "reset_pieces",
      name: "Reset all pieces when reset button tapped",
      trigger: { type: "tap", target: "resetButton" },
      actions: [{ type: "run_script", export: "resetPieces" }],
    },
  ],
  script: `
var INITIAL_POSITIONS = {
  leftEye:   { x: -3.5, y: -3.2 },
  rightEye:  { x: -2.0, y: -3.2 },
  nose:      { x: -0.5, y: -3.2 },
  ears:      { x:  1.5, y: -3.2 },
  hat:       { x:  3.5, y: -3.2 },
  mouth:     { x: -3.0, y: -5.2 },
  mustache:  { x: -0.5, y: -5.2 },
  leftArm:   { x:  2.0, y: -5.2 },
  rightArm:  { x:  4.0, y: -5.2 },
};

exports.resetPieces = function(ctx) {
  console.log('[MrPotatoHead] resetPieces called, isSequenceRunning:', ctx.isSequenceRunning('reset'));
  if (ctx.isSequenceRunning('reset')) return;

  ctx.startSequence('reset', async function(world) {
    console.log('[MrPotatoHead] reset sequence started');
    var keys = Object.keys(INITIAL_POSITIONS);
    var last;
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var randX = (Math.random() - 0.5) * 8;
      var randY = (Math.random() - 0.5) * 10;
      console.log('[MrPotatoHead] animating', id, 'to', randX, randY);
      last = world.animate(id, { x: randX, y: randY }, { duration: 500, easing: 'ease-in-out' });
    }
    console.log('[MrPotatoHead] awaiting last animation');
    await last;
    console.log('[MrPotatoHead] reset sequence complete');
  });
};
`,
};

export default game;
