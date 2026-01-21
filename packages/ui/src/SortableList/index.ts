import { Platform } from 'react-native';
import SortableListNative from './SortableList.native';
import SortableListWeb from './SortableList.web';

export * from './types';

export const SortableList = Platform.select({
  native: SortableListNative,
  default: SortableListWeb,
});
