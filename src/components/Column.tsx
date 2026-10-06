import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UnifiedTask, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';


interface ColumnProps {
  status: TaskStatus;
  title: string;
  tasks: UnifiedTask[];
}

export const Column: React.FC<ColumnProps> = ({ status, title, tasks }) => {
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
        return 'bg-sky-400';
      case 'in_progress':
        return 'bg-rose-400';
      case 'done':
        return 'bg-emerald-400';
    }
  };

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 rounded-xl bg-slate-50 border transition-all duration-200 overflow-hidden min-w-[260px] ${
        isOver
          ? 'border-indigo-400 shadow-inner'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between p-3 text-white ${getHeaderColor()}`}>
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-semibold tracking-wide uppercase">
            {title}
          </h2>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-black/10">
          {tasks.length}
        </span>
      </div>

      {/* Task List Drop Zone */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-145px)]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 text-[11px]">
              Drop task here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
