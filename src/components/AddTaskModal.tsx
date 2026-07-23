import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskSource, TaskStatus } from '../types/task';
import { X, Github, CheckSquare, Plus } from 'lucide-react';

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
          labels: ['user-created'],
        },
      });
    } else {
      addTask({
        title: title.trim(),
        source: 'google_tasks',
        status,
        url: 'https://tasks.google.com',
        sourceMeta: {
          listId: metaInfo.trim() || 'Personal',
          dueDate: 'Today',
        },
      });
    }

    setTitle('');
    setMetaInfo('');
    setAddTaskOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Add Mock Task
            </h3>
          </div>
          <button
            onClick={() => setAddTaskOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Source Selection */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSource('github')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border transition-all ${
                  source === 'github'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('google_tasks')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border transition-all ${
                  source === 'google_tasks'
                    ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Google Task</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement refresh token storage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* Status Column */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Extra Meta */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {source === 'github' ? 'Repository Name' : 'Task List Name'}
            </label>
            <input
              type="text"
              placeholder={source === 'github' ? 'widkanban' : 'Work'}
              value={metaInfo}
              onChange={(e) => setMetaInfo(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setAddTaskOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
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
