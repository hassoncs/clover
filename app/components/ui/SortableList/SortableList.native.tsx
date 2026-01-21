
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SortableList from 'react-native-sortable-list';
import type { SortableListProps } from './types';

function SortableListNative<T>(props: SortableListProps<T>) {
  const { data, keyExtractor, renderItem, onReorder, contentContainerStyle, itemHeight } = props;

  const dataAsObject = React.useMemo(() => data.reduce((acc, item) => {
    acc[keyExtractor(item)] = item;
    return acc;
  }, {} as { [key: string]: T }), [data, keyExtractor]);

  const order = React.useMemo(() => data.map(keyExtractor), [data, keyExtractor]);

  const renderRow = ({ data: item, index, active }: { data: T; index: number; active: boolean }) => {
    return renderItem({
      item,
      index: index ?? 0,
      drag: () => {},
      isActive: active,
    });
  };

  return (
    <View style={styles.container}>
      <SortableList
        data={dataAsObject}
        order={order}
        onReleaseRow={(_, newOrder) => {
          const reorderedData = newOrder.map(key => dataAsObject[key]);
          onReorder(reorderedData);
        }}
        renderRow={renderRow}
        rowHeight={itemHeight}
        contentContainerStyle={contentContainerStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SortableListNative;
