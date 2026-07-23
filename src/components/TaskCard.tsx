import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UnifiedTask } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { 
  Github, 
  CheckSquare, 
  ExternalLink, 
  Trash2, 
  Tag, 
  Calendar,
  GripVertical
} from 'lucide-react';

interface TaskCardProps {
  task: UnifiedTask;
  isOverlay?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isOverlay = false }) => {
  const { deleteTask } = useTaskStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const isGitHub = task.source === 'github';

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(task.url, '_blank');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-glass group relative rounded-xl p-3 shadow-sm select-none ${
        isDragging ? 'opacity-30 border-dashed border-indigo-400' : ''
      } ${isOverlay ? 'drag-active cursor-grabbing z-50' : 'hover:border-slate-600'}`}
    >
      {/* Top Source Badge & Drag Grip */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5"
            title="Drag task card"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Provider Badge */}
          {isGitHub ? (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Github className="h-2.5 w-2.5" />
              <span>{task.sourceMeta?.repo ? `${task.sourceMeta.repo}#${task.sourceMeta.issueNumber}` : 'Issue'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckSquare className="h-2.5 w-2.5" />
              <span>{task.sourceMeta?.listId || 'Google Task'}</span>
            </span>
          )}
        </div>

        {/* External Link & Action Hover Buttons */}
        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleOpenUrl}
            className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
            title="Open in Browser"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed mb-2">
        {task.title}
      </h3>

      {/* Footer Meta (Labels / Due Dates) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
        {/* GitHub Labels */}
        {isGitHub && task.sourceMeta?.labels?.map((label: string, idx: number) => (
          <span
            key={idx}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-white/5"
          >
            <Tag className="h-2.5 w-2.5 text-indigo-400" />
            <span>{label}</span>
          </span>
        ))}

        {/* Google Task Due Date */}
        {!isGitHub && task.sourceMeta?.dueDate && (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-500/20">
            <Calendar className="h-2.5 w-2.5" />
            <span>{task.sourceMeta.dueDate}</span>
          </span>
        )}
      </div>
    </div>
  );
};
