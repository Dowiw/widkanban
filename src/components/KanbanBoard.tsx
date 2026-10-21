import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTaskStore } from '../store/useTaskStore';
import { UnifiedTask, TaskStatus } from '../types/task';
import { Column } from './Column';
import { TaskCard } from './TaskCard';

export const KanbanBoard: React.FC = () => {
  const { tasks, columns, moveTask, searchQuery, filterSource } = useTaskStore();
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);

  // MouseSensor provides significantly higher FPS and zero input latency in Tauri/WebKit
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || task.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    const isColumn = columns.some((col) => col.id === overId);

    if (isColumn) {
      const targetStatus = overId as TaskStatus;
      if (activeTaskItem.status !== targetStatus) {
        moveTask(activeId, targetStatus);
      }
    } else {
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem) {
        const sameStatusTasks = tasks.filter((t) => t.status === overTaskItem.status);
        const overIndex = sameStatusTasks.findIndex((t) => t.id === overId);
        moveTask(activeId, overTaskItem.status, overIndex >= 0 ? overIndex : undefined);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 p-3 flex flex-col md:flex-row gap-3 overflow-x-auto overflow-y-hidden">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={filteredTasks.filter((t) => t.status === col.id)}
          />
        ))}
      </div>

      {/* Zero dropAnimation delay for instant feedback */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};
