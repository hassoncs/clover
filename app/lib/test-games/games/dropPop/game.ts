import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Drop & Pop",
  description: "Drop fruits and merge matching pairs into bigger fruits! Inspired by Suika Game.",
  status: "archived",
};

const WORLD_WIDTH = 10;
const WORLD_HEIGHT = 14;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const CONTAINER_LEFT = 1.5;
const CONTAINER_RIGHT = 8.5;
const CONTAINER_BOTTOM = 12.5;
const WALL_THICKNESS = 0.3;
const DANGER_LINE_Y = 2.5;

const FRUIT_PROGRESSION = [
  { id: "cherry", color: "#E53935", radius: 0.3, points: 10 },
  { id: "grape", color: "#7B1FA2", radius: 0.4, points: 20 },
  { id: "orange", color: "#FF9800", radius: 0.5, points: 40 },
  { id: "apple", color: "#4CAF50", radius: 0.6, points: 80 },
  { id: "pear", color: "#8BC34A", radius: 0.7, points: 160 },
  { id: "peach", color: "#FFAB91", radius: 0.85, points: 320 },
];

const AIM_Y = 1.5;

function generateWalls(): GameEntity[] {
  return [
    {
      id: "wall-left",
      name: "Left Wall",
      template: "wall",
      tags: ["wall"],
      transform: {
        x: cx(CONTAINER_LEFT - WALL_THICKNESS / 2),
        y: cy((CONTAINER_BOTTOM + DANGER_LINE_Y) / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      template: "wall",
      tags: ["wall"],
      transform: {
        x: cx(CONTAINER_RIGHT + WALL_THICKNESS / 2),
        y: cy((CONTAINER_BOTTOM + DANGER_LINE_Y) / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wall-bottom",
      name: "Bottom Wall",
      template: "floor",
      tags: ["wall"],
      transform: {
        x: cx((CONTAINER_LEFT + CONTAINER_RIGHT) / 2),
        y: cy(CONTAINER_BOTTOM + WALL_THICKNESS / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
  ];
}

function generateDangerLine(): GameEntity {
  return {
    id: "danger-line",
    name: "Danger Line",
    template: "dangerLine",
    tags: ["danger"],
    transform: {
      x: cx((CONTAINER_LEFT + CONTAINER_RIGHT) / 2),
      y: cy(DANGER_LINE_Y),
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  };
}

function generateAimIndicator(): GameEntity {
  return {
    id: "aim-indicator",
    name: "Aim Indicator",
    template: "aimIndicator",
    tags: ["aim"],
    transform: {
      x: cx((CONTAINER_LEFT + CONTAINER_RIGHT) / 2),
      y: cy(AIM_Y),
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  };
}

function generateCurrentFruit(): GameEntity {
  return {
    id: "current-fruit",
    name: "Current Fruit",
    template: "fruit0",
    tags: ["current", "fruit", "fruit0"],
    transform: {
      x: cx((CONTAINER_LEFT + CONTAINER_RIGHT) / 2),
      y: cy(AIM_Y),
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  };
}

const walls = generateWalls();
const dangerLine = generateDangerLine();
const aimIndicator = generateAimIndicator();
const currentFruit = generateCurrentFruit();

const game: GameDefinition = {
  metadata: {
    id: "test-drop-pop",
    title: "Drop & Pop",
    description: "Drop fruits and merge matching pairs into bigger fruits! Inspired by Suika Game.",
    instructions:
      "Move left/right to aim, tap to drop. When two same fruits touch, they merge into a bigger fruit. Don't let fruits stack above the line!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 9.8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    currentFruitType: 0,
    nextFruitType: 1,
    mergeCount: 0,
    aimX: (CONTAINER_LEFT + CONTAINER_RIGHT) / 2,
  },
  ui: {
    showScore: true,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: "mergeCount", label: "Merges", color: "#4CAF50" },
    ],
  },
  winCondition: {
    type: "score",
    score: 5000,
  },
  loseCondition: {
    type: "lives_zero",
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "aiming",
      states: [
        {
          id: "aiming",
          onEnter: [
            { type: "spawn", template: "fruit0", position: { type: "fixed", x: cx((CONTAINER_LEFT + CONTAINER_RIGHT) / 2), y: cy(AIM_Y) } },
          ],
        },
        {
          id: "dropping",
        },
        {
          id: "settling",
          timeout: 1.0,
          timeoutTransition: "aiming",
          onEnter: [
            { type: "event", eventName: "check_merges" },
          ],
        },
      ],
      transitions: [
        {
          id: "drop",
          from: "aiming",
          to: "dropping",
          trigger: { type: "event", eventName: "fruit_dropped" },
        },
        {
          id: "landed",
          from: "dropping",
          to: "settling",
          trigger: { type: "event", eventName: "fruit_landed" },
        },
      ],
    },
  ],
  templates: {
    wall: {
      id: "wall",
      tags: ["wall"],
      sprite: {
        type: "rect",
        width: WALL_THICKNESS,
        height: CONTAINER_BOTTOM - DANGER_LINE_Y,
        color: "#37474F",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WALL_THICKNESS,
        height: CONTAINER_BOTTOM - DANGER_LINE_Y,
        density: 0,
        friction: 0.3,
        restitution: 0.2,
      },
    },
    floor: {
      id: "floor",
      tags: ["wall"],
      sprite: {
        type: "rect",
        width: CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2,
        height: WALL_THICKNESS,
        color: "#37474F",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2,
        height: WALL_THICKNESS,
        density: 0,
        friction: 0.5,
        restitution: 0.1,
      },
    },
    dangerLine: {
      id: "dangerLine",
      tags: ["danger"],
      sprite: {
        type: "rect",
        width: CONTAINER_RIGHT - CONTAINER_LEFT,
        height: 0.05,
        color: "#FF5252",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CONTAINER_RIGHT - CONTAINER_LEFT,
        height: 0.05,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    aimIndicator: {
      id: "aimIndicator",
      tags: ["aim"],
      sprite: {
        type: "rect",
        width: 0.1,
        height: CONTAINER_BOTTOM - AIM_Y - 0.5,
        color: "#FFFFFF22",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: 0.1,
        height: CONTAINER_BOTTOM - AIM_Y - 0.5,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    fruit0: {
      id: "fruit0",
      tags: ["fruit", "fruit0"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[0].radius,
        color: FRUIT_PROGRESSION[0].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[0].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit0"], points: FRUIT_PROGRESSION[0].points },
      ],
    },
    fruit1: {
      id: "fruit1",
      tags: ["fruit", "fruit1"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[1].radius,
        color: FRUIT_PROGRESSION[1].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[1].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit1"], points: FRUIT_PROGRESSION[1].points },
      ],
    },
    fruit2: {
      id: "fruit2",
      tags: ["fruit", "fruit2"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[2].radius,
        color: FRUIT_PROGRESSION[2].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[2].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit2"], points: FRUIT_PROGRESSION[2].points },
      ],
    },
    fruit3: {
      id: "fruit3",
      tags: ["fruit", "fruit3"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[3].radius,
        color: FRUIT_PROGRESSION[3].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[3].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit3"], points: FRUIT_PROGRESSION[3].points },
      ],
    },
    fruit4: {
      id: "fruit4",
      tags: ["fruit", "fruit4"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[4].radius,
        color: FRUIT_PROGRESSION[4].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[4].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit4"], points: FRUIT_PROGRESSION[4].points },
      ],
    },
    fruit5: {
      id: "fruit5",
      tags: ["fruit", "fruit5"],
      sprite: {
        type: "circle",
        radius: FRUIT_PROGRESSION[5].radius,
        color: FRUIT_PROGRESSION[5].color,
      },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: FRUIT_PROGRESSION[5].radius,
        density: 1,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        { type: "score_on_collision", withTags: ["fruit5"], points: FRUIT_PROGRESSION[5].points },
      ],
    },
  },
  entities: [...walls, dangerLine, aimIndicator, currentFruit],
  rules: [
    {
      id: "move_aim_left",
      name: "Move aim left on drag",
      trigger: { type: "drag", phase: "move" },
      actions: [
        { type: "move", target: { type: "by_tag", tag: "current" }, direction: "toward_touch_x", speed: 15 },
        { type: "move", target: { type: "by_tag", tag: "aim" }, direction: "toward_touch_x", speed: 15 },
      ],
    },
    {
      id: "drop_fruit",
      name: "Drop fruit on tap",
      trigger: { type: "tap" },
      actions: [
        { type: "event", eventName: "fruit_dropped" },
      ],
    },
    {
      id: "enable_physics_on_drop",
      name: "Enable physics when fruit is dropped",
      trigger: { type: "event", eventName: "fruit_dropped" },
      actions: [
        { type: "set_velocity", target: { type: "by_tag", tag: "current" }, x: 0, y: 5 },
      ],
    },
    {
      id: "fruit_landed",
      name: "Fruit landed on collision with wall or other fruit",
      trigger: { type: "collision", entityATag: "current", entityBTag: "wall" },
      actions: [
        { type: "event", eventName: "fruit_landed" },
      ],
    },
    {
      id: "fruit_landed_on_fruit",
      name: "Fruit landed on another fruit",
      trigger: { type: "collision", entityATag: "current", entityBTag: "fruit" },
      actions: [
        { type: "event", eventName: "fruit_landed" },
      ],
    },
    {
      id: "merge_fruit0",
      name: "Merge two cherries into grape",
      trigger: { type: "collision", entityATag: "fruit0", entityBTag: "fruit0" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "spawn", template: "fruit1", position: { type: "at_collision" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: FRUIT_PROGRESSION[1].points },
        { type: "camera_shake", intensity: 0.05, duration: 0.1 },
      ],
    },
    {
      id: "merge_fruit1",
      name: "Merge two grapes into orange",
      trigger: { type: "collision", entityATag: "fruit1", entityBTag: "fruit1" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "spawn", template: "fruit2", position: { type: "at_collision" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: FRUIT_PROGRESSION[2].points },
        { type: "camera_shake", intensity: 0.06, duration: 0.12 },
      ],
    },
    {
      id: "merge_fruit2",
      name: "Merge two oranges into apple",
      trigger: { type: "collision", entityATag: "fruit2", entityBTag: "fruit2" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "spawn", template: "fruit3", position: { type: "at_collision" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: FRUIT_PROGRESSION[3].points },
        { type: "camera_shake", intensity: 0.07, duration: 0.14 },
      ],
    },
    {
      id: "merge_fruit3",
      name: "Merge two apples into pear",
      trigger: { type: "collision", entityATag: "fruit3", entityBTag: "fruit3" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "spawn", template: "fruit4", position: { type: "at_collision" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: FRUIT_PROGRESSION[4].points },
        { type: "camera_shake", intensity: 0.08, duration: 0.16 },
      ],
    },
    {
      id: "merge_fruit4",
      name: "Merge two pears into peach",
      trigger: { type: "collision", entityATag: "fruit4", entityBTag: "fruit4" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "spawn", template: "fruit5", position: { type: "at_collision" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: FRUIT_PROGRESSION[5].points },
        { type: "camera_shake", intensity: 0.1, duration: 0.2 },
      ],
    },
    {
      id: "merge_fruit5",
      name: "Merge two peaches - max fruit, just score",
      trigger: { type: "collision", entityATag: "fruit5", entityBTag: "fruit5" },
      actions: [
        { type: "destroy", target: { type: "collision_entities" } },
        { type: "set_variable", name: "mergeCount", operation: "add", value: 1 },
        { type: "score", operation: "add", value: 1000 },
        { type: "camera_shake", intensity: 0.15, duration: 0.3 },
      ],
    },
    {
      id: "check_game_over",
      name: "Check if fruit is above danger line",
      trigger: { type: "collision", entityATag: "fruit", entityBTag: "danger" },
      actions: [
        { type: "game_state", state: "lose", delay: 1.0 },
      ],
    },
  ],
};

export default game;
