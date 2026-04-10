/**
 * AI Prompt Templates for Text Effect Generation
 *
 * Provides prompts that guide LLMs to generate valid EffectGraphSpec
 * for text effects, with mobile optimization constraints.
 */
import { TEXT_SHADER_LIBRARY } from './registry';
/**
 * Generate the shader library metadata section for prompts
 */
function generateShaderMetadata() {
    const entries = Object.values(TEXT_SHADER_LIBRARY);
    return entries
        .map((entry) => `- ${entry.id}: ${entry.aiHints.description}
  Category: ${entry.aiHints.category}
  Aliases: ${entry.aiHints.aliases.join(', ')}
  Combines with: ${entry.aiHints.combinability.join(', ')}`)
        .join('\n');
}
/**
 * Generate mobile constraint guidance
 */
function generateMobileConstraints(tier) {
    const limits = {
        high: {
            maxEffects: 4,
            maxSamples: 16,
            blur: 'allowed',
        },
        mid: {
            maxEffects: 3,
            maxSamples: 12,
            blur: 'use SDF spread instead',
        },
        low: {
            maxEffects: 2,
            maxSamples: 8,
            blur: 'not available - use MSDF single-pass',
        },
    }[tier];
    return `
Mobile Optimization Tier: ${tier.toUpperCase()}
- Maximum ${limits.maxEffects} effects combined
- Maximum ${limits.maxSamples} samples for blur/glow
- Blur: ${limits.blur}
- Prefer MSDF single-pass for outline/shadow/glow
- Avoid SubViewport multi-pass unless necessary`;
}
/**
 * Main prompt for generating text effects from natural language
 */
export function generateTextEffectPrompt(userDescription, tier = 'mid', textContent = 'Sample Text') {
    return `You are an expert text effects designer for a game engine.

Available text shaders:
${generateShaderMetadata()}

${generateMobileConstraints(tier)}

Create an EffectGraphSpec JSON for the following text effect request:
"${userDescription}"

The text content is: "${textContent}"

Requirements:
1. Choose the appropriate rendering tier based on effect complexity
   - Use msdfTextGenerator for simple outline/shadow/glow (single-pass)
   - Use subViewportTextGenerator only if blur, gradient, or bevel is needed
2. Include only the effects mentioned or strongly implied
3. Set parameter values appropriate for the described style
4. Wire connections correctly (generator output → filter input)
5. Respect the mobile tier constraints above

EffectGraphSpec structure:
{
  "id": "unique-effect-id",
  "version": "1.0.0",
  "engineApiVersion": "1.0.0",
  "scope": "entity",
  "nodes": [
    {
      "id": "text",
      "type": "msdfTextGenerator",
      "family": "generator",
      "inputSlots": [],
      "params": { /* shader parameters */ },
      "outputTarget": { "bufferId": "text_out", "format": "rgba8", "resolution": "full" },
      "flags": { "stateful": false, "fusible": "never" }
    }
  ],
  "connections": [],
  "feedbackEdges": [],
  "lifecycle": { "autoStart": true, "stopMode": "freeze" }
}

Output ONLY valid JSON. No markdown, no explanation.`;
}
/**
 * Prompt for adjusting existing text effects
 */
export function generateAdjustmentPrompt(currentSpec, adjustmentDescription, tier = 'mid') {
    const currentJson = JSON.stringify(currentSpec, null, 2);
    return `You are adjusting a text effect.

Current EffectGraphSpec:
\`\`\`json
${currentJson}
\`\`\`

Adjustment request: "${adjustmentDescription}"

${generateMobileConstraints(tier)}

Modify the spec to implement this adjustment. You can:
- Change parameter values
- Add new effect nodes (respecting max effects limit)
- Remove unnecessary effects
- Switch between msdfTextGenerator and subViewportTextGenerator if needed

Output the complete modified EffectGraphSpec as valid JSON only.`;
}
/**
 * Prompt for selecting preset-based effects
 */
export function generatePresetSelectionPrompt(presetName, textContent, tier = 'mid') {
    const presets = {
        neon: 'Bright neon sign with cyan/yellow glow and dark outline',
        gold: 'Metallic gold gradient with bevel emboss effect',
        retro: 'Pixel-art style with sharp outline and drop shadow',
        minimal: 'Clean text with subtle shadow only',
        dramatic: 'Heavy outline, large glow, gradient fill',
    };
    const description = presets[presetName] || presetName;
    return generateTextEffectPrompt(description, tier, textContent);
}
/**
 * Example prompt showing expected output format
 */
export const TEXT_EFFECT_EXAMPLE = `
User: "Neon sign with cyan glow and dark outline"

Response:
{\
  "id": "neon-text-effect",\
  "version": "1.0.0",\
  "engineApiVersion": "1.0.0",\
  "scope": "entity",\
  "nodes": [\
    {\
      "id": "text",\
      "type": "msdfTextGenerator",\
      "family": "generator",\
      "inputSlots": [],\
      "params": {\
        "fontSize": 64,\
        "color": "#00FFFF",\
        "outlineEnabled": true,\
        "outlineColor": "#000000",\
        "outlineSize": 3,\
        "glowEnabled": true,\
        "glowColor": "#00FFFF",\
        "glowSpread": 12,\
        "glowIntensity": 2.5\
      },\
      "outputTarget": {\
        "bufferId": "final",\
        "format": "rgba8",\
        "resolution": "full"\
      },\
      "flags": { "stateful": false, "fusible": "never" }\
    }\
  ],\
  "connections": [],\
  "feedbackEdges": [],\
  "lifecycle": { "autoStart": true, "stopMode": "freeze" }\
}
`;
//# sourceMappingURL=aiPrompts.js.map