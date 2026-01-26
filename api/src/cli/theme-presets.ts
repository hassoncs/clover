export const THEME_PRESETS: Record<string, string> = {
  medieval: 'medieval fantasy with stone textures and ornate metalwork',
  scifi: 'futuristic sci-fi with neon glows and holographic effects',
  cartoon: 'cartoon style with bright colors and bold outlines',
  cyberpunk: 'cyberpunk neon with glowing edges and dark backgrounds',
  fantasy: 'high fantasy with magical glows and ethereal effects',
  minimal: 'minimal modern design with clean lines and subtle gradients',
  steampunk: 'steampunk with brass gears, rivets, and aged metal textures',
  retro: 'retro 80s arcade with pixel-perfect edges and neon pink/cyan',
};

export function getPresetTheme(presetName?: string): string | undefined {
  if (!presetName) return undefined;

  const theme = THEME_PRESETS[presetName.toLowerCase()];
  if (!theme) {
    const available = Object.keys(THEME_PRESETS).join(', ');
    throw new Error(`Unknown preset: ${presetName}. Available: ${available}`);
  }

  return theme;
}

export function listPresets(): void {
  console.log('\nAvailable theme presets:\n');
  for (const [name, description] of Object.entries(THEME_PRESETS)) {
    console.log(`  ${name.padEnd(12)} - ${description}`);
  }
  console.log();
}
