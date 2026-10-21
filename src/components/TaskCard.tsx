import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UnifiedTask, GitHubLabel, SubtaskItem } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { getSmartDueDate } from '../utils/deadline';
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
  Tag,
  GitBranch,
  GitFork,
  Clock,
  AlertCircle,
  X,
  CalendarPlus
} from 'lucide-react';

interface TaskCardProps {
  task: UnifiedTask;
  isOverlay?: boolean;
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
  const {
    openDeleteModal,
    deleteTaskLocally,
    deletePreference,
    closeGitHubIssueOnRemote,
    deleteGitHubIssuePermanentlyOnRemote,
    updateGitHubDeadline,
    customization,
  } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [deadlineType, setDeadlineType] = useState<'deadline' | 'review'>(
    (task.sourceMeta?.deadlineType as 'deadline' | 'review') || 'deadline'
  );

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
    borderRadius: 'var(--card-radius, 8px)',
  };

  const isGitHub = task.source === 'github';
  const smartDue = getSmartDueDate(task.sourceMeta?.dueDate, task.status);

  const getPresetDate = (preset: 'today' | 'tomorrow' | 'in3days' | 'nextMonday'): string => {
    const d = new Date();
    if (preset === 'today') {
      d.setHours(23, 59, 59, 999);
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
    } else if (preset === 'in3days') {
      d.setDate(d.getDate() + 3);
      d.setHours(23, 59, 59, 999);
    } else if (preset === 'nextMonday') {
      const day = d.getDay();
      const daysUntilNextMonday = ((7 - day + 1) % 7) || 7;
      d.setDate(d.getDate() + daysUntilNextMonday);
      d.setHours(23, 59, 59, 999);
    }
    return d.toISOString();
  };

  const handleSetDeadline = async (isoDate: string | null, type?: string) => {
    if (!task.sourceMeta?.repo || !task.sourceMeta?.issueNumber) return;
    setShowDeadlinePicker(false);
    await updateGitHubDeadline(
      task.id,
      task.sourceMeta.repo,
      task.sourceMeta.issueNumber,
      Boolean(task.sourceMeta.isPullRequest),
      isoDate,
      type || deadlineType
    );
  };

  const handleOpenUrl = (e: React.MouseEvent, urlToOpen?: string) => {
    e.stopPropagation();
    window.open(urlToOpen || task.url, '_blank');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (deletePreference?.remember) {
      if (deletePreference.action === 'local' || !isGitHub) {
        deleteTaskLocally(task.id);
        return;
      }
      if (deletePreference.action === 'github_close' && task.sourceMeta?.repo && task.sourceMeta?.issueNumber) {
        const res = await closeGitHubIssueOnRemote(task.sourceMeta.repo, task.sourceMeta.issueNumber);
        if (res.success) {
          deleteTaskLocally(task.id);
        } else {
          openDeleteModal(task);
        }
        return;
      }
      if (deletePreference.action === 'github_permanent' && task.sourceMeta?.repo && task.sourceMeta?.issueNumber) {
        const res = await deleteGitHubIssuePermanentlyOnRemote(task.sourceMeta.repo, task.sourceMeta.issueNumber);
        if (res.success) {
          deleteTaskLocally(task.id);
        } else {
          openDeleteModal(task);
        }
        return;
      }
    }

    openDeleteModal(task);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleToggleSubtasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubtasksOpen((prev) => !prev);
  };

  const densityPadding =
    customization.cardDensity === 'compact'
      ? 'p-2'
      : customization.cardDensity === 'relaxed'
      ? 'p-4'
      : 'p-3';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-glass group relative shadow-sm select-none transition-all ${densityPadding} ${
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
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 shrink-0"
            title="Drag task card"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Provider Badge */}
          {isGitHub ? (
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border truncate ${
                task.sourceMeta?.isPullRequest
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
              }`}
              title={task.sourceMeta?.repo ? `${task.sourceMeta.repo}#${task.sourceMeta.issueNumber}` : 'GitHub'}
            >
              {task.sourceMeta?.isPullRequest ? (
                <GitPullRequest className="h-2.5 w-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
              ) : (
                <CircleDot className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 truncate"
              title={task.sourceMeta?.listTitle || 'Google Tasks'}
            >
              <CheckSquare className="h-2.5 w-2.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{task.sourceMeta?.listTitle || 'Google Task'}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* GitHub Set Deadline Button */}
          {isGitHub && task.sourceMeta?.repo && task.sourceMeta?.issueNumber && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeadlinePicker((prev) => !prev);
                }}
                className={`p-1 rounded transition-colors ${
                  task.sourceMeta?.dueDate
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                    : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={task.sourceMeta?.dueDate ? `Edit Deadline (${smartDue?.formattedExact || task.sourceMeta.dueDate})` : "Set Deadline"}
              >
                <CalendarPlus className="h-3 w-3" />
              </button>

              {/* Deadline Picker Popover */}
              {showDeadlinePicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 z-50 w-56 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-[11px] animate-in fade-in zoom-in-95 duration-100 text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-xs">
                      {task.sourceMeta?.isPullRequest ? 'PR Review Due' : 'Issue Deadline'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeadlinePicker(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Deadline Type toggle */}
                  <div className="grid grid-cols-2 gap-1 my-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDeadlineType('deadline')}
                      className={`py-0.5 rounded text-[10px] font-medium transition-colors ${
                        deadlineType === 'deadline'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Task Due
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlineType('review')}
                      className={`py-0.5 rounded text-[10px] font-medium transition-colors ${
                        deadlineType === 'review'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Review Due
                    </button>
                  </div>

                  {/* Presets */}
                  <div className="space-y-0.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSetDeadline(getPresetDate('today'))}
                      className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]"
                    >
                      <span>Today</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">23:59</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDeadline(getPresetDate('tomorrow'))}
                      className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]"
                    >
                      <span>Tomorrow</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">+1d</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDeadline(getPresetDate('in3days'))}
                      className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]"
                    >
                      <span>In 3 Days</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">+3d</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDeadline(getPresetDate('nextMonday'))}
                      className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px]"
                    >
                      <span>Next Monday</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">Mon</span>
                    </button>
                  </div>

                  {/* Custom Date Input */}
                  <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] text-slate-400 uppercase font-semibold block mb-1">Custom Date</span>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-1.5 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 mb-1"
                    />
                    {customDate && (
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(customDate);
                          d.setHours(23, 59, 59, 999);
                          handleSetDeadline(d.toISOString());
                        }}
                        className="w-full py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] transition-colors"
                      >
                        Apply Date
                      </button>
                    )}
                  </div>

                  {/* Clear option if already set */}
                  {task.sourceMeta?.dueDate && (
                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSetDeadline(null)}
                        className="w-full py-1 text-center text-[10px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors font-medium"
                      >
                        Clear Deadline
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleToggleExpand}
            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={handleOpenUrl}
            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open in Browser"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Task Title */}
      <h3
        onClick={handleToggleExpand}
        className={`text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
          isExpanded ? 'mb-2' : 'line-clamp-2 mb-2'
        }`}
      >
        {task.title}
      </h3>

      {/* Quick Micro-Badges Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
        {/* Universal Smart Due Date Urgency Badge */}
        {smartDue && (
          <span
            title={`Deadline: ${smartDue.formattedExact} (${smartDue.relativeText})`}
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-medium border text-[10px] shadow-2xs transition-all ${
              smartDue.urgency === 'overdue'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
                : smartDue.urgency === 'today'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/70'
                : smartDue.urgency === 'completed'
                ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/70'
            }`}
          >
            {smartDue.urgency === 'overdue' ? (
              <AlertCircle className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : smartDue.urgency === 'today' ? (
              <Clock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : smartDue.urgency === 'completed' ? (
              <Check className="h-2.5 w-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
            ) : (
              <Calendar className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <span>{smartDue.label}</span>
            {task.sourceMeta?.deadlineType === 'review' && (
              <span className="text-[9px] uppercase tracking-wider opacity-75 font-mono">review</span>
            )}
          </span>
        )}

        {/* --- GOOGLE TASKS MICRO-BADGES --- */}
        {!isGitHub && (
          <>

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

            {/* PR Branch Comparison Chip */}
            {task.sourceMeta?.branchInfo && (
              <span
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-mono truncate max-w-[150px]"
                title={`Comparing ${task.sourceMeta.branchInfo.headRef} into ${task.sourceMeta.branchInfo.baseRef}`}
              >
                <GitBranch className="h-2.5 w-2.5 text-purple-600 shrink-0" />
                <span className="truncate">{task.sourceMeta.branchInfo.headRef}</span>
                <span className="text-purple-400 font-sans">→</span>
                <span className="truncate">{task.sourceMeta.branchInfo.baseRef}</span>
              </span>
            )}

            {/* PR Draft Badge */}
            {task.sourceMeta?.branchInfo?.isDraft && (
              <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-medium">
                Draft
              </span>
            )}

            {/* PR Fork Badge */}
            {task.sourceMeta?.branchInfo?.isFork && task.sourceMeta.branchInfo.headRepo && (
              <span
                className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] truncate max-w-[100px]"
                title={`From fork: ${task.sourceMeta.branchInfo.headRepo}`}
              >
                <GitFork className="h-2 w-2 text-amber-600 shrink-0" />
                <span className="truncate">fork</span>
              </span>
            )}

            {/* PR Diff Stats */}
            {task.sourceMeta?.branchInfo &&
              (task.sourceMeta.branchInfo.additions !== undefined ||
                task.sourceMeta.branchInfo.deletions !== undefined) && (
                <span className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded bg-slate-50 border border-slate-200 font-mono text-[9px]">
                  <span className="text-emerald-600 font-medium">
                    +{task.sourceMeta.branchInfo.additions || 0}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-rose-600 font-medium">
                    -{task.sourceMeta.branchInfo.deletions || 0}
                  </span>
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

          {/* PR Branch Comparison Details */}
          {isGitHub && task.sourceMeta?.branchInfo && (
            <div className="rounded-lg bg-purple-50/70 border border-purple-200/60 p-2 text-[10.5px] text-purple-900 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="flex items-center space-x-1 truncate mr-1">
                  <GitBranch className="h-3 w-3 text-purple-600 shrink-0" />
                  <span className="font-semibold text-purple-800 truncate" title={task.sourceMeta.branchInfo.headRef}>
                    {task.sourceMeta.branchInfo.headRef}
                  </span>
                  <span className="text-purple-400 shrink-0">into</span>
                  <span className="font-semibold text-purple-800 truncate" title={task.sourceMeta.branchInfo.baseRef}>
                    {task.sourceMeta.branchInfo.baseRef}
                  </span>
                </span>
                {task.sourceMeta.branchInfo.isDraft && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-sans font-bold shrink-0">
                    Draft PR
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-purple-700/80 pt-1 border-t border-purple-200/40">
                <span className="truncate">
                  {task.sourceMeta.branchInfo.isFork
                    ? `Fork: ${task.sourceMeta.branchInfo.headRepo}`
                    : 'Same repository'}
                </span>
                <span className="shrink-0 ml-1">
                  {task.sourceMeta.branchInfo.changedFiles !== undefined && (
                    <span>{task.sourceMeta.branchInfo.changedFiles} files · </span>
                  )}
                  <span className="text-emerald-700 font-mono font-medium">
                    +{task.sourceMeta.branchInfo.additions || 0}
                  </span>
                  {' / '}
                  <span className="text-rose-700 font-mono font-medium">
                    -{task.sourceMeta.branchInfo.deletions || 0}
                  </span>
                </span>
              </div>
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
