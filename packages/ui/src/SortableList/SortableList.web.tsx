
import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { View } from 'react-native';
import type { SortableListProps } from './types';

function SortableItem<T>({ id, item, index, renderItem }: { id: string; item: T; index: number; renderItem: SortableListProps<T>['renderItem'] }) {
  const { attributes, listeners, setNodeRef, transform, transition, active } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <View ref={setNodeRef} style={style}>
      {renderItem({ item, index, drag: () => ({...listeners, ...attributes}), isActive: !!active })}
    </View>
  );
}

export default function SortableListWeb<T>(props: SortableListProps<T>) {
  const { data, keyExtractor, renderItem, onReorder } = props;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = data.findIndex((item) => keyExtractor(item) === active.id);
      const newIndex = data.findIndex((item) => keyExtractor(item) === over.id);
      const newData = arrayMove(data, oldIndex, newIndex);
      onReorder(newData);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={data.map(keyExtractor)} strategy={verticalListSortingStrategy}>
        {data.map((item, index) => (
          <SortableItem key={keyExtractor(item)} id={keyExtractor(item)} item={item} index={index} renderItem={renderItem} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
