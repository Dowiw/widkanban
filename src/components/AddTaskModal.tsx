import React, { useState, useId } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskSource, TaskStatus, TaskPriority } from '../types/task';
import { X, Github, CheckSquare, Plus, AlignLeft, Flag } from 'lucide-react';

export const AddTaskModal: React.FC = () => {
  const { isAddTaskOpen, setAddTaskOpen, addTask, tasks } = useTaskStore();

  const [title, setTitle] = useState('');
  const [source, setSource] = useState<TaskSource>('github');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [metaInfo, setMetaInfo] = useState('');
  const [description, setDescription] = useState('');
  const repoListId = useId();
  const taskListDatalistId = useId();

  // Known repos & lists for quick suggestions
  const knownRepos = Array.from(
    new Set(
      tasks
        .map((t) => t.sourceMeta?.repo)
        .filter((r): r is string => Boolean(r && r.trim()))
    )
  );

  const knownLists = Array.from(
    new Set(
      tasks
        .map((t) => t.sourceMeta?.listTitle)
        .filter((l): l is string => Boolean(l && l.trim()))
    )
  );

  if (!isAddTaskOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const cleanDesc = description.trim() || undefined;
    const cleanMeta = metaInfo.trim();

    if (source === 'github') {
      const repo = cleanMeta || (knownRepos[0] || 'widkanban');
      addTask({
        title: cleanTitle,
        source: 'github',
        status,
        priority,
        description: cleanDesc,
        url: `https://github.com/${repo}/issues`,
        sourceMeta: {
          repo,
          isPullRequest: false,
          priority,
          notes: cleanDesc,
        },
      });
    } else {
      const listTitle = cleanMeta || (knownLists[0] || 'My Tasks');
      addTask({
        title: cleanTitle,
        source: 'google_tasks',
        status,
        priority,
        description: cleanDesc,
        url: 'https://tasks.google.com',
        sourceMeta: {
          listTitle,
          listId: listTitle.toLowerCase().replace(/\s+/g, '-'),
          dueDate: new Date().toISOString(),
          priority,
          notes: cleanDesc,
        },
      });
    }

    // Reset form & close
    setTitle('');
    setMetaInfo('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setAddTaskOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 p-4 shadow-2xl space-y-3.5 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Create Task
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Add an item to your unified Kanban board
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddTaskOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSource('github')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs transition-all ${
                  source === 'github'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Github className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>GitHub Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('google_tasks')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs transition-all ${
                  source === 'google_tasks'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500/60 text-blue-700 dark:text-blue-300 font-semibold shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Google Task</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={source === 'github' ? 'e.g. Implement background token refresh' : 'e.g. Prepare quarterly sprint report'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">Status Column</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium flex items-center space-x-1">
                <Flag className="h-2.5 w-2.5 text-slate-400" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Target Container / Context */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
              {source === 'github' ? 'Repository (owner/repo)' : 'Task List Name'}
            </label>
            <input
              type="text"
              list={source === 'github' ? repoListId : taskListDatalistId}
              placeholder={
                source === 'github'
                  ? knownRepos[0] || 'owner/repo'
                  : knownLists[0] || 'My Tasks'
              }
              value={metaInfo}
              onChange={(e) => setMetaInfo(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {source === 'github' && knownRepos.length > 0 && (
              <datalist id={repoListId}>
                {knownRepos.map((repo) => (
                  <option key={repo} value={repo} />
                ))}
              </datalist>
            )}
            {source === 'google_tasks' && knownLists.length > 0 && (
              <datalist id={taskListDatalistId}>
                {knownLists.map((list) => (
                  <option key={list} value={list} />
                ))}
              </datalist>
            )}
          </div>

          {/* Description / Notes (Markdown) */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium flex items-center space-x-1">
              <AlignLeft className="h-2.5 w-2.5 text-slate-400" />
              <span>Description / Notes (Markdown)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add optional notes, checklist items (- [ ]), or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddTaskOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                !title.trim()
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
