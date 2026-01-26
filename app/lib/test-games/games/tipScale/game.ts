import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Tip the Scale",
  description: "Place weights on a seesaw to achieve perfect balance",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 10;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const BEAM_WIDTH = 8;
const BEAM_HEIGHT = 0.3;
const PIVOT_SIZE = 0.6;
const BEAM_Y = 6;

const WEIGHT_RADIUS = 0.4;
const WEIGHT_COLORS = ["#4CAF50", "#2196F3", "#FF9800"];
const WEIGHT_MASSES = [1, 2, 3];

const CHOICE_Y = 1.5;
const CHOICE_SPACING = 2;
const CHOICE_START_X = WORLD_WIDTH / 2 - CHOICE_SPACING;

const MAX_WEIGHTS = 4;
const BALANCE_THRESHOLD = 0.3;

function createWeightChoiceEntities(): GameEntity[] {
  const entities: GameEntity[] = [];

  for (let i = 0; i < 3; i++) {
    entities.push({
      id: `weight-choice-${i}`,
      name: `Weight Choice ${WEIGHT_MASSES[i]}`,
      template: `weightChoice${i}`,
      tags: ["weight-choice", `mass-${WEIGHT_MASSES[i]}`],
      transform: {
        x: cx(CHOICE_START_X + i * CHOICE_SPACING),
        y: cy(CHOICE_Y),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    });

      entities.push({
        id: `weight-label-${i}`,
        name: `Weight Label ${WEIGHT_MASSES[i]}`,
        template: "weightLabel",
        tags: ["weight-label"],
        transform: {
          x: cx(CHOICE_START_X + i * CHOICE_SPACING),
          y: cy(CHOICE_Y + 0.8),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
  }

  return entities;
}

function createBeamEntities(): GameEntity[] {
  return [
    {
      id: "pivot",
      name: "Pivot",
      template: "pivot",
      tags: ["pivot"],
      transform: {
        x: cx(WORLD_WIDTH / 2),
        y: cy(BEAM_Y + PIVOT_SIZE / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "beam",
      name: "Beam",
      template: "beam",
      tags: ["beam"],
      transform: {
        x: cx(WORLD_WIDTH / 2),
        y: cy(BEAM_Y - BEAM_HEIGHT / 2),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "beam-sensor",
      name: "Beam Sensor",
      template: "beamSensor",
      tags: ["beam-sensor"],
      transform: {
        x: cx(WORLD_WIDTH / 2),
        y: cy(BEAM_Y - BEAM_HEIGHT / 2 - 0.3),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
  ];
}

const weightChoiceEntities = createWeightChoiceEntities();
const beamEntities = createBeamEntities();

const game: GameDefinition = {
  metadata: {
    id: "test-tip-scale",
    title: "Tip the Scale",
    description: "Place weights on a seesaw to achieve perfect balance",
    instructions:
      "Tap a weight to select it, then tap a position on the beam to place it. Balance the beam to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  variables: {
    selectedMass: 0,
    selectedWeightId: "",
    weightsPlaced: 0,
    leftTorque: 0,
    rightTorque: 0,
    beamAngle: 0,
  },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a237e",
    variableDisplays: [
      { name: "weightsPlaced", label: "Placed", color: "#4CAF50" },
    ],
  },
  stateMachines: [
    {
      id: "gameFlow",
      initialState: "choosing",
      states: [
        { id: "choosing" },
        { id: "placing" },
        {
          id: "settling",
          timeout: 1.5,
          timeoutTransition: "checking",
        },
        {
          id: "checking",
          timeout: 0.2,
          timeoutTransition: "choosing",
          onEnter: [{ type: "event", eventName: "check_balance" }],
        },
      ],
      transitions: [
        {
          id: "select",
          from: "choosing",
          to: "placing",
          trigger: { type: "event", eventName: "weight_selected" },
        },
        {
          id: "place",
          from: "placing",
          to: "settling",
          trigger: { type: "event", eventName: "weight_placed" },
        },
        {
          id: "cancel",
          from: "placing",
          to: "choosing",
          trigger: { type: "event", eventName: "selection_cancelled" },
        },
      ],
    },
  ],
  winCondition: {
    type: "custom",
  },
  templates: {
    pivot: {
      id: "pivot",
      tags: ["pivot"],
      sprite: {
        type: "polygon",
        vertices: [
          { x: 0, y: -PIVOT_SIZE / 2 },
          { x: -PIVOT_SIZE / 2, y: PIVOT_SIZE / 2 },
          { x: PIVOT_SIZE / 2, y: PIVOT_SIZE / 2 },
        ],
        color: "#546E7A",
      },
      physics: {
        bodyType: "static",
        shape: "polygon",
        vertices: [
          { x: 0, y: -PIVOT_SIZE / 2 },
          { x: -PIVOT_SIZE / 2, y: PIVOT_SIZE / 2 },
          { x: PIVOT_SIZE / 2, y: PIVOT_SIZE / 2 },
        ],
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
    },
    beam: {
      id: "beam",
      tags: ["beam"],
      sprite: {
        type: "rect",
        width: BEAM_WIDTH,
        height: BEAM_HEIGHT,
        color: "#8D6E63",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: BEAM_WIDTH,
        height: BEAM_HEIGHT,
        density: 0,
        friction: 0.8,
        restitution: 0,
      },
    },
    beamSensor: {
      id: "beamSensor",
      tags: ["beam-sensor"],
      sprite: {
        type: "rect",
        width: BEAM_WIDTH,
        height: 0.6,
        color: "#00000022",
      },
      physics: {
        bodyType: "kinematic",
        shape: "box",
        width: BEAM_WIDTH,
        height: 0.6,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    weightChoice0: {
      id: "weightChoice0",
      tags: ["weight-choice", "mass-1"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS,
        color: WEIGHT_COLORS[0],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    weightChoice1: {
      id: "weightChoice1",
      tags: ["weight-choice", "mass-2"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS * 1.3,
        color: WEIGHT_COLORS[1],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS * 1.3,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    weightChoice2: {
      id: "weightChoice2",
      tags: ["weight-choice", "mass-3"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS * 1.6,
        color: WEIGHT_COLORS[2],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS * 1.6,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
    placedWeight0: {
      id: "placedWeight0",
      tags: ["placed-weight", "mass-1"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS,
        color: WEIGHT_COLORS[0],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS,
        density: 1,
        friction: 0.5,
        restitution: 0,
      },
    },
    placedWeight1: {
      id: "placedWeight1",
      tags: ["placed-weight", "mass-2"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS * 1.3,
        color: WEIGHT_COLORS[1],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS * 1.3,
        density: 2,
        friction: 0.5,
        restitution: 0,
      },
    },
    placedWeight2: {
      id: "placedWeight2",
      tags: ["placed-weight", "mass-3"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS * 1.6,
        color: WEIGHT_COLORS[2],
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS * 1.6,
        density: 3,
        friction: 0.5,
        restitution: 0,
      },
    },
    weightLabel: {
      id: "weightLabel",
      tags: ["weight-label"],
      sprite: {
        type: "rect",
        width: 0.5,
        height: 0.5,
        color: "#00000000",
      },
    },
    selectionIndicator: {
      id: "selectionIndicator",
      tags: ["selection-indicator"],
      sprite: {
        type: "circle",
        radius: WEIGHT_RADIUS * 2,
        color: "#FFFFFF33",
      },
      physics: {
        bodyType: "kinematic",
        shape: "circle",
        radius: WEIGHT_RADIUS * 2,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
    },
  },
  entities: [...weightChoiceEntities, ...beamEntities],
  rules: [
    {
      id: "tap_weight_choice",
      name: "Select a weight when in choosing state",
      trigger: { type: "tap", target: "weight-choice" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'choosing')" },
      ],
      actions: [{ type: "event", eventName: "weight_selected" }],
    },
    {
      id: "tap_beam_to_place",
      name: "Place weight on beam when in placing state",
      trigger: { type: "tap", target: "beam-sensor" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'placing')" },
        {
          type: "expression",
          expr: `getVar('weightsPlaced') < ${MAX_WEIGHTS}`,
        },
      ],
      actions: [
        { type: "set_variable", name: "weightsPlaced", operation: "add", value: 1 },
        { type: "event", eventName: "weight_placed" },
      ],
    },
    {
      id: "cancel_selection",
      name: "Cancel selection when tapping elsewhere",
      trigger: { type: "tap" },
      conditions: [
        { type: "expression", expr: "stateIs('gameFlow', 'placing')" },
      ],
      actions: [{ type: "event", eventName: "selection_cancelled" }],
    },
    {
      id: "check_balance_win",
      name: "Check if beam is balanced",
      trigger: { type: "event", eventName: "check_balance" },
      conditions: [
        {
          type: "expression",
          expr: `Math.abs(getVar('leftTorque') - getVar('rightTorque')) < ${BALANCE_THRESHOLD}`,
        },
        { type: "expression", expr: "getVar('weightsPlaced') >= 2" },
      ],
      actions: [{ type: "game_state", state: "win" }],
    },
    {
      id: "check_out_of_weights",
      name: "Check if out of weights without balance",
      trigger: { type: "event", eventName: "check_balance" },
      conditions: [
        {
          type: "expression",
          expr: `getVar('weightsPlaced') >= ${MAX_WEIGHTS}`,
        },
        {
          type: "expression",
          expr: `Math.abs(getVar('leftTorque') - getVar('rightTorque')) >= ${BALANCE_THRESHOLD}`,
        },
      ],
      actions: [{ type: "game_state", state: "lose" }],
    },
  ],
};

export default game;
