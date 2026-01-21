
import type { ViewStyle } from 'react-native';

export interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
  }) => React.ReactNode;
  onReorder: (newOrder: T[]) => void;
  contentContainerStyle?: ViewStyle;
  itemHeight: number;
}
