# Sound Generation

> **Reference**: ElevenLabs Sound Effects API integration for generating game audio

---

## Overview

Sound effects are generated using the [ElevenLabs Text-to-Sound-Effects API](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert). This allows creating custom sound effects from text descriptions.

## Quick Start

```bash
# Generate a preset sound
npx hush run -t api -- node scripts/generate-sound-effect.mjs thud

# Generate custom sound
npx hush run -t api -- node scripts/generate-sound-effect.mjs "laser beam zap" laser
```

## Script Location

`scripts/generate-sound-effect.mjs`

## Available Presets

| Preset | Description | Output |
|--------|-------------|--------|
| `thud` | Heavy wooden block landing on platform | `physics-stacker/sounds/thud.mp3` |

## Output Location

Sound files are saved to: `app/public/assets/games/<game-name>/sounds/`

## API Configuration

- **API Key**: `ELEVENLABS_API_KEY` (stored in Hush)
- **Output Format**: MP3 128kbps, 44.1kHz stereo
- **Endpoint**: `POST https://api.elevenlabs.io/v1/sound-generation`

## Adding New Presets

Edit `scripts/generate-sound-effect.mjs` and add to the `SOUND_PRESETS` object:

```javascript
const SOUND_PRESETS = {
  thud: {
    text: "Short deep thud sound of a heavy wooden block landing on a platform",
    durationSeconds: 1,
    promptInfluence: 0.5,
  },
  // Add new presets here
  explosion: {
    text: "8-bit retro game explosion, pixel art style",
    durationSeconds: 2,
    promptInfluence: 0.4,
  },
};
```

## API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | required | Description of the sound to generate |
| `duration_seconds` | number | auto | Length of sound (0.5-30 seconds) |
| `prompt_influence` | number | 0.3 | How closely to follow prompt (0-1) |
| `output_format` | string | mp3_44100_128 | Audio format and quality |

## Related Documentation

- [Scenario.com Setup](../log/2026/2026-01-21-scenario-setup.md) - Image generation
