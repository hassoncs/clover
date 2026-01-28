export interface FontAllowlistEntry {
  family: string;
  weights: number[];
  styles: ('normal' | 'italic')[];
  category: 'sans-serif' | 'serif' | 'display' | 'monospace';
  displayName: string;
}

export const ALLOWLISTED_FONTS: FontAllowlistEntry[] = [
  // Display fonts - great for game titles and headings
  {
    family: 'Luckiest Guy',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Luckiest Guy',
  },
  {
    family: 'Bungee',
    weights: [400, 700],
    styles: ['normal'],
    category: 'display',
    displayName: 'Bungee',
  },
  {
    family: 'Black Ops One',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Black Ops One',
  },
  {
    family: 'Press Start 2P',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Press Start 2P',
  },
  {
    family: 'Fredoka One',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Fredoka One',
  },
  {
    family: 'Bangers',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Bangers',
  },
  {
    family: 'Righteous',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Righteous',
  },
  {
    family: 'Creepster',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Creepster',
  },
  {
    family: 'Permanent Marker',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Permanent Marker',
  },
  {
    family: 'Abril Fatface',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    displayName: 'Abril Fatface',
  },
  // Sans-serif fonts - versatile for UI and body text
  {
    family: 'Roboto',
    weights: [100, 300, 400, 500, 700, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Roboto',
  },
  {
    family: 'Open Sans',
    weights: [300, 400, 500, 600, 700, 800],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Open Sans',
  },
  {
    family: 'Lato',
    weights: [100, 300, 400, 700, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Lato',
  },
  {
    family: 'Montserrat',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Montserrat',
  },
  {
    family: 'Poppins',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Poppins',
  },
  {
    family: 'Nunito',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Nunito',
  },
  {
    family: 'Raleway',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Raleway',
  },
  {
    family: 'Source Sans Pro',
    weights: [200, 300, 400, 600, 700, 900],
    styles: ['normal', 'italic'],
    category: 'sans-serif',
    displayName: 'Source Sans Pro',
  },
  // Serif fonts - great for readable body text and classic game feel
  {
    family: 'Merriweather',
    weights: [300, 400, 700, 900],
    styles: ['normal', 'italic'],
    category: 'serif',
    displayName: 'Merriweather',
  },
  {
    family: 'Playfair Display',
    weights: [400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    category: 'serif',
    displayName: 'Playfair Display',
  },
  {
    family: 'Lora',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic'],
    category: 'serif',
    displayName: 'Lora',
  },
  {
    family: 'PT Serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    category: 'serif',
    displayName: 'PT Serif',
  },
  {
    family: 'Crimson Text',
    weights: [400, 600, 700],
    styles: ['normal', 'italic'],
    category: 'serif',
    displayName: 'Crimson Text',
  },
  // Monospace fonts - perfect for retro games and code-like text
  {
    family: 'Fira Code',
    weights: [300, 400, 500, 600, 700],
    styles: ['normal'],
    category: 'monospace',
    displayName: 'Fira Code',
  },
  {
    family: 'JetBrains Mono',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    styles: ['normal'],
    category: 'monospace',
    displayName: 'JetBrains Mono',
  },
];

export function isFontAllowlisted(family: string): boolean {
  return ALLOWLISTED_FONTS.some((entry) => entry.family === family);
}

export function getFontEntry(family: string): FontAllowlistEntry | undefined {
  return ALLOWLISTED_FONTS.find((entry) => entry.family === family);
}

export function getAllowlistedFamilies(): string[] {
  return ALLOWLISTED_FONTS.map((entry) => entry.family);
}

export function isWeightAvailable(family: string, weight: number): boolean {
  const entry = getFontEntry(family);
  if (!entry) return false;
  return entry.weights.includes(weight);
}

export function getDefaultFont(): FontAllowlistEntry {
  return ALLOWLISTED_FONTS[0];
}
