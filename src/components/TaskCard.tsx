import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UnifiedTask, GitHubLabel, SubtaskItem } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { 
  CheckSquare, 
  ExternalLink, 
  Trash2, 
  Calendar,
  GripVertical,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  Target,
  Mail,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Check,
  Tag
} from 'lucide-react';

interface TaskCardProps {
  task: UnifiedTask;
  isOverlay?: boolean;
}

function getSmartDueDate(dueDateStr?: string): { label: string; urgency: 'overdue' | 'today' | 'upcoming' } | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return { label: dueDateStr, urgency: 'upcoming' };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const formatted = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label: `Overdue · ${formatted}`, urgency: 'overdue' };
  } else if (diffDays === 0) {
    return { label: 'Today', urgency: 'today' };
  } else if (diffDays === 1) {
    return { label: 'Tomorrow', urgency: 'upcoming' };
  } else {
    const formatted = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label: formatted, urgency: 'upcoming' };
  }
}

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#1e293b';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isOverlay = false }) => {
  const { deleteTask } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task },
    animateLayoutChanges: () => false,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || isOverlay ? 'none' : transition || undefined,
  };

  const isGitHub = task.source === 'github';
  const smartDue = getSmartDueDate(task.sourceMeta?.dueDate);

  const handleOpenUrl = (e: React.MouseEvent, urlToOpen?: string) => {
    e.stopPropagation();
    window.open(urlToOpen || task.url, '_blank');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleToggleSubtasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubtasksOpen((prev) => !prev);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-glass group relative rounded-xl p-3 shadow-sm select-none transition-all ${
        isDragging ? 'opacity-20 border-dashed border-indigo-400/40' : ''
      } ${isOverlay ? 'drag-active z-50' : ''}`}
    >
      {/* Top Source Badge & Action Buttons */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
            title="Drag task card"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Provider Badge */}
          {isGitHub ? (
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border truncate ${
                task.sourceMeta?.isPullRequest
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={task.sourceMeta?.repo ? `${task.sourceMeta.repo}#${task.sourceMeta.issueNumber}` : 'GitHub'}
            >
              {task.sourceMeta?.isPullRequest ? (
                <GitPullRequest className="h-2.5 w-2.5 shrink-0 text-purple-600" />
              ) : (
                <CircleDot className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
              )}
              <span className="truncate">
                {task.sourceMeta?.repo
                  ? `${task.sourceMeta.repo}#${task.sourceMeta.issueNumber}`
                  : task.sourceMeta?.isPullRequest
                  ? 'Pull Request'
                  : 'Issue'}
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 truncate"
              title={task.sourceMeta?.listTitle || 'Google Tasks'}
            >
              <CheckSquare className="h-2.5 w-2.5 shrink-0 text-blue-600" />
              <span className="truncate">{task.sourceMeta?.listTitle || 'Google Task'}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleExpand}
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={handleOpenUrl}
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="Open in Browser"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Task Title */}
      <h3
        onClick={handleToggleExpand}
        className={`text-xs font-medium text-slate-800 leading-relaxed cursor-pointer hover:text-indigo-600 transition-colors ${
          isExpanded ? 'mb-2' : 'line-clamp-2 mb-2'
        }`}
      >
        {task.title}
      </h3>

      {/* Quick Micro-Badges Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
        {/* --- GOOGLE TASKS MICRO-BADGES --- */}
        {!isGitHub && (
          <>
            {/* Smart Due Date */}
            {smartDue && (
              <span
                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-medium border ${
                  smartDue.urgency === 'overdue'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : smartDue.urgency === 'today'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                <Calendar className="h-2.5 w-2.5" />
                <span>{smartDue.label}</span>
              </span>
            )}

            {/* Direct Deep-Link Buttons (e.g. Gmail / Calendar) */}
            {task.sourceMeta?.links?.map((linkItem, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleOpenUrl(e, linkItem.link)}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title={linkItem.description || linkItem.link}
              >
                {linkItem.linkType === 'email' ? (
                  <Mail className="h-2.5 w-2.5 text-rose-500" />
                ) : linkItem.linkType === 'calendar' ? (
                  <Calendar className="h-2.5 w-2.5 text-blue-500" />
                ) : (
                  <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                )}
                <span>{linkItem.linkType === 'email' ? 'Gmail' : linkItem.linkType === 'calendar' ? 'Calendar' : 'Link'}</span>
              </button>
            ))}

            {/* Subtask Dropdown Toggle */}
            {task.sourceMeta?.hasSubtasks && (
              <button
                type="button"
                onClick={handleToggleSubtasks}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium transition-colors"
                title="View subtasks"
              >
                <CornerDownRight className="h-2.5 w-2.5" />
                <span>
                  {task.sourceMeta.subtaskCount} subtask{task.sourceMeta.subtaskCount === 1 ? '' : 's'} {isSubtasksOpen ? '▴' : '▾'}
                </span>
              </button>
            )}
          </>
        )}

        {/* --- GITHUB MICRO-BADGES --- */}
        {isGitHub && (
          <>
            {/* Native GitHub Labels */}
            {task.sourceMeta?.labels?.map((label: GitHubLabel, idx: number) => {
              const bg = label.color ? `#${label.color.replace('#', '')}` : '#e2e8f0';
              const text = label.color ? getContrastTextColor(label.color) : '#1e293b';
              return (
                <span
                  key={idx}
                  style={{ backgroundColor: bg, color: text }}
                  className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-medium shadow-2xs"
                  title={label.description || label.name}
                >
                  <Tag className="h-2 w-2 opacity-70" />
                  <span>{label.name}</span>
                </span>
              );
            })}

            {/* Comment Count Chip */}
            {typeof task.sourceMeta?.commentsCount === 'number' && task.sourceMeta.commentsCount > 0 && (
              <span
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                title={`${task.sourceMeta.commentsCount} comments`}
              >
                <MessageSquare className="h-2.5 w-2.5 text-slate-500" />
                <span>{task.sourceMeta.commentsCount}</span>
              </span>
            )}

            {/* Milestone Chip */}
            {task.sourceMeta?.milestone && (
              <span
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium truncate max-w-[120px]"
                title={`Milestone: ${task.sourceMeta.milestone.title}`}
              >
                <Target className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                <span className="truncate">{task.sourceMeta.milestone.title}</span>
              </span>
            )}

            {/* Assignee Avatars Stack */}
            {task.sourceMeta?.assignees && task.sourceMeta.assignees.length > 0 && (
              <div className="flex items-center -space-x-1 ml-auto shrink-0 pl-1">
                {task.sourceMeta.assignees.slice(0, 3).map((assignee, idx) => (
                  <img
                    key={idx}
                    src={assignee.avatarUrl}
                    alt={assignee.login}
                    title={`Assigned to @${assignee.login}`}
                    className="h-4 w-4 rounded-full ring-1 ring-white object-cover"
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* --- SUBTASKS DROPDOWN ACCORDION --- */}
      {isSubtasksOpen && task.sourceMeta?.subtasks && task.sourceMeta.subtasks.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/70 space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Subtasks ({task.sourceMeta.subtasks.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
            {task.sourceMeta.subtasks.map((st: SubtaskItem) => (
              <div
                key={st.id}
                className="flex items-center space-x-1.5 text-[11px] p-1 rounded bg-slate-50/80 border border-slate-100"
              >
                <span
                  className={`h-3 w-3 rounded flex items-center justify-center shrink-0 ${
                    st.status === 'done'
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-300 bg-white'
                  }`}
                >
                  {st.status === 'done' && <Check className="h-2 w-2 stroke-[3]" />}
                </span>
                <span
                  className={`truncate ${
                    st.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {st.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- CLICK-TO-EXPAND DETAILS DRAWER --- */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-2 text-[11px] text-slate-600 animate-in fade-in duration-150">
          {/* Provider Specific Details Header */}
          {!isGitHub && task.sourceMeta?.listId && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>List: <strong className="text-slate-600">{task.sourceMeta.listTitle || 'Default'}</strong></span>
              <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded">ID: {task.sourceMeta.listId}</span>
            </div>
          )}

          {isGitHub && task.sourceMeta?.author && (
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
              <img
                src={task.sourceMeta.author.avatarUrl}
                alt={task.sourceMeta.author.login}
                className="h-3.5 w-3.5 rounded-full object-cover"
              />
              <span>Opened by <strong className="text-slate-700">@{task.sourceMeta.author.login}</strong></span>
            </div>
          )}

          {/* Formatted Notes / Markdown Body Snippet */}
          {(task.description || task.sourceMeta?.notes) && (
            <div className="rounded-lg bg-slate-50/90 border border-slate-200/60 p-2 text-[11px] text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text font-sans">
              {task.description || task.sourceMeta?.notes}
            </div>
          )}

          {/* Target Milestone Due Date if available */}
          {isGitHub && task.sourceMeta?.milestone?.dueOn && (
            <div className="text-[10px] text-slate-400">
              Milestone deadline: <span className="text-slate-600">{new Date(task.sourceMeta.milestone.dueOn).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
