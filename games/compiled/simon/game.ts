import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Simon",
  description: "Memory game - repeat the pattern of colored buttons",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 12;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const BUTTON_SIZE = 3.5;
const BUTTON_GAP = 0.5;
const OFFSET = (BUTTON_SIZE + BUTTON_GAP) / 2;

const game: GameDefinition = {
  metadata: {
    id: "simon",
    title: "Simon",
    description: "Watch the pattern, then repeat it by tapping the colored buttons in order!",
    instructions: "Watch the buttons light up, then tap them in the same order. Each round adds one more to the pattern!",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    whatDescription: "a dark gradient background with subtle glow effects",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#1a1a2e",
    variableDisplays: [
      { name: 'round', label: 'Round' },
      { name: 'score', label: 'Score' },
    ],
  },
  variables: {
    round: 0,
    score: 0,
    playerIndex: 0,
    isPlaying: 0,
    isAnimating: 0,
  },
  constants: {
    RED: 0,
    GREEN: 1,
    BLUE: 2,
    YELLOW: 3,
    FLASH_DURATION: 0.5,
    PATTERN_DELAY: 0.3,
  },
  script: `
// Game state
let pattern = [];
let playerIndex = 0;
let isPlaying = false;
let isAnimating = false;
let flashTimer = 0;
let currentFlashButton = null;
let patternIndex = 0;
let delayTimer = 0;

const COLORS = ['red', 'green', 'blue', 'yellow'];
const BUTTON_IDS = ['button-red', 'button-green', 'button-blue', 'button-yellow'];

exports.onStart = function(ctx) {
  pattern = [];
  playerIndex = 0;
  isPlaying = false;
  isAnimating = false;
  ctx.setVariable('round', 0);
  ctx.setVariable('score', 0);
  ctx.setVariable('playerIndex', 0);
  ctx.setVariable('isPlaying', 0);
  ctx.setVariable('isAnimating', 0);
  
  // Start first round
  startNewRound(ctx);
};

function startNewRound(ctx) {
  const round = ctx.getVariable('round') + 1;
  ctx.setVariable('round', round);
  
  // Add random button to pattern
  const nextButton = ctx.randomInt(0, 3);
  pattern.push(nextButton);
  
  // Reset player progress
  playerIndex = 0;
  ctx.setVariable('playerIndex', 0);
  
  // Start showing pattern
  isPlaying = false;
  ctx.setVariable('isPlaying', 0);
  patternIndex = 0;
  delayTimer = 0.5; // Initial delay before showing pattern
  
  console.log('Round ' + round + ', pattern length: ' + pattern.length);
}

function showNextInPattern(ctx) {
  if (patternIndex >= pattern.length) {
    // Pattern shown, now player's turn
    isPlaying = true;
    ctx.setVariable('isPlaying', 1);
    console.log('Player turn - repeat the pattern!');
    return;
  }
  
  const buttonIndex = pattern[patternIndex];
  flashButton(ctx, buttonIndex);
  patternIndex++;
}

function flashButton(ctx, buttonIndex) {
  isAnimating = true;
  ctx.setVariable('isAnimating', 1);
  currentFlashButton = buttonIndex;
  flashTimer = ctx.getConstant('FLASH_DURATION');
  
  // Add flash tag to button
  const buttonId = BUTTON_IDS[buttonIndex];
  ctx.addTag(buttonId, 'flashing');
  
  console.log('Flashing button: ' + COLORS[buttonIndex]);
}

function stopFlash(ctx) {
  if (currentFlashButton !== null) {
    const buttonId = BUTTON_IDS[currentFlashButton];
    ctx.removeTag(buttonId, 'flashing');
    currentFlashButton = null;
  }
  isAnimating = false;
  ctx.setVariable('isAnimating', 0);
  
  if (!isPlaying) {
    // Set delay before next pattern button
    delayTimer = ctx.getConstant('PATTERN_DELAY');
  }
}

function checkPlayerInput(ctx, buttonIndex) {
  if (!isPlaying || isAnimating) {
    return; // Not player's turn or animation in progress
  }
  
  const correctButton = pattern[playerIndex];
  
  if (buttonIndex === correctButton) {
    // Correct!
    console.log('Correct! (' + (playerIndex + 1) + '/' + pattern.length + ')');
    
    // Flash the button for feedback
    flashButton(ctx, buttonIndex);
    
    playerIndex++;
    ctx.setVariable('playerIndex', playerIndex);
    
    // Add score (10 points per correct button)
    ctx.addScore(10);
    
    if (playerIndex >= pattern.length) {
      // Round complete!
      console.log('Round complete!');
      // Score bonus for completing round
      const round = ctx.getVariable('round');
      ctx.addScore(round * 50);
      
      // Wait for flash to finish, then start new round
      setTimeout(function() {
        startNewRound(ctx);
      }, 1000);
    }
  } else {
    // Wrong button - game over!
    console.log('Wrong! Expected: ' + COLORS[correctButton] + ', got: ' + COLORS[buttonIndex]);
    ctx.gameOver('lose');
  }
}

exports.onUpdate = function(ctx, dt) {
  // Handle flash timing
  if (isAnimating && flashTimer > 0) {
    flashTimer -= dt;
    if (flashTimer <= 0) {
      stopFlash(ctx);
    }
  }
  
  // Handle delay between pattern buttons
  if (!isPlaying && !isAnimating && delayTimer > 0) {
    delayTimer -= dt;
    if (delayTimer <= 0) {
      showNextInPattern(ctx);
    }
  }
};

exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    // Check which button was tapped
    const worldPos = event.worldPosition;
    if (!worldPos) return;
    
    // Check each button
    for (let i = 0; i < BUTTON_IDS.length; i++) {
      const buttonId = BUTTON_IDS[i];
      const pos = ctx.getEntityPosition(buttonId);
      if (pos) {
        const dx = worldPos.x - pos.x;
        const dy = worldPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if tap is within button (using rough distance check)
        if (dist < 2) {
          checkPlayerInput(ctx, i);
          return;
        }
      }
    }
  }
};

// Helper function for setTimeout in script context
function setTimeout(callback, delay) {
  const startTime = Date.now();
  const checkInterval = setInterval(function() {
    if (Date.now() - startTime >= delay) {
      clearInterval(checkInterval);
      callback();
    }
  }, 50);
}
`,
  templates: {
    buttonRed: {
      id: "buttonRed",
      tags: ["button", "red"],
      visual: {
        type: "image",
        whatDescription: "a bright red glowing button",
        imageWidth: BUTTON_SIZE,
        imageHeight: BUTTON_SIZE,
      },
      collider: {
        shape: "box",
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: "flashing" },
          priority: 1,
          behaviors: [
            { type: "sprite_effect", effect: "flash", params: { color: [1, 0, 0], intensity: 0.8 } },
          ],
        },
      ],
    },
    buttonGreen: {
      id: "buttonGreen",
      tags: ["button", "green"],
      visual: {
        type: "image",
        whatDescription: "a bright green glowing button",
        imageWidth: BUTTON_SIZE,
        imageHeight: BUTTON_SIZE,
      },
      collider: {
        shape: "box",
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: "flashing" },
          priority: 1,
          behaviors: [
            { type: "sprite_effect", effect: "flash", params: { color: [0, 1, 0], intensity: 0.8 } },
          ],
        },
      ],
    },
    buttonBlue: {
      id: "buttonBlue",
      tags: ["button", "blue"],
      visual: {
        type: "image",
        whatDescription: "a bright blue glowing button",
        imageWidth: BUTTON_SIZE,
        imageHeight: BUTTON_SIZE,
      },
      collider: {
        shape: "box",
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: "flashing" },
          priority: 1,
          behaviors: [
            { type: "sprite_effect", effect: "flash", params: { color: [0, 0, 1], intensity: 0.8 } },
          ],
        },
      ],
    },
    buttonYellow: {
      id: "buttonYellow",
      tags: ["button", "yellow"],
      visual: {
        type: "image",
        whatDescription: "a bright yellow glowing button",
        imageWidth: BUTTON_SIZE,
        imageHeight: BUTTON_SIZE,
      },
      collider: {
        shape: "box",
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        isSensor: true,
      },
      conditionalBehaviors: [
        {
          when: { hasTag: "flashing" },
          priority: 1,
          behaviors: [
            { type: "sprite_effect", effect: "flash", params: { color: [1, 1, 0], intensity: 0.8 } },
          ],
        },
      ],
    },
    centerCircle: {
      id: "centerCircle",
      tags: ["center"],
      visual: {
        type: "circle",
        radius: 0.8,
        color: "#0f0f1e",
      },
    },
  },
  entities: [
    {
      id: "button-red",
      name: "Red Button",
      template: "buttonRed",
      transform: { x: cx(OFFSET), y: cy(OFFSET), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "button-green",
      name: "Green Button",
      template: "buttonGreen",
      transform: { x: cx(WORLD_WIDTH - OFFSET), y: cy(OFFSET), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "button-blue",
      name: "Blue Button",
      template: "buttonBlue",
      transform: { x: cx(OFFSET), y: cy(WORLD_HEIGHT - OFFSET), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "button-yellow",
      name: "Yellow Button",
      template: "buttonYellow",
      transform: { x: cx(WORLD_WIDTH - OFFSET), y: cy(WORLD_HEIGHT - OFFSET), angle: 0, scaleX: 1, scaleY: 1 },
    },
    {
      id: "center",
      name: "Center Circle",
      template: "centerCircle",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [],
};

export default game;
