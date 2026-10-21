import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { GitHubDoneAction } from '../types/task';
import { CheckCircle2, Tag, EyeOff, X, Check } from 'lucide-react';

export const GitHubDoneModal: React.FC = () => {
  const {
    githubDoneModalTask,
    closeGithubDoneModal,
    executeGitHubDoneAction,
    githubSyncSettings,
  } = useTaskStore();

  const [remember, setRemember] = useState(false);
  const [selectedAction, setSelectedAction] = useState<GitHubDoneAction>('close');

  if (!githubDoneModalTask) return null;

  const repo = githubDoneModalTask.sourceMeta?.repo || 'repository';
  const issueNum = githubDoneModalTask.sourceMeta?.issueNumber;

  const handleConfirm = () => {
    executeGitHubDoneAction(githubDoneModalTask, selectedAction, remember);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4.5 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150 select-none"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold">Mark GitHub Issue as Done</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {repo}#{issueNum}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeGithubDoneModal}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Issue Title Preview */}
        <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug">
            {githubDoneModalTask.title}
          </span>
        </div>

        {/* Action Choices */}
        <div className="space-y-2 mb-3">
          <button
            type="button"
            onClick={() => setSelectedAction('close')}
            className={`w-full flex items-start space-x-2.5 p-2.5 rounded-xl text-left border transition-all ${
              selectedAction === 'close'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
              selectedAction === 'close' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block text-slate-800 dark:text-slate-100">
                Close on GitHub (Completed)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                Closes the remote issue as completed and removes in-progress label.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction('label')}
            className={`w-full flex items-start space-x-2.5 p-2.5 rounded-xl text-left border transition-all ${
              selectedAction === 'label'
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
              selectedAction === 'label' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Tag className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block text-slate-800 dark:text-slate-100">
                Apply '{githubSyncSettings.doneLabel || 'done'}' Label
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                Keeps issue open on GitHub, but tags it as completed.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction('local_only')}
            className={`w-full flex items-start space-x-2.5 p-2.5 rounded-xl text-left border transition-all ${
              selectedAction === 'local_only'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
              selectedAction === 'local_only' ? 'bg-slate-700 text-white dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <EyeOff className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block text-slate-800 dark:text-slate-100">
                Mark Done Locally Only
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                Moves card to Done in WidKanban without modifying GitHub.
              </span>
            </div>
          </button>
        </div>

        {/* Remember Choice Checkbox */}
        <label className="flex items-center space-x-2 mb-4 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 px-1">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
          />
          <span>Remember my choice and don't ask again</span>
        </label>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={closeGithubDoneModal}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 transition-all flex items-center space-x-1"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
