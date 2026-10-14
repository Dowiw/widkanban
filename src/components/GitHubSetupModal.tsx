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

  const handleSaveSettingsOnly = () => {
    setGithubSyncSettings({
      manageLabels,
      todoLabel: todoLabel.trim(),
      inProgressLabel: inProgressLabel.trim(),
      postCommentsFallback,
      hasPromptedSetup: true,
    });
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
    setIsProcessing(false);

    // Auto-close after brief delay if all succeeded
    const hasErrors = Object.values(results).some((r) => r.status === 'error');
    if (!hasErrors) {
      setTimeout(() => {
        setGithubSetupOpen(false);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 space-y-3.5 text-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm">
              <Github className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                GitHub Label Setup
              </h3>
              <p className="text-[11px] text-slate-500">
                Sync board columns with GitHub issue labels
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveSettingsOnly}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-indigo-600" />
            <div>
              <div className="text-xs font-semibold text-slate-800">Manage Issue Labels</div>
              <div className="text-[10px] text-slate-500">
                Update labels when moving between To Do & In Progress
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={manageLabels}
            onChange={(e) => setManageLabels(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Label Mapping Inputs */}
        {manageLabels && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs">
            <span className="font-semibold text-slate-700 block text-[11px]">
              Column Labels (leave blank to omit)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  To Do Label
                </label>
                <input
                  type="text"
                  value={todoLabel}
                  onChange={(e) => setTodoLabel(e.target.value)}
                  placeholder="e.g. to-do"
                  className="w-full rounded-lg bg-white border border-slate-200 py-1 px-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  In Progress Label
                </label>
                <input
                  type="text"
                  value={inProgressLabel}
                  onChange={(e) => setInProgressLabel(e.target.value)}
                  placeholder="e.g. in-progress"
                  className="w-full rounded-lg bg-white border border-slate-200 py-1 px-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Comment Fallback Opt-In */}
            <div className="pt-1 border-t border-slate-200/60 flex items-start space-x-2">
              <input
                type="checkbox"
                id="comment-fallback"
                checked={postCommentsFallback}
                onChange={(e) => setPostCommentsFallback(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="comment-fallback" className="text-[11px] text-slate-600 cursor-pointer leading-tight">
                <span className="font-medium text-slate-700">Comment fallback:</span> Post a comment if label modification fails due to repo permissions.
              </label>
            </div>
          </div>
        )}

        {/* Protection Note */}
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-[11px] text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Done column is protected:</strong> Moving tasks to Done never alters GitHub issue status or labels.
          </span>
        </div>

        {/* Discovered Repositories */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center space-x-1">
              <FolderGit2 className="h-3.5 w-3.5 text-slate-500" />
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
                    className="flex items-center justify-between p-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <span className="font-mono text-[11px] text-slate-800 truncate mr-2">
                      {repo}
                    </span>
                    {res ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center space-x-1 ${
                          res.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
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
                      <span className="text-[10px] text-slate-400">Ready</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-2 rounded-lg border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
              No repositories discovered yet. Settings will automatically apply to future synced issues.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveSettingsOnly}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition-colors"
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
                  <span>Configuring...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Set Up Found Repos</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveSettingsOnly}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
            >
              Save Preferences
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
