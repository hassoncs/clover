import type { GameDefinition } from "@clover/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "Bumper Arena",
  description: "Top-down arena with no gravity - tests kinematic bodies and collisions",
};

const game: GameDefinition = {
  metadata: {
    id: "test-bumper-arena",
    title: "Bumper Arena",
    description: "Top-down arena with no gravity - tests kinematic bodies and collisions",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: 14, height: 14 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showScore: false,
    showLives: false,
    showTimer: false,
    backgroundColor: "#1a1a2e",
  },
  templates: {
    playerBot: {
      id: "playerBot",
      sprite: { type: "circle", radius: 0.6, color: "#4ECDC4" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.6,
        density: 1,
        friction: 0.3,
        restitution: 0.8,
      },
    },
    enemyBot: {
      id: "enemyBot",
      sprite: { type: "circle", radius: 0.5, color: "#e74c3c" },
      physics: {
        bodyType: "dynamic",
        shape: "circle",
        radius: 0.5,
        density: 1,
        friction: 0.3,
        restitution: 0.8,
      },
    },
    bumper: {
      id: "bumper",
      sprite: { type: "circle", radius: 0.7, color: "#9b59b6" },
      physics: {
        bodyType: "static",
        shape: "circle",
        radius: 0.7,
        density: 0,
        friction: 0,
        restitution: 1.5,
      },
    },
  },
  entities: [
    {
      id: "arena-floor",
      name: "Arena Floor",
      transform: { x: 7, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "circle", radius: 5.5, color: "#2d3436" },
      physics: { bodyType: "static", shape: "circle", radius: 5.5, density: 0, friction: 0.5, restitution: 0 },
    },
    {
      id: "wall-top",
      name: "Top Wall",
      transform: { x: 7, y: 0.2, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 14, height: 0.4, color: "#4B5563" },
      physics: { bodyType: "static", shape: "box", width: 14, height: 0.4, density: 0, friction: 0, restitution: 0.8 },
    },
    {
      id: "wall-bottom",
      name: "Bottom Wall",
      transform: { x: 7, y: 13.8, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 14, height: 0.4, color: "#4B5563" },
      physics: { bodyType: "static", shape: "box", width: 14, height: 0.4, density: 0, friction: 0, restitution: 0.8 },
    },
    {
      id: "wall-left",
      name: "Left Wall",
      transform: { x: 0.2, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.4, height: 14, color: "#4B5563" },
      physics: { bodyType: "static", shape: "box", width: 0.4, height: 14, density: 0, friction: 0, restitution: 0.8 },
    },
    {
      id: "wall-right",
      name: "Right Wall",
      transform: { x: 13.8, y: 7, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 0.4, height: 14, color: "#4B5563" },
      physics: { bodyType: "static", shape: "box", width: 0.4, height: 14, density: 0, friction: 0, restitution: 0.8 },
    },
    { id: "bumper-1", name: "Bumper 1", template: "bumper", transform: { x: 4, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-2", name: "Bumper 2", template: "bumper", transform: { x: 10, y: 4, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-3", name: "Bumper 3", template: "bumper", transform: { x: 7, y: 7, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-4", name: "Bumper 4", template: "bumper", transform: { x: 4, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "bumper-5", name: "Bumper 5", template: "bumper", transform: { x: 10, y: 10, angle: 0, scaleX: 1, scaleY: 1 } },
    {
      id: "spinner",
      name: "Spinning Hazard",
      transform: { x: 7, y: 3.5, angle: 0, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 3, height: 0.3, color: "#F59E0B" },
      physics: { bodyType: "kinematic", shape: "box", width: 3, height: 0.3, density: 0, friction: 0, restitution: 1.2 },
    },
    {
      id: "spinner-2",
      name: "Spinning Hazard 2",
      transform: { x: 7, y: 10.5, angle: Math.PI / 2, scaleX: 1, scaleY: 1 },
      sprite: { type: "rect", width: 3, height: 0.3, color: "#F59E0B" },
      physics: { bodyType: "kinematic", shape: "box", width: 3, height: 0.3, density: 0, friction: 0, restitution: 1.2 },
    },
    { id: "player", name: "Player", template: "playerBot", transform: { x: 7, y: 11, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-1", name: "Enemy 1", template: "enemyBot", transform: { x: 3, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-2", name: "Enemy 2", template: "enemyBot", transform: { x: 11, y: 6, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-3", name: "Enemy 3", template: "enemyBot", transform: { x: 7, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
};

export default game;
