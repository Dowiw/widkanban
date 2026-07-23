import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTaskStore } from '../store/useTaskStore';
import { UnifiedTask, TaskStatus } from '../types/task';
import { Column } from './Column';
import { TaskCard } from './TaskCard';

export const KanbanBoard: React.FC = () => {
  const { tasks, moveTask, searchQuery, filterSource } = useTaskStore();
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require moving 5px before drag starts to prevent accidental click hijacking
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks based on search & provider filter
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' || task.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Is over a column container or another card?
    const isOverAColumn = ['todo', 'in_progress', 'done'].includes(overId);
    
    if (isOverAColumn) {
      const newStatus = overId as TaskStatus;
      if (activeTaskItem.status !== newStatus) {
        moveTask(activeId, newStatus);
      }
    } else {
      // Over another task card
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem && activeTaskItem.status !== overTaskItem.status) {
        moveTask(activeId, overTaskItem.status);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    const overTaskItem = tasks.find((t) => t.id === overId);

    if (activeTaskItem && overTaskItem && activeId !== overId) {
      const sameStatusTasks = tasks.filter((t) => t.status === overTaskItem.status);
      const overIndex = sameStatusTasks.findIndex((t) => t.id === overId);
      moveTask(activeId, overTaskItem.status, overIndex);
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 p-3 flex flex-col md:flex-row gap-3 overflow-x-auto overflow-y-hidden">
        <Column status="todo" title="To Do" tasks={todoTasks} />
        <Column status="in_progress" title="In Progress" tasks={inProgressTasks} />
        <Column status="done" title="Done" tasks={doneTasks} />
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};
