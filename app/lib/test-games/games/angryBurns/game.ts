import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";
import { createLauncherRules, createLauncherEntity } from "@slopcade/shared/mechanics";

export const metadata: TestGameMeta = {
  title: "Angry Burns",
  description: "Pull back the cannon to launch cannonballs at structures and destroy all the targets to win!",
  status: "active",
};

const game: GameDefinition = {
  metadata: {
    id: "angry-burns",
    title: "Angry Burns",
    description: "Pull back the cannon to launch cannonballs at structures and destroy all the targets to win!",
    version: "1.0.0",
  },
  world: {
    gravity: {
      x: 0,
      y: 9.8,
    },
    pixelsPerMeter: 50,
    bounds: {
      width: 20,
      height: 12,
    },
  },
  camera: {
    type: "fixed",
    zoom: 1,
  },
  ui: {
    showScore: true,
    showLives: true,
    scorePosition: "top-right",
    backgroundColor: "#87CEEB",
  },
  templates: {
    // Cannonball projectile - heavy and bouncy
    projectile: {
      id: "projectile",
      visual: {
        type: "circle",
        radius: 0.3,
        color: "#2C2C2C",
      },
      physics: {
        bodyType: "dynamic",
        density: 2.0,
        ccd: true,
      },
      collider: {
        shape: "circle",
        radius: 0.3,
        friction: 0.5,
        restitution: 0.6,
      },
      tags: ["projectile"],
    },
    // Wood block - lighter, takes 2 hits
    woodBlock: {
      id: "woodBlock",
      visual: {
        type: "rect",
        width: 0.8,
        height: 0.4,
        color: "#8B4513",
      },
      physics: {
        bodyType: "dynamic",
        density: 0.5,
      },
      collider: {
        shape: "box",
        width: 0.8,
        height: 0.4,
        friction: 0.6,
        restitution: 0.1,
      },
      behaviors: [
        {
          type: "health",
          maxHealth: 50,
          damageFromTags: ["projectile"],
          damagePerHit: 25,
          destroyOnDeath: true,
        },
      ],
      tags: ["block", "destructible"],
    },
    // Stone block - heavier, takes 3 hits
    stoneBlock: {
      id: "stoneBlock",
      visual: {
        type: "rect",
        width: 0.8,
        height: 0.4,
        color: "#696969",
      },
      physics: {
        bodyType: "dynamic",
        density: 0.8,
      },
      collider: {
        shape: "box",
        width: 0.8,
        height: 0.4,
        friction: 0.7,
        restitution: 0.05,
      },
      behaviors: [
        {
          type: "health",
          maxHealth: 75,
          damageFromTags: ["projectile"],
          damagePerHit: 25,
          destroyOnDeath: true,
        },
      ],
      tags: ["block", "destructible"],
    },
    // Glass block - fragile, takes 1 hit
    glassBlock: {
      id: "glassBlock",
      visual: {
        type: "rect",
        width: 0.8,
        height: 0.4,
        color: "#ADD8E6",
      },
      physics: {
        bodyType: "dynamic",
        density: 0.3,
      },
      collider: {
        shape: "box",
        width: 0.8,
        height: 0.4,
        friction: 0.3,
        restitution: 0.2,
      },
      behaviors: [
        {
          type: "health",
          maxHealth: 25,
          damageFromTags: ["projectile"],
          damagePerHit: 25,
          destroyOnDeath: true,
        },
      ],
      tags: ["block", "destructible"],
    },
    // Target (pig) - main objective, 2 hits, awards points
    target: {
      id: "target",
      visual: {
        type: "circle",
        radius: 0.35,
        color: "#90EE90",
      },
      physics: {
        bodyType: "dynamic",
        density: 0.4,
      },
      collider: {
        shape: "circle",
        radius: 0.35,
        friction: 0.5,
        restitution: 0.2,
      },
      behaviors: [
        {
          type: "health",
          maxHealth: 50,
          damageFromTags: ["projectile"],
          damagePerHit: 25,
          destroyOnDeath: true,
        },
        {
          type: "score_on_destroy",
          points: 500,
        },
      ],
      tags: ["target", "destructible"],
    },
    // Ground - static platform
    ground: {
      id: "ground",
      visual: {
        type: "rect",
        width: 20,
        height: 1,
        color: "#228B22",
      },
      physics: {
        bodyType: "static",
        density: 1,
      },
      collider: {
        shape: "box",
        width: 20,
        height: 1,
        friction: 0.8,
        restitution: 0.1,
      },
      tags: ["ground"],
    },
    // Wall - right side boundary
    wall: {
      id: "wall",
      visual: {
        type: "rect",
        width: 0.5,
        height: 12,
        color: "#4A5568",
      },
      physics: {
        bodyType: "static",
        density: 1,
      },
      collider: {
        shape: "box",
        width: 0.5,
        height: 12,
        friction: 0.5,
        restitution: 0.3,
      },
      tags: ["wall"],
    },
  },
  entities: [
    // Launcher cannon
    createLauncherEntity({
      id: "cannon",
      x: 3,
      y: 9,
      radius: 0.6,
      color: "#8B0000",
    }),
    // Ground platform
    {
      id: "ground",
      name: "ground",
      template: "ground",
      transform: {
        x: 10,
        y: 11.5,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    // Right wall
    {
      id: "wall-right",
      name: "wall-right",
      template: "wall",
      transform: {
        x: 19.75,
        y: 6,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    // Tower structure (right side of screen)
    // Base layer - stone blocks
    {
      id: "stone-1",
      name: "stone-1",
      template: "stoneBlock",
      transform: {
        x: 14,
        y: 10.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "stone-2",
      name: "stone-2",
      template: "stoneBlock",
      transform: {
        x: 15.5,
        y: 10.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "stone-3",
      name: "stone-3",
      template: "stoneBlock",
      transform: {
        x: 17,
        y: 10.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    // Second layer - wood blocks
    {
      id: "wood-1",
      name: "wood-1",
      template: "woodBlock",
      transform: {
        x: 14,
        y: 10.3,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wood-2",
      name: "wood-2",
      template: "woodBlock",
      transform: {
        x: 15.5,
        y: 10.3,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "wood-3",
      name: "wood-3",
      template: "woodBlock",
      transform: {
        x: 17,
        y: 10.3,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    // Top platform - glass blocks
    {
      id: "glass-1",
      name: "glass-1",
      template: "glassBlock",
      transform: {
        x: 14,
        y: 9.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "glass-2",
      name: "glass-2",
      template: "glassBlock",
      transform: {
        x: 15.5,
        y: 9.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "glass-3",
      name: "glass-3",
      template: "glassBlock",
      transform: {
        x: 17,
        y: 9.8,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    // Targets (pigs) - at different heights
    {
      id: "target-1",
      name: "target-1",
      template: "target",
      transform: {
        x: 15.5,
        y: 9.3,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "target-2",
      name: "target-2",
      template: "target",
      transform: {
        x: 14,
        y: 10.1,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
    {
      id: "target-3",
      name: "target-3",
      template: "target",
      transform: {
        x: 17,
        y: 10.1,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      },
    },
  ],
  rules: [
    // Launcher rules - pull back cannon to fire
    ...createLauncherRules({
      launcherEntityId: "cannon",
      projectileTemplate: "projectile",
      projectileSpawnPosition: { x: 3, y: 8.4 },
      maxPullDistance: 4,
      forceMultiplier: 20,
      minPullThreshold: 0.3,
      consumeLives: true,
      livesPerShot: 1,
      gameOverOnLivesZero: true,
      cooldown: 0.5,
      oneShotAtATime: true,
      projectileTag: "projectile",
    }),
  ],
  winCondition: {
    type: "destroy_all",
    tag: "target",
  },
  loseCondition: {
    type: "lives_zero",
  },
  initialLives: 5,
  initialScore: 0,
};

export default game;
