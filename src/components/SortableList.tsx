"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (next: T[]) => void;
  /** Hide the drag handle for a row (e.g. while it is being edited). */
  isLocked?: (item: T) => boolean;
  rowClassName?: string;
  children: (item: T, index: number, handle: ReactNode) => ReactNode;
};

/** Vertical list whose rows can be dragged up/down by a grip handle (mouse, touch or keyboard). */
export default function SortableList<T extends { id: string }>({ items, onReorder, isLocked, rowClassName, children }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableRow key={item.id} id={item.id} locked={isLocked?.(item) ?? false} className={rowClassName}>
            {(handle) => children(item, index, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  locked,
  className,
  children,
}: {
  id: string;
  locked: boolean;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });

  const handle = locked ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      title="Drag to move up or down"
      aria-label="Drag to move up or down"
      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 touch-none shrink-0"
    >
      <GripVertical size={18} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${className ?? ""} ${isDragging ? "relative z-10 shadow-lg ring-2 ring-orange-300 opacity-90" : ""}`}
    >
      {children(handle)}
    </div>
  );
}
