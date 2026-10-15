import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { DeleteActionType } from '../types/task';
import {
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  GitPullRequest,
  CircleDot,
  RefreshCw,
  Archive,
} from 'lucide-react';

export const DeleteTaskModal: React.FC = () => {
  const {
    deleteModalTask,
    closeDeleteModal,
    deleteTaskLocally,
    closeGitHubIssueOnRemote,
    deleteGitHubIssuePermanentlyOnRemote,
    setDeletePreference,
  } = useTaskStore();

  const [mode, setMode] = useState<'local' | 'github'>('local');
  const [githubMode, setGithubMode] = useState<'close' | 'permanent'>('close');
  const [reason, setReason] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateNumber, setDuplicateNumber] = useState('');
  const [rememberChoice, setRememberChoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!deleteModalTask) return null;

  const isGitHub = deleteModalTask.source === 'github';
  const repo = deleteModalTask.sourceMeta?.repo || '';
  const issueNumber = deleteModalTask.sourceMeta?.issueNumber;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    let chosenAction: DeleteActionType = 'local';

    if (mode === 'local' || !isGitHub) {
      chosenAction = 'local';
      deleteTaskLocally(deleteModalTask.id);
    } else if (githubMode === 'close') {
      chosenAction = 'github_close';
      if (repo && issueNumber) {
        const dupNum = isDuplicate && duplicateNumber.trim() ? parseInt(duplicateNumber.trim(), 10) : undefined;
        const res = await closeGitHubIssueOnRemote(
          repo,
          issueNumber,
          reason.trim() || undefined,
          isNaN(dupNum as number) ? undefined : dupNum
        );
        if (!res.success) {
          setErrorMessage(res.error || `Failed to close issue ${repo}#${issueNumber} on GitHub.`);
          setIsSubmitting(false);
          return;
        }
      }
      deleteTaskLocally(deleteModalTask.id);
    } else {
      chosenAction = 'github_permanent';
      if (repo && issueNumber) {
        const res = await deleteGitHubIssuePermanentlyOnRemote(repo, issueNumber);
        if (!res.success) {
          setErrorMessage(
            res.error ||
              `Failed to permanently delete ${repo}#${issueNumber}. You must have Repository Admin/Owner permissions.`
          );
          setIsSubmitting(false);
          return;
        }
      }
      deleteTaskLocally(deleteModalTask.id);
    }

    if (rememberChoice) {
      setDeletePreference({
        action: chosenAction,
        remember: true,
      });
    }

    setIsSubmitting(false);
    closeDeleteModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-2xl p-4 space-y-3.5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Delete Task
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose how to remove this item
              </p>
            </div>
          </div>
          <button
            onClick={closeDeleteModal}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task Preview Card */}
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-xs space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-200">
            {isGitHub ? (
              deleteModalTask.sourceMeta?.isPullRequest ? (
                <GitPullRequest className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              ) : (
                <CircleDot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )
            ) : (
              <Archive className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span className="truncate">
              {repo && issueNumber ? `${repo}#${issueNumber}` : deleteModalTask.source}
            </span>
          </div>
          <p className="text-[11px] text-slate-800 dark:text-slate-100 font-medium line-clamp-2">
            {deleteModalTask.title}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
            {errorMessage}
          </div>
        )}

        {/* Deletion Mode Selection */}
        {isGitHub ? (
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
              Deletion Scope
            </label>

            {/* Option 1: Local only */}
            <label
              className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                mode === 'local'
                  ? 'border-indigo-600 bg-indigo-50 text-slate-900 dark:bg-indigo-950/70 dark:text-slate-100 dark:border-indigo-500 ring-2 ring-indigo-500/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <input
                type="radio"
                name="delete-mode"
                checked={mode === 'local'}
                onChange={() => setMode('local')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs block text-slate-800 dark:text-slate-100">
                  Delete Locally Only
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block">
                  Hides the issue from the WidKanban board. The issue remains unchanged on GitHub. You can view or restore it anytime from the Trash icon in the header.
                </span>
              </div>
            </label>

            {/* Option 2: Remote GitHub deletion */}
            <label
              className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                mode === 'github'
                  ? 'border-rose-600 bg-rose-50 text-slate-900 dark:bg-rose-950/70 dark:text-slate-100 dark:border-rose-500 ring-2 ring-rose-500/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <input
                type="radio"
                name="delete-mode"
                checked={mode === 'github'}
                onChange={() => setMode('github')}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs block text-rose-700 dark:text-rose-400 flex items-center space-x-1">
                  <span>Delete on GitHub Repository</span>
                  <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block">
                  Modifies the issue on GitHub directly, closing it or permanently deleting it.
                </span>
              </div>
            </label>

            {/* GitHub Specific Configuration */}
            {mode === 'github' && (
              <div className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/40 space-y-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center space-x-3 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gh-action"
                      checked={githubMode === 'close'}
                      onChange={() => setGithubMode('close')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Close as Not Planned</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gh-action"
                      checked={githubMode === 'permanent'}
                      onChange={() => setGithubMode('permanent')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-rose-700 dark:text-rose-400">Permanently Delete</span>
                  </label>
                </div>

                {githubMode === 'close' ? (
                  <div className="space-y-2 pt-1 border-t border-rose-200/80 dark:border-rose-900/60">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Closing Reason (Optional Comment)
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Won't fix, out of scope, obsolete..."
                        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1 px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={isDuplicate}
                          onChange={(e) => setIsDuplicate(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Mark as duplicate of another issue</span>
                      </label>

                      {isDuplicate && (
                        <div className="flex items-center space-x-1.5 pl-5">
                          <span className="text-slate-500 text-xs font-mono">#</span>
                          <input
                            type="number"
                            value={duplicateNumber}
                            onChange={(e) => setDuplicateNumber(e.target.value)}
                            placeholder="e.g. 42"
                            className="w-24 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1 px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-rose-100/70 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="font-semibold flex items-center space-x-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Permanent Deletion (Admin Only)</span>
                    </div>
                    <p className="leading-tight text-rose-700 dark:text-rose-300">
                      This will permanently remove the issue and its comments from GitHub via GraphQL. This action cannot be undone. Requires repository admin permissions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-[11px] text-slate-600 dark:text-slate-300">
            This task will be hidden locally on WidKanban and saved in your Trash dropdown.
          </div>
        )}

        {/* Remember Choice Checkbox */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 text-xs">
          <input
            type="checkbox"
            id="remember-delete-pref"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="remember-delete-pref" className="text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
            Remember my choice and don't ask again
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm transition-all ${
              mode === 'github' && githubMode === 'permanent'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>
                  {mode === 'local'
                    ? 'Hide Locally'
                    : githubMode === 'close'
                    ? 'Close & Remove'
                    : 'Permanently Delete'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
