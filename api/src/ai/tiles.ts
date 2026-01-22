import type { TileSheet, TileMap, TileLayer } from '@slopcade/shared';

function generateId(): string {
  return crypto.randomUUID();
}

interface TileSheetOptions {
  tileSize: number;
  columns: number;
  rows: number;
  style: 'pixel' | 'cartoon' | '3d' | 'flat';
}

export async function generateTileSheet(
  prompt: string,
  options: TileSheetOptions,
  scenarioClient: any,
  uploadToR2: (buffer: Buffer, filename: string) => Promise<string>
): Promise<TileSheet> {
  const width = options.columns * options.tileSize;
  const height = options.rows * options.tileSize;
  
  const enhancedPrompt = `tileset, ${prompt}, ${options.style} art, seamless tiles, sprite sheet, game assets, ${options.columns}x${options.rows} grid, pixel perfect`;
  
  const result = await scenarioClient.generateImage({
    prompt: enhancedPrompt,
    width,
    height,
    model: 'model_retrodiffusion-tile',
    negative_prompt: 'blurry, text, watermark, duplicate tiles',
  });
  
  const filename = `tilesheet-${generateId()}.png`;
  const imageUrl = await uploadToR2(result.image, filename);
  
  return {
    id: generateId(),
    name: prompt,
    imageUrl,
    tileWidth: options.tileSize,
    tileHeight: options.tileSize,
    columns: options.columns,
    rows: options.rows,
    source: 'generated',
    style: options.style,
  };
}

interface TileMapAnalysis {
  tileTheme: string;
  tileSize: number;
  style: 'pixel' | 'cartoon' | '3d' | 'flat';
  width: number;
  height: number;
  layout: string;
  platformPositions: Array<{ x: number; y: number; width: number }>;
}

export async function analyzeTileMapPrompt(
  prompt: string,
  llm: any
): Promise<TileMapAnalysis> {
  const systemPrompt = `You are a game level designer. Analyze the user's prompt and extract level design parameters.
Return a JSON object with:
- tileTheme: describe the visual theme (e.g., "grass and stone platformer")
- tileSize: tile size in pixels (16, 32, or 64)
- style: art style ("pixel", "cartoon", "3d", or "flat")
- width: level width in tiles (10-30)
- height: level height in tiles (8-20)
- layout: description of the level layout
- platformPositions: array of platforms with x, y, width in tile coordinates`;

  const response = await llm.generate(systemPrompt, prompt);
  return JSON.parse(response);
}

export async function generateTileMapLayout(
  tileSheet: TileSheet,
  analysis: TileMapAnalysis
): Promise<TileMap> {
  const backgroundData: number[] = [];
  const collisionData: number[] = [];
  
  for (let y = 0; y < analysis.height; y++) {
    for (let x = 0; x < analysis.width; x++) {
      backgroundData.push(-1);
      
      let isSolid = false;
      
      if (y === analysis.height - 1 || y === analysis.height - 2) {
        isSolid = true;
      }
      
      for (const platform of analysis.platformPositions) {
        if (
          y === platform.y &&
          x >= platform.x &&
          x < platform.x + platform.width
        ) {
          isSolid = true;
        }
      }
      
      collisionData.push(isSolid ? 0 : -1);
    }
  }
  
  const layers: TileLayer[] = [
    {
      id: generateId(),
      name: 'Background',
      type: 'background',
      visible: true,
      opacity: 0.6,
      data: backgroundData,
      parallaxFactor: 0.5,
      zIndex: 0,
    },
    {
      id: generateId(),
      name: 'Collision',
      type: 'collision',
      visible: true,
      opacity: 1,
      data: collisionData,
      zIndex: 1,
    },
  ];
  
  return {
    id: generateId(),
    name: analysis.tileTheme,
    tileSheetId: tileSheet.id,
    width: analysis.width,
    height: analysis.height,
    layers,
  };
}

export async function generateTileMapFromPrompt(
  prompt: string,
  llm: any,
  scenarioClient: any,
  uploadToR2: (buffer: Buffer, filename: string) => Promise<string>
): Promise<{ tileSheet: TileSheet; tileMap: TileMap }> {
  const analysis = await analyzeTileMapPrompt(prompt, llm);
  
  const tileSheet = await generateTileSheet(
    analysis.tileTheme,
    {
      tileSize: analysis.tileSize,
      columns: 8,
      rows: 4,
      style: analysis.style,
    },
    scenarioClient,
    uploadToR2
  );
  
  const tileMap = await generateTileMapLayout(tileSheet, analysis);
  
  return { tileSheet, tileMap };
}
