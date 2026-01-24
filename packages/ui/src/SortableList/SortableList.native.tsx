
import React from 'react';
import Sortable from 'react-native-sortables';
import type { SortableListProps } from './types';

function SortableListNative<T>(props: SortableListProps<T>) {
  const { data, keyExtractor, renderItem, onReorder } = props;

  return (
    <Sortable.Flex
      gap={0}
      onDragEnd={({ indexToKey }) => {
        const reorderedData = indexToKey.map(key => 
          data.find(item => keyExtractor(item) === key)
        ).filter((item): item is T => item !== undefined);
        onReorder(reorderedData);
      }}
    >
      {data.map((item, index) => (
        <Sortable.Layer key={keyExtractor(item)}>
          {renderItem({
            item,
            index,
            drag: () => {},
            isActive: false,
          })}
        </Sortable.Layer>
      ))}
    </Sortable.Flex>
  );
}

export default SortableListNative;
