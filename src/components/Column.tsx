import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UnifiedTask, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';

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

  const getHeaderIcon = () => {
    switch (status) {
      case 'todo':
        return <Circle className="h-3.5 w-3.5 text-amber-400" />;
      case 'in_progress':
        return <Clock className="h-3.5 w-3.5 text-indigo-400" />;
      case 'done':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  const getHeaderBadge = () => {
    switch (status) {
      case 'todo':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'in_progress':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'done':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    }
  };

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 rounded-xl bg-slate-900/40 border transition-all duration-200 min-w-[260px] ${
        isOver
          ? 'border-indigo-500/60 bg-indigo-950/20 shadow-inner'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center space-x-2">
          {getHeaderIcon()}
          <h2 className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            {title}
          </h2>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getHeaderBadge()}`}>
          {tasks.length}
        </span>
      </div>

      {/* Task List Drop Zone */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-145px)]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-white/5 text-slate-500 text-[11px]">
              Drop task here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
