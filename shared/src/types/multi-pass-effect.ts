export interface MultiPassEffectSpec {
  id: string;
  buffers: Record<string, BufferSpec>;
  passes: PassSpec[];
  displayBuffer: string;
  lifecycle: {
    autoStart: boolean;
    stopMode: 'freeze' | 'clear';
  };
}

export interface BufferSpec {
  width?: number;
  height?: number;
  initFrom?: 'entity' | 'clear';
  clearColor?: string;
}

export interface PassSpec {
  id: string;
  shader: string;
  reads: Record<string, string>;
  writes: string;
  params?: Record<string, unknown>;
  inputs?: string[];
}
