import React from 'react';
import { useTaskStore } from '../store/useTaskStore';
import {
  Trash2,
  RotateCcw,
  X,
  CircleDot,
  GitPullRequest,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

export const LocallyDeletedDropdown: React.FC = () => {
  const {
    isTrashDropdownOpen,
    setTrashDropdownOpen,
    locallyDeletedTasks,
    restoreLocallyDeletedTask,
    clearLocallyDeletedTasks,
  } = useTaskStore();

  if (!isTrashDropdownOpen) return null;

  return (
    <div className="absolute right-2 top-11 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <Trash2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Hidden Tasks ({locallyDeletedTasks.length})
          </span>
        </div>
        <button
          onClick={() => setTrashDropdownOpen(false)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task List */}
      {locallyDeletedTasks.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <Sparkles className="h-5 w-5 mx-auto text-slate-300 dark:text-slate-600" />
          <p>No locally hidden tasks</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
          {locallyDeletedTasks.map((task) => {
            const isGitHub = task.source === 'github';
            const isPR = task.sourceMeta?.isPullRequest;
            const repo = task.sourceMeta?.repo;
            const issueNumber = task.sourceMeta?.issueNumber;

            return (
              <div
                key={task.id}
                className="flex items-start justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="min-w-0 pr-2 space-y-0.5">
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {isGitHub ? (
                      isPR ? (
                        <GitPullRequest className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      ) : (
                        <CircleDot className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )
                    ) : (
                      <CheckSquare className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    <span className="truncate font-mono">
                      {repo && issueNumber
                        ? `${repo}#${issueNumber}`
                        : task.source === 'google_tasks'
                        ? task.sourceMeta?.listTitle || 'Google Tasks'
                        : task.source}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                  </div>

                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate" title={task.title}>
                    {task.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => restoreLocallyDeletedTask(task.id)}
                  title="Restore to board"
                  className="shrink-0 flex items-center space-x-1 p-1 px-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-slate-650 shadow-2xs text-[10px] font-medium transition-all"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Restore</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      {locallyDeletedTasks.length > 0 && (
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Hidden from active board
          </span>
          <button
            type="button"
            onClick={clearLocallyDeletedTasks}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium hover:underline text-[10px]"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};
