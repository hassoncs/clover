import type { GameType } from './templates';
import type { ControlType } from '../../../shared/src/types/behavior';
import type { WinConditionType, LoseConditionType } from '../../../shared/src/types/rules';

export interface GameIntent {
  gameType: GameType;
  theme: string;
  playerAction: string;
  targetAction: string;
  winConditionType: WinConditionType;
  loseConditionType: LoseConditionType;
  controlType: ControlType;
  difficulty: 'easy' | 'medium' | 'hard';
  specialRequests: string[];
}

interface KeywordMatch {
  keywords: string[];
  value: string;
  weight: number;
}

const GAME_TYPE_KEYWORDS: KeywordMatch[] = [
  { keywords: ['launch', 'sling', 'throw', 'shoot', 'fire', 'catapult', 'fling', 'hurl', 'toss'], value: 'projectile', weight: 10 },
  { keywords: ['angry birds', 'knock down', 'destroy tower', 'hit target'], value: 'projectile', weight: 15 },
  { keywords: ['jump', 'hop', 'bounce', 'platform', 'climb', 'reach', 'parkour'], value: 'platformer', weight: 10 },
  { keywords: ['mario', 'flappy', 'doodle jump'], value: 'platformer', weight: 15 },
  { keywords: ['stack', 'pile', 'tower', 'balance', 'build up', 'jenga'], value: 'stacking', weight: 10 },
  { keywords: ['tetris', 'drop block'], value: 'stacking', weight: 12 },
  { keywords: ['drive', 'car', 'vehicle', 'truck', 'race', 'hill', 'motorcycle', 'bike'], value: 'vehicle', weight: 10 },
  { keywords: ['hill climb', 'monster truck'], value: 'vehicle', weight: 15 },
  { keywords: ['catch', 'collect', 'falling', 'rain', 'drop', 'basket'], value: 'falling_objects', weight: 10 },
  { keywords: ['fruit ninja', 'catch the'], value: 'falling_objects', weight: 12 },
  { keywords: ['rope', 'swing', 'cut', 'pendulum', 'grapple'], value: 'rope_physics', weight: 10 },
  { keywords: ['cut the rope', 'tarzan'], value: 'rope_physics', weight: 15 },
];

const CONTROL_TYPE_KEYWORDS: KeywordMatch[] = [
  { keywords: ['tap', 'click', 'touch'], value: 'tap_to_jump', weight: 5 },
  { keywords: ['jump', 'hop', 'bounce'], value: 'tap_to_jump', weight: 8 },
  { keywords: ['drag', 'pull', 'aim', 'sling', 'draw'], value: 'drag_to_aim', weight: 10 },
  { keywords: ['tilt', 'accelerometer', 'gyro', 'lean'], value: 'tilt_to_move', weight: 10 },
  { keywords: ['swipe', 'slide', 'move finger'], value: 'drag_to_move', weight: 8 },
  { keywords: ['buttons', 'left right', 'd-pad', 'arrows'], value: 'buttons', weight: 10 },
];

const WIN_CONDITION_KEYWORDS: KeywordMatch[] = [
  { keywords: ['score', 'points', 'reach', 'get'], value: 'score', weight: 5 },
  { keywords: ['destroy', 'knock', 'eliminate', 'clear', 'remove all'], value: 'destroy_all', weight: 10 },
  { keywords: ['survive', 'last', 'endure', 'stay alive'], value: 'survive_time', weight: 10 },
  { keywords: ['collect all', 'gather', 'get all'], value: 'collect_all', weight: 10 },
  { keywords: ['reach', 'get to', 'arrive', 'finish line', 'goal'], value: 'reach_entity', weight: 8 },
];

const LOSE_CONDITION_KEYWORDS: KeywordMatch[] = [
  { keywords: ['die', 'death', 'killed', 'destroyed'], value: 'entity_destroyed', weight: 8 },
  { keywords: ['fall', 'drop', 'off screen', 'out of bounds'], value: 'entity_exits_screen', weight: 8 },
  { keywords: ['time', 'timer', 'clock', 'seconds'], value: 'time_up', weight: 6 },
  { keywords: ['lives', 'hearts', 'health', 'no more tries'], value: 'lives_zero', weight: 8 },
];

const THEME_KEYWORDS: Record<string, string[]> = {
  cats: ['cat', 'kitty', 'kitten', 'feline', 'meow'],
  dogs: ['dog', 'puppy', 'doggy', 'canine', 'bark', 'woof'],
  birds: ['bird', 'angry bird', 'flying', 'feather', 'wing'],
  space: ['space', 'rocket', 'alien', 'planet', 'star', 'asteroid', 'galaxy', 'moon'],
  underwater: ['fish', 'ocean', 'sea', 'underwater', 'submarine', 'shark', 'dolphin'],
  medieval: ['knight', 'castle', 'dragon', 'medieval', 'king', 'queen', 'sword'],
  food: ['food', 'fruit', 'candy', 'pizza', 'burger', 'cake', 'cookie'],
  sports: ['ball', 'basketball', 'football', 'soccer', 'tennis', 'golf'],
  vehicles: ['car', 'truck', 'bus', 'plane', 'helicopter', 'boat', 'train'],
  nature: ['tree', 'flower', 'forest', 'jungle', 'garden', 'leaf'],
  monsters: ['monster', 'zombie', 'ghost', 'vampire', 'creature'],
  robots: ['robot', 'mech', 'android', 'cyborg', 'machine'],
};

const DIFFICULTY_KEYWORDS: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: ['easy', 'simple', 'beginner', 'kid', 'child', 'basic', 'relaxing'],
  medium: ['medium', 'normal', 'moderate', 'balanced'],
  hard: ['hard', 'difficult', 'challenging', 'expert', 'advanced', 'tough'],
};

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim();
}

function findBestMatch<T extends string>(
  prompt: string,
  keywordMatches: KeywordMatch[],
  defaultValue: T
): T {
  const normalized = normalizePrompt(prompt);
  let bestMatch = defaultValue;
  let highestScore = 0;

  for (const match of keywordMatches) {
    let score = 0;
    for (const keyword of match.keywords) {
      if (normalized.includes(keyword)) {
        score += match.weight;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = match.value as T;
    }
  }

  return bestMatch;
}

function extractTheme(prompt: string): string {
  const normalized = normalizePrompt(prompt);

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return theme;
      }
    }
  }

  return 'generic';
}

function extractDifficulty(prompt: string): 'easy' | 'medium' | 'hard' {
  const normalized = normalizePrompt(prompt);

  for (const [difficulty, keywords] of Object.entries(DIFFICULTY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return difficulty as 'easy' | 'medium' | 'hard';
      }
    }
  }

  return 'medium';
}

function extractPlayerAction(prompt: string, gameType: GameType): string {
  const actionWords: Record<GameType, string[]> = {
    projectile: ['launch', 'throw', 'shoot', 'fire', 'fling', 'sling', 'aim'],
    platformer: ['jump', 'hop', 'bounce', 'climb', 'run'],
    stacking: ['stack', 'drop', 'place', 'balance', 'build'],
    vehicle: ['drive', 'race', 'steer', 'accelerate', 'brake'],
    falling_objects: ['catch', 'collect', 'dodge', 'move', 'grab'],
    rope_physics: ['swing', 'cut', 'grab', 'release', 'hang'],
  };

  const normalized = normalizePrompt(prompt);
  const actions = actionWords[gameType] || [];

  for (const action of actions) {
    if (normalized.includes(action)) {
      return action;
    }
  }

  return actions[0] || 'interact';
}

function extractTargetAction(prompt: string, gameType: GameType): string {
  const targetActions: Record<GameType, string[]> = {
    projectile: ['knock down', 'destroy', 'hit', 'break', 'topple'],
    platformer: ['collect', 'reach', 'avoid', 'defeat', 'find'],
    stacking: ['build', 'balance', 'reach height', 'prevent falling'],
    vehicle: ['reach finish', 'collect coins', 'avoid obstacles', 'survive'],
    falling_objects: ['catch', 'avoid', 'collect', 'sort'],
    rope_physics: ['deliver', 'reach', 'collect', 'swing to'],
  };

  const normalized = normalizePrompt(prompt);
  const targets = targetActions[gameType] || [];

  for (const target of targets) {
    if (normalized.includes(target)) {
      return target;
    }
  }

  return targets[0] || 'complete objective';
}

function extractSpecialRequests(prompt: string): string[] {
  const requests: string[] = [];
  const normalized = normalizePrompt(prompt);

  const specialPatterns = [
    { pattern: /more (bouncy|bounce)/i, request: 'high_restitution' },
    { pattern: /faster|speed/i, request: 'fast_gameplay' },
    { pattern: /slower|slow/i, request: 'slow_gameplay' },
    { pattern: /lots of|many|multiple/i, request: 'many_entities' },
    { pattern: /big|large|huge/i, request: 'large_entities' },
    { pattern: /small|tiny|mini/i, request: 'small_entities' },
    { pattern: /no gravity|zero gravity|float/i, request: 'no_gravity' },
    { pattern: /low gravity|moon/i, request: 'low_gravity' },
    { pattern: /high gravity|heavy/i, request: 'high_gravity' },
    { pattern: /timer|time limit|countdown/i, request: 'timed_game' },
    { pattern: /endless|infinite|no end/i, request: 'endless_mode' },
    { pattern: /multiplayer|two player|2 player/i, request: 'multiplayer' },
  ];

  for (const { pattern, request } of specialPatterns) {
    if (pattern.test(normalized)) {
      requests.push(request);
    }
  }

  return requests;
}

export function classifyPrompt(prompt: string): GameIntent {
  const gameType = findBestMatch<GameType>(
    prompt,
    GAME_TYPE_KEYWORDS,
    'projectile'
  );

  const controlType = findBestMatch<ControlType>(
    prompt,
    CONTROL_TYPE_KEYWORDS,
    getDefaultControlType(gameType)
  );

  const winConditionType = findBestMatch<WinConditionType>(
    prompt,
    WIN_CONDITION_KEYWORDS,
    getDefaultWinCondition(gameType)
  );

  const loseConditionType = findBestMatch<LoseConditionType>(
    prompt,
    LOSE_CONDITION_KEYWORDS,
    getDefaultLoseCondition(gameType)
  );

  return {
    gameType,
    theme: extractTheme(prompt),
    playerAction: extractPlayerAction(prompt, gameType),
    targetAction: extractTargetAction(prompt, gameType),
    winConditionType,
    loseConditionType,
    controlType,
    difficulty: extractDifficulty(prompt),
    specialRequests: extractSpecialRequests(prompt),
  };
}

function getDefaultControlType(gameType: GameType): ControlType {
  const defaults: Record<GameType, ControlType> = {
    projectile: 'drag_to_aim',
    platformer: 'tap_to_jump',
    stacking: 'tap_to_shoot',
    vehicle: 'tilt_to_move',
    falling_objects: 'drag_to_move',
    rope_physics: 'tap_to_flip',
  };
  return defaults[gameType];
}

function getDefaultWinCondition(gameType: GameType): WinConditionType {
  const defaults: Record<GameType, WinConditionType> = {
    projectile: 'destroy_all',
    platformer: 'reach_entity',
    stacking: 'score',
    vehicle: 'reach_entity',
    falling_objects: 'survive_time',
    rope_physics: 'collect_all',
  };
  return defaults[gameType];
}

function getDefaultLoseCondition(gameType: GameType): LoseConditionType {
  const defaults: Record<GameType, LoseConditionType> = {
    projectile: 'lives_zero',
    platformer: 'entity_destroyed',
    stacking: 'entity_destroyed',
    vehicle: 'entity_destroyed',
    falling_objects: 'score_below',
    rope_physics: 'entity_destroyed',
  };
  return defaults[gameType];
}

export function getClassificationConfidence(prompt: string): number {
  const normalized = normalizePrompt(prompt);
  let totalMatches = 0;

  for (const match of GAME_TYPE_KEYWORDS) {
    for (const keyword of match.keywords) {
      if (normalized.includes(keyword)) {
        totalMatches++;
      }
    }
  }

  const confidence = Math.min(1, totalMatches / 3);
  return confidence;
}
