import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UnifiedTask, TaskStatus } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  title: string;
  tasks: UnifiedTask[];
}

export const Column: React.FC<ColumnProps> = ({ status, title, tasks }) => {
  const { customization } = useTaskStore();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  const getHeaderColor = () => {
    switch (status) {
      case 'todo':
        return 'bg-sky-500 dark:bg-sky-600';
      case 'in_progress':
        return 'bg-rose-500 dark:bg-rose-600';
      case 'done':
        return 'bg-emerald-500 dark:bg-emerald-600';
    }
  };

  const taskIds = tasks.map((t) => t.id);

  const headerFontSizeClass =
    customization.columnHeaderFontSize === 'sm'
      ? 'text-sm'
      : customization.columnHeaderFontSize === 'base'
      ? 'text-base'
      : 'text-xs';

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 'var(--col-radius, 12px)',
        minWidth: `${customization.columnMinWidth || 260}px`,
      }}
      className={`flex flex-col flex-1 shrink-0 w-[85vw] sm:w-auto snap-center bg-slate-50 dark:bg-slate-900/60 border transition-all duration-200 overflow-hidden ${
        isOver
          ? 'border-indigo-400 dark:border-indigo-500 shadow-inner'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Column Header */}
      <div 
        style={{ minHeight: `${customization.columnHeaderHeight || 36}px` }}
        className={`flex items-center justify-between px-3 py-1.5 text-white ${getHeaderColor()}`}
      >
        <div className="flex items-center space-x-2">
          <h2 className={`${headerFontSizeClass} font-semibold tracking-wide uppercase`}>
            {title}
          </h2>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-black/15 text-white/95">
          {tasks.length}
        </span>
      </div>

      {/* Task List Drop Zone */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-145px)]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[11px]">
              Drop task here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
