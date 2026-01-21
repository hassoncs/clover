import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SortableListProps } from './types';

function SortableItem<T>({ id, item, index, renderItem, activeItem }: {
  id: string;
  item: T;
  index: number;
  renderItem: SortableListProps<T>['renderItem'];
  activeItem: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <View ref={setNodeRef} style={style}>
      {renderItem({ item, index, drag: () => ({...listeners, ...attributes}), isActive: activeItem === id })}
    </View>
  );
}

function SortableListWeb<T>(props: SortableListProps<T>) {
  const { data, keyExtractor, renderItem, onReorder, contentContainerStyle } = props;
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemKeys = useMemo(() => data.map(keyExtractor), [data, keyExtractor]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (over && active.id !== over.id) {
      const oldIndex = itemKeys.indexOf(active.id as string);
      const newIndex = itemKeys.indexOf(over.id as string);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveItem(active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
        <View style={contentContainerStyle}>
          {data.map((item, index) => (
            <SortableItem
              key={itemKeys[index]}
              id={itemKeys[index]}
              item={item}
              index={index}
              renderItem={renderItem}
              activeItem={activeItem}
            />
          ))}
        </View>
      </SortableContext>
    </DndContext>
  );
}

export default SortableListWeb;
