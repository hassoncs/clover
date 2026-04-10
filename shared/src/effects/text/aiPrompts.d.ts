/**
 * AI Prompt Templates for Text Effect Generation
 *
 * Provides prompts that guide LLMs to generate valid EffectGraphSpec
 * for text effects, with mobile optimization constraints.
 */
import type { EffectGraphSpec } from '../types';
import type { DeviceTier } from './types';
/**
 * Main prompt for generating text effects from natural language
 */
export declare function generateTextEffectPrompt(userDescription: string, tier?: DeviceTier, textContent?: string): string;
/**
 * Prompt for adjusting existing text effects
 */
export declare function generateAdjustmentPrompt(currentSpec: EffectGraphSpec, adjustmentDescription: string, tier?: DeviceTier): string;
/**
 * Prompt for selecting preset-based effects
 */
export declare function generatePresetSelectionPrompt(presetName: string, textContent: string, tier?: DeviceTier): string;
/**
 * Example prompt showing expected output format
 */
export declare const TEXT_EFFECT_EXAMPLE = "\nUser: \"Neon sign with cyan glow and dark outline\"\n\nResponse:\n{  \"id\": \"neon-text-effect\",  \"version\": \"1.0.0\",  \"engineApiVersion\": \"1.0.0\",  \"scope\": \"entity\",  \"nodes\": [    {      \"id\": \"text\",      \"type\": \"msdfTextGenerator\",      \"family\": \"generator\",      \"inputSlots\": [],      \"params\": {        \"fontSize\": 64,        \"color\": \"#00FFFF\",        \"outlineEnabled\": true,        \"outlineColor\": \"#000000\",        \"outlineSize\": 3,        \"glowEnabled\": true,        \"glowColor\": \"#00FFFF\",        \"glowSpread\": 12,        \"glowIntensity\": 2.5      },      \"outputTarget\": {        \"bufferId\": \"final\",        \"format\": \"rgba8\",        \"resolution\": \"full\"      },      \"flags\": { \"stateful\": false, \"fusible\": \"never\" }    }  ],  \"connections\": [],  \"feedbackEdges\": [],  \"lifecycle\": { \"autoStart\": true, \"stopMode\": \"freeze\" }}\n";
//# sourceMappingURL=aiPrompts.d.ts.map