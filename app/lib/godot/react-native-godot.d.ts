declare module '@borndotcom/react-native-godot' {
  export interface GodotAPI {
    Engine: {
      get_main_loop(): {
        get_root(): {
          get_node(path: string): GodotNode | null;
        };
      };
    };
    Vector2(x?: number, y?: number): { x: number; y: number };
  }

  export interface GodotNode {
    call(method: string, ...args: unknown[]): unknown;
    get(property: string): unknown;
    set(property: string, value: unknown): void;
    connect(signal: string, callback: (...args: unknown[]) => void): void;
  }

  export const RTNGodot: {
    API(): GodotAPI;
    createInstance(args: string[]): void;
    destroyInstance(): void;
    pause(): void;
    resume(): void;
  };

  export const RTNGodotView: React.ComponentType<{
    style?: object;
    windowName?: string;
  }>;

  export function runOnGodotThread(fn: () => void): void;
}
