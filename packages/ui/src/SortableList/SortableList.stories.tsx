import type { Meta, StoryObj } from '@storybook/react';
import { SortableList } from './index';
import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';

const meta: Meta<typeof SortableList> = {
  title: 'UI/SortableList',
  component: SortableList,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 20, minHeight: 400 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

interface Item {
  id: string;
  label: string;
  color: string;
}

const INITIAL_DATA: Item[] = [
  { id: '1', label: 'Item 1', color: '#FF5733' },
  { id: '2', label: 'Item 2', color: '#33FF57' },
  { id: '3', label: 'Item 3', color: '#3357FF' },
  { id: '4', label: 'Item 4', color: '#F3FF33' },
  { id: '5', label: 'Item 5', color: '#FF33F3' },
];

const SortableListWrapper = () => {
  const [data, setData] = useState(INITIAL_DATA);

  return (
    <SortableList
      data={data}
      keyExtractor={(item) => item.id}
      onReorder={setData}
      itemHeight={60}
      renderItem={({ item, drag, isActive }) => (
        <View style={[styles.item, isActive && styles.activeItem, { backgroundColor: item.color }]}>
          <View onTouchStart={drag} style={styles.dragHandle}>
            <Feather name="menu" size={24} color="white" />
          </View>
          <Text style={styles.text}>{item.label}</Text>
        </View>
      )}
    />
  );
};

export const Default: Story = {
  render: () => <SortableListWrapper />,
};

const styles = StyleSheet.create({
  item: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeItem: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  dragHandle: {
    marginRight: 16,
    padding: 8,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
