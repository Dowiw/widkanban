import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import {
  X,
  Github,
  Tag,
  Check,
  AlertCircle,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';

export const GitHubSetupModal: React.FC = () => {
  const {
    isGithubSetupOpen,
    setGithubSetupOpen,
    tasks,
    githubSyncSettings,
    setGithubSyncSettings,
    setupRepoLabels,
    syncLabelsWithHomeBoard,
  } = useTaskStore();

  const [manageLabels, setManageLabels] = useState(githubSyncSettings.manageLabels);
  const [todoLabel, setTodoLabel] = useState(githubSyncSettings.todoLabel);
  const [inProgressLabel, setInProgressLabel] = useState(githubSyncSettings.inProgressLabel);
  const [postCommentsFallback, setPostCommentsFallback] = useState(
    githubSyncSettings.postCommentsFallback
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [setupResults, setSetupResults] = useState<
    Record<string, { status: 'success' | 'error'; message: string }>
  >({});

  if (!isGithubSetupOpen) return null;

  // Extract unique repositories from loaded GitHub tasks
  const discoveredRepos = Array.from(
    new Set(
      tasks
        .filter((t) => t.source === 'github' && t.sourceMeta?.repo)
        .map((t) => t.sourceMeta.repo as string)
    )
  );

  const handleSaveSettingsOnly = async () => {
    setIsProcessing(true);
    setGithubSyncSettings({
      manageLabels,
      todoLabel: todoLabel.trim(),
      inProgressLabel: inProgressLabel.trim(),
      postCommentsFallback,
      hasPromptedSetup: true,
    });

    if (manageLabels) {
      await syncLabelsWithHomeBoard();
    }

    setIsProcessing(false);
    setGithubSetupOpen(false);
  };

  const handleSetupAllRepos = async () => {
    setIsProcessing(true);
    setGithubSyncSettings({
      manageLabels,
      todoLabel: todoLabel.trim(),
      inProgressLabel: inProgressLabel.trim(),
      postCommentsFallback,
      hasPromptedSetup: true,
    });

    const results: Record<string, { status: 'success' | 'error'; message: string }> = {};

    for (const repo of discoveredRepos) {
      try {
        const res = await setupRepoLabels(repo);
        if (res) {
          const created = res.createdLabels?.length > 0;
          results[repo] = {
            status: 'success',
            message: created
              ? `Created: ${res.createdLabels.join(', ')}`
              : `Found existing (${res.actualTodoLabel || 'none'}, ${res.actualInProgressLabel || 'none'})`,
          };
        } else {
          results[repo] = {
            status: 'error',
            message: 'Failed to access repository labels',
          };
        }
      } catch (err) {
        results[repo] = {
          status: 'error',
          message: err instanceof Error ? err.message : 'Error setting up repo',
        };
      }
    }

    setSetupResults(results);

    // Synchronize labels with the home board now that repos are configured
    if (manageLabels) {
      await syncLabelsWithHomeBoard();
    }

    setIsProcessing(false);

    // Auto-close after brief delay if all succeeded
    const hasErrors = Object.values(results).some((r) => r.status === 'error');
    if (!hasErrors) {
      setTimeout(() => {
        setGithubSetupOpen(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-2xl p-4 space-y-3.5 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-transparent dark:border-slate-700">
              <Github className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                GitHub Label Setup
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sync board columns with GitHub issue labels
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveSettingsOnly}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">Manage Issue Labels</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Update labels when moving between To Do & In Progress
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={manageLabels}
            onChange={(e) => setManageLabels(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Label Mapping Inputs */}
        {manageLabels && (
          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 p-2.5 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
              Column Labels (leave blank to omit)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  To Do Label
                </label>
                <input
                  type="text"
                  value={todoLabel}
                  onChange={(e) => setTodoLabel(e.target.value)}
                  placeholder="e.g. to-do"
                  className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1 px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  In Progress Label
                </label>
                <input
                  type="text"
                  value={inProgressLabel}
                  onChange={(e) => setInProgressLabel(e.target.value)}
                  placeholder="e.g. in-progress"
                  className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-1 px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Comment Fallback Opt-In */}
            <div className="pt-1 border-t border-slate-200 dark:border-slate-750 flex items-start space-x-2">
              <input
                type="checkbox"
                id="comment-fallback"
                checked={postCommentsFallback}
                onChange={(e) => setPostCommentsFallback(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="comment-fallback" className="text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer leading-tight">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Comment fallback:</span> Post a comment if label modification fails due to repo permissions.
              </label>
            </div>
          </div>
        )}

        {/* Protection Note */}
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 p-2 text-[11px] text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Done column is protected:</strong> Moving tasks to Done never alters GitHub issue status or labels.
          </span>
        </div>

        {/* Discovered Repositories */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
              <FolderGit2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>Assigned Repositories ({discoveredRepos.length})</span>
            </span>
          </div>

          {discoveredRepos.length > 0 ? (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
              {discoveredRepos.map((repo) => {
                const res = setupResults[repo];
                return (
                  <div
                    key={repo}
                    className="flex items-center justify-between p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-xs"
                  >
                    <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate mr-2 font-medium">
                      {repo}
                    </span>
                    {res ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center space-x-1 ${
                          res.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                        }`}
                        title={res.message}
                      >
                        {res.status === 'success' ? (
                          <>
                            <Check className="h-2.5 w-2.5" />
                            <span>Configured</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-2.5 w-2.5" />
                            <span>Failed</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Ready</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-750 text-center text-[11px] text-slate-500 dark:text-slate-400">
              No repositories discovered yet. Settings will automatically apply to future synced issues.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSaveSettingsOnly}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Skip / Keep Local Only
          </button>

          {discoveredRepos.length > 0 && manageLabels ? (
            <button
              type="button"
              onClick={handleSetupAllRepos}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Syncing with Home...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Set Up & Sync at Home</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveSettingsOnly}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {manageLabels ? 'Save & Sync at Home' : 'Save Preferences'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
