/**
 * All costs in MICRODOLLARS (1,000,000 = $1.00)
 * 
 * Conversion helpers:
 * - 1 Spark (display) = 10,000 microdollars = $0.01
 * - 100 Sparks = $1.00
 * - 1 Gem (display) = 100,000 microdollars = $1.00
 */

export { 
  DISPLAY_UNITS, 
  microsToSparks, 
  sparksToMicros, 
  microsToUSD, 
  formatSparks 
} from '@slopcade/shared';

// Base costs (what WE pay to providers)
export const PROVIDER_COSTS = {
  // Scenario.com - approximately $0.02 per image
  SCENARIO_TXT2IMG: 20_000,      // $0.02
  SCENARIO_IMG2IMG: 20_000,      // $0.02
  SCENARIO_REMOVE_BG: 5_000,     // $0.005
  SCENARIO_LAYERED: 30_000,      // $0.03
  
  // OpenRouter - varies by model, these are estimates
  OPENROUTER_GPT4O_INPUT_1K: 2_500,   // $0.0025 per 1k input tokens
  OPENROUTER_GPT4O_OUTPUT_1K: 10_000, // $0.01 per 1k output tokens
} as const;

// What we CHARGE users (includes margin)
// Margin factor: 2x (100% markup) - adjust as needed
const MARGIN = 2.0;

export const USER_COSTS = {
  // Asset Generation
  ASSET_ENTITY: Math.ceil(PROVIDER_COSTS.SCENARIO_IMG2IMG * MARGIN),           // 40,000 micros = 40 Sparks
  ASSET_BACKGROUND: Math.ceil(PROVIDER_COSTS.SCENARIO_TXT2IMG * MARGIN),       // 40,000 micros = 40 Sparks
  ASSET_TITLE_HERO: Math.ceil(PROVIDER_COSTS.SCENARIO_TXT2IMG * MARGIN),       // 40,000 micros = 40 Sparks (no bg removal)
  ASSET_TITLE_HERO_NO_BG: Math.ceil((PROVIDER_COSTS.SCENARIO_TXT2IMG + PROVIDER_COSTS.SCENARIO_REMOVE_BG) * MARGIN), // 50,000 micros
  ASSET_PARALLAX: Math.ceil((PROVIDER_COSTS.SCENARIO_TXT2IMG + PROVIDER_COSTS.SCENARIO_LAYERED) * MARGIN),      // 100,000 micros
  
  // Game Generation (LLM)
  GAME_GENERATION_BASE: 100_000,  // $0.10 base cost
  GAME_GENERATION_PER_ENTITY: 20_000, // $0.02 per entity in game
  
  // Bulk discounts
  FULL_GAME_RESKIN_DISCOUNT: 0.8, // 20% off when regenerating entire game
} as const;

// Signup code grants (NO daily bonus for launch)
export const GRANTS = {
  SIGNUP_CODE_DEFAULT: 5_000_000,  // $5.00 = 500 Sparks (enough for 125 entity sprites)
  // DAILY_LOGIN_BONUS: DISABLED for launch
} as const;

// Rate limits
export const RATE_LIMITS = {
  GENERATIONS_PER_HOUR: 20,
  GENERATIONS_PER_DAY: 100,
  DAILY_CLAIMS_PER_DAY: 1,
} as const;

// IAP Products (seed data)
export const IAP_PRODUCT_CATALOG = [
  {
    id: 'starter_pack',
    sku: 'com.slopcade.sparks.starter',
    name: 'Starter Pack',
    description: '50 Sparks - Perfect for trying out AI generation',
    priceCents: 99,        // $0.99
    creditAmountMicros: 500_000, // 50 Sparks
    bonusPercent: 0,
  },
  {
    id: 'creator_pack',
    sku: 'com.slopcade.sparks.creator',
    name: 'Creator Pack',
    description: '250 Sparks + 10% Bonus',
    priceCents: 499,       // $4.99
    creditAmountMicros: 2_750_000, // 275 Sparks (includes 10% bonus)
    bonusPercent: 10,
  },
  {
    id: 'studio_pack',
    sku: 'com.slopcade.sparks.studio',
    name: 'Studio Pack',
    description: '1,000 Sparks + 20% Bonus',
    priceCents: 1999,      // $19.99
    creditAmountMicros: 12_000_000, // 1200 Sparks (includes 20% bonus)
    bonusPercent: 20,
  },
] as const;
