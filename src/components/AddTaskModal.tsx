import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskSource, TaskStatus } from '../types/task';
import { X, Github, CheckSquare, Plus, Users } from 'lucide-react';

export const AddTaskModal: React.FC = () => {
  const { isAddTaskOpen, setAddTaskOpen, addTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [source, setSource] = useState<TaskSource>('github');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [metaInfo, setMetaInfo] = useState('');

  if (!isAddTaskOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (source === 'github') {
      addTask({
        title: title.trim(),
        source: 'github',
        status,
        url: 'https://github.com/org/widkanban/issues',
        sourceMeta: {
          repo: metaInfo.trim() || 'widkanban',
          issueNumber: Math.floor(Math.random() * 899) + 100,
          labels: [{ name: 'user-created', color: '6366f1' }],
          isPullRequest: false,
        },
      });
    } else if (source === 'microsoft_teams') {
      addTask({
        title: title.trim(),
        source: 'microsoft_teams',
        status,
        url: 'https://teams.microsoft.com',
        sourceMeta: {
          teamName: metaInfo.trim() || 'Teams Channel',
          isPlanner: true,
          percentComplete: status === 'done' ? 100 : status === 'in_progress' ? 50 : 0,
          dueDate: new Date().toISOString(),
        },
      });
    } else {
      addTask({
        title: title.trim(),
        source: 'google_tasks',
        status,
        url: 'https://tasks.google.com',
        sourceMeta: {
          listId: metaInfo.trim() || 'personal',
          listTitle: metaInfo.trim() || 'Personal',
          dueDate: new Date().toISOString(),
        },
      });
    }

    setTitle('');
    setMetaInfo('');
    setAddTaskOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 p-4 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Plus className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Add Mock Task
            </h3>
          </div>
          <button
            onClick={() => setAddTaskOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Source Selection */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Provider</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSource('github')}
                className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-lg border text-center transition-all ${
                  source === 'github'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Github className="h-3.5 w-3.5" />
                <span className="text-[10px]">GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('google_tasks')}
                className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-lg border text-center transition-all ${
                  source === 'google_tasks'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500/60 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="text-[10px]">Google</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('microsoft_teams')}
                className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-lg border text-center transition-all ${
                  source === 'microsoft_teams'
                    ? 'bg-violet-50 dark:bg-violet-950/80 border-violet-500/60 text-violet-700 dark:text-violet-300 font-semibold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="text-[10px]">Teams</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement refresh token storage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Column */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Extra Meta */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
              {source === 'github'
                ? 'Repository Name'
                : source === 'microsoft_teams'
                ? 'Team or Course Name'
                : 'Task List Name'}
            </label>
            <input
              type="text"
              placeholder={
                source === 'github'
                  ? 'widkanban'
                  : source === 'microsoft_teams'
                  ? 'Engineering Team'
                  : 'Work'
              }
              value={metaInfo}
              onChange={(e) => setMetaInfo(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddTaskOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
