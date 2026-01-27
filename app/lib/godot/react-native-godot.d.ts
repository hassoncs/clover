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

  export interface GodotSignal {
    connect(callback: (...args: unknown[]) => void): void;
  }

  export interface GodotNode {
    get(property: string): unknown;
    set(property: string, value: unknown): void;
    connect(signal: string, callback: (...args: unknown[]) => void): void;
    query_result: GodotSignal;
    joint_created: GodotSignal;
    query_point_entity(x: number, y: number): string | null;
    create_mouse_joint(entityId: string, targetX: number, targetY: number, maxForce: number, stiffness: number, damping: number): number;
    set_mouse_target(jointId: number, targetX: number, targetY: number): void;
    destroy_joint(jointId: number): void;
    [key: string]: unknown;
  }

  export const RTNGodot: {
    API(): GodotAPI;
    getInstance(): unknown | null;
    createInstance(args: string[]): void;
    destroyInstance(): void;
    pause(): void;
    resume(): void;
    is_paused(): boolean;
  };

  export const RTNGodotView: React.ComponentType<{
    style?: object;
    windowName?: string;
  }>;

  export function runOnGodotThread<T>(fn: () => T): Promise<T>;
}
