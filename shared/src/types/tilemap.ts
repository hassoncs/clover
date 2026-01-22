import type { Vec2 } from './common';
import type { AssetSource } from './GameDefinition';

export interface TileMetadata {
  name?: string;
  tags?: string[];
  collision?: TileCollision;
  animation?: TileAnimation;
}

export type TileCollision = 
  | 'none'
  | 'full'
  | 'platform'
  | { polygon: Vec2[] };

export interface TileAnimation {
  frames: number[];
  fps: number;
  loop?: boolean;
}

export interface TileSheet {
  id: string;
  name: string;
  imageUrl: string;
  
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  spacing?: number;
  margin?: number;
  
  tiles?: Record<number, TileMetadata>;
  source?: AssetSource;
  style?: 'pixel' | 'cartoon' | '3d' | 'flat';
}

export type TileLayerType = 'background' | 'collision' | 'foreground' | 'decoration';

export interface TileLayer {
  id: string;
  name: string;
  type: TileLayerType;
  visible: boolean;
  opacity: number;
  
  data: number[];
  
  parallaxFactor?: number;
  zIndex?: number;
}

export interface TileMap {
  id: string;
  name: string;
  tileSheetId: string;
  
  width: number;
  height: number;
  
  layers: TileLayer[];
}

export interface TileMapEntity {
  type: 'tilemap';
  tileMapId: string;
  position: Vec2;
  scale?: number;
  visible?: boolean;
}
