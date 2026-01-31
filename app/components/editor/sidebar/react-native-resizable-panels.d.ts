declare module 'react-native-resizable-panels' {
  import type { ComponentType, ReactNode } from 'react';
  import type { ViewStyle } from 'react-native';

  export interface PanelProps {
    children?: ReactNode;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
    style?: ViewStyle;
  }

  export interface PanelGroupProps {
    children?: ReactNode;
    direction?: 'horizontal' | 'vertical';
    autoSaveId?: string;
    style?: ViewStyle;
  }

  export interface PanelResizeHandleProps {
    style?: ViewStyle;
  }

  export const Panel: ComponentType<PanelProps>;
  export const PanelGroup: ComponentType<PanelGroupProps>;
  export const PanelResizeHandle: ComponentType<PanelResizeHandleProps>;
}
