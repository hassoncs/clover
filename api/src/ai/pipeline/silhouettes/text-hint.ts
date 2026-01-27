async function getSharp() {
  const mod = await import('sharp');
  return mod.default;
}

export interface TextHintParams {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string;
}

export interface IconHintParams {
  svgPath: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export async function createTextHint(params: TextHintParams): Promise<Buffer> {
  const { text, x, y, fontSize, color, fontFamily = 'Arial', fontWeight = 'normal' } = params;
  
  const svg = `
    <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${x}" 
        y="${y}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}" 
        font-weight="${fontWeight}"
        fill="${color}" 
        text-anchor="middle" 
        dominant-baseline="middle">
        ${text}
      </text>
    </svg>
  `;
  
  const sharp = await getSharp();
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function createIconHint(params: IconHintParams): Promise<Buffer> {
  const { svgPath, x, y, size, color } = params;
  
  const svg = `
    <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${x - size/2}, ${y - size/2}) scale(${size/24})">
        <path d="${svgPath}" fill="${color}" />
      </g>
    </svg>
  `;
  
  const sharp = await getSharp();
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export const ICON_PATHS = {
  checkmark: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
};
