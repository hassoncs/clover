import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Combo Fighter",
  description: "Side-scrolling fighter where consecutive hits build combos. Reach checkpoints to save progress. Player grows with each combo!",
};

const WORLD_WIDTH = 20;
const WORLD_HEIGHT = 12;

const PLAYER_WIDTH = 0.8;
const PLAYER_HEIGHT = 1.2;
const ENEMY_WIDTH = 0.7;
const ENEMY_HEIGHT = 1.0;
const CHECKPOINT_WIDTH = 1.5;
const CHECKPOINT_HEIGHT = 0.8;
const GROUND_HEIGHT = 0.5;

const game: GameDefinition = {
  metadata: {
    id: "test-combo-fighter",
    title: "Combo Fighter",
    description: "Side-scrolling fighter where consecutive hits build combos. Reach checkpoints to save progress. Player grows with each combo!",
    instructions: "Tap enemies to punch them. Build combos with consecutive hits. Reach checkpoints to save progress. Destroy all enemies to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "follow", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  initialLives: 3,
  initialScore: 0,
  winCondition: {
    type: "destroy_all",
    tag: "enemy",
  },
  loseCondition: {
    type: "lives_zero",
  },
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: {
        type: "rect",
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        color: "#4A90E2",
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        density: 1,
        friction: 0.3,
        restitution: 0,
        linearDamping: 2,
        fixedRotation: true,
      },
      behaviors: [],
    },
    enemy: {
      id: "enemy",
      tags: ["enemy"],
      sprite: {
        type: "rect",
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        color: "#E74C3C",
      },
      physics: {
        bodyType: "dynamic",
        shape: "box",
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        density: 1,
        friction: 0.3,
        restitution: 0,
        linearDamping: 1,
        fixedRotation: true,
      },
      behaviors: [
        {
          type: "destroy_on_collision",
          withTags: ["player_punch"],
          effect: "fade",
        },
      ],
    },
    checkpoint: {
      id: "checkpoint",
      tags: ["checkpoint"],
      sprite: {
        type: "rect",
        width: CHECKPOINT_WIDTH,
        height: CHECKPOINT_HEIGHT,
        color: "#2ECC71",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: CHECKPOINT_WIDTH,
        height: CHECKPOINT_HEIGHT,
        density: 0,
        friction: 0,
        restitution: 0,
        isSensor: true,
      },
      behaviors: [],
    },
    ground: {
      id: "ground",
      tags: ["ground"],
      sprite: {
        type: "rect",
        width: WORLD_WIDTH,
        height: GROUND_HEIGHT,
        color: "#555555",
      },
      physics: {
        bodyType: "static",
        shape: "box",
        width: WORLD_WIDTH,
        height: GROUND_HEIGHT,
        density: 0,
        friction: 0.5,
        restitution: 0,
      },
      behaviors: [],
    },
  },
  entities: [
    {
      id: "ground",
      name: "Ground",
      template: "ground",
      transform: {
        x: 0,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "player",
      name: "Player",
      template: "player",
      transform: {
        x: 2 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + PLAYER_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "enemy-1",
      name: "Enemy 1",
      template: "enemy",
      transform: {
        x: 6 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + ENEMY_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "enemy-2",
      name: "Enemy 2",
      template: "enemy",
      transform: {
        x: 10 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + ENEMY_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "enemy-3",
      name: "Enemy 3",
      template: "enemy",
      transform: {
        x: 14 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + ENEMY_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "checkpoint-1",
      name: "Checkpoint 1",
      template: "checkpoint",
      transform: {
        x: 8 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + CHECKPOINT_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "checkpoint-2",
      name: "Checkpoint 2",
      template: "checkpoint",
      transform: {
        x: 16 - WORLD_WIDTH / 2,
        y: -(WORLD_HEIGHT / 2) + GROUND_HEIGHT + CHECKPOINT_HEIGHT / 2,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
  ],
  rules: [
    {
      id: "player_punch_on_tap",
      name: "Player punches when tapped",
      trigger: { type: "tap" },
      actions: [
        {
          type: "apply_impulse",
          target: { type: "by_id", entityId: "player" },
          x: 8,
          y: 0,
        },
        {
          type: "spawn",
          template: "enemy",
          position: { type: "fixed", x: 5 - WORLD_WIDTH / 2, y: -(WORLD_HEIGHT / 2 - 5) },
        },
      ],
    },
    {
      id: "combo_on_enemy_hit",
      name: "Increment combo when player hits enemy",
      trigger: { type: "collision", entityATag: "player", entityBTag: "enemy" },
      actions: [
        {
          type: "combo_increment",
          comboId: "main-combo",
        },
        {
          type: "score",
          operation: "add",
          value: 50,
        },
      ],
    },
    {
      id: "combo_reset_on_damage",
      name: "Reset combo when player takes damage",
      trigger: { type: "collision", entityATag: "player", entityBTag: "hazard" },
      actions: [
        {
          type: "combo_reset",
          comboId: "main-combo",
        },
        {
          type: "lives",
          operation: "subtract",
          value: 1,
        },
      ],
    },
    {
      id: "checkpoint_activate",
      name: "Activate checkpoint when player touches it",
      trigger: {
        type: "collision",
        entityATag: "player",
        entityBTag: "checkpoint",
      },
      actions: [
        {
          type: "checkpoint_activate",
          checkpointId: "current",
        },
        {
          type: "checkpoint_save",
        },
        {
          type: "score",
          operation: "add",
          value: 100,
        },
      ],
    },
    {
      id: "player_grow_on_combo",
      name: "Player grows with combo count",
      trigger: { type: "timer", time: 0.1, repeat: true },
      conditions: [
        {
          type: "expression",
          expr: "comboCount('main-combo') > 0",
        },
      ],
      actions: [
        {
          type: "set_entity_size",
          target: { type: "by_tag", tag: "player" },
          scale: 1.1,
        },
      ],
    },
    {
      id: "move_player_left",
      name: "Move player left with left button",
      trigger: { type: "button", button: "left", state: "held" },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "player" },
          direction: "left",
          speed: 8,
        },
      ],
    },
    {
      id: "move_player_right",
      name: "Move player right with right button",
      trigger: { type: "button", button: "right", state: "held" },
      actions: [
        {
          type: "move",
          target: { type: "by_tag", tag: "player" },
          direction: "right",
          speed: 8,
        },
      ],
    },
  ],
};

export default game;
