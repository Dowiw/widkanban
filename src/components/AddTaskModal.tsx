import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskSource, TaskStatus } from '../types/task';
import { 
  X, 
  Github, 
  CheckSquare, 
  Plus, 
  Search, 
  RotateCw, 
  Lock, 
  Layers, 
  GraduationCap, 
  Check, 
  ChevronDown 
} from 'lucide-react';

export const AddTaskModal: React.FC = () => {
  const { 
    isAddTaskOpen, 
    setAddTaskOpen, 
    addTask,
    availableRepos,
    availableGoogleLists,
    availableMicrosoftLists,
    lastUsedRepo,
    setLastUsedRepo,
    organizationRoles,
    fetchAvailableContainers,
    createGoogleTaskList,
    createMicrosoftTodoList,
  } = useTaskStore();

  const [title, setTitle] = useState('');
  const [source, setSource] = useState<TaskSource>('github');
  const [status, setStatus] = useState<TaskStatus>('todo');

  // Container Selection
  const [selectedRepo, setSelectedRepo] = useState(lastUsedRepo || 'Dowiw/widkanban');
  const [repoSearch, setRepoSearch] = useState('');
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);

  const [selectedGoogleListId, setSelectedGoogleListId] = useState('');
  const [isCreatingGoogleList, setIsCreatingGoogleList] = useState(false);
  const [newGoogleListTitle, setNewGoogleListTitle] = useState('');

  const [selectedMicrosoftListId, setSelectedMicrosoftListId] = useState('');
  const [isCreatingMicrosoftList, setIsCreatingMicrosoftList] = useState(false);
  const [newMicrosoftListTitle, setNewMicrosoftListTitle] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pre-fetch containers on mount and initialize defaults
  useEffect(() => {
    if (isAddTaskOpen) {
      fetchAvailableContainers();
    }
  }, [isAddTaskOpen, fetchAvailableContainers]);

  useEffect(() => {
    if (lastUsedRepo) {
      setSelectedRepo(lastUsedRepo);
    } else if (availableRepos.length > 0) {
      setSelectedRepo(availableRepos[0].name);
    }
  }, [lastUsedRepo, availableRepos]);

  useEffect(() => {
    if (availableGoogleLists.length > 0 && !selectedGoogleListId) {
      setSelectedGoogleListId(availableGoogleLists[0].id);
    }
  }, [availableGoogleLists, selectedGoogleListId]);

  useEffect(() => {
    if (availableMicrosoftLists.length > 0 && !selectedMicrosoftListId) {
      setSelectedMicrosoftListId(availableMicrosoftLists[0].id);
    }
  }, [availableMicrosoftLists, selectedMicrosoftListId]);

  if (!isAddTaskOpen) return null;

  const handleRefreshContainers = async () => {
    setIsRefreshing(true);
    await fetchAvailableContainers();
    setIsRefreshing(false);
  };

  const handleCreateGoogleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoogleListTitle.trim()) return;
    const created = await createGoogleTaskList(newGoogleListTitle.trim());
    if (created) {
      setSelectedGoogleListId(created.id);
    }
    setNewGoogleListTitle('');
    setIsCreatingGoogleList(false);
  };

  const handleCreateMicrosoftListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMicrosoftListTitle.trim()) return;
    const created = await createMicrosoftTodoList(newMicrosoftListTitle.trim());
    if (created) {
      setSelectedMicrosoftListId(created.id);
    }
    setNewMicrosoftListTitle('');
    setIsCreatingMicrosoftList(false);
  };

  const isStudentRestricted =
    (source === 'teams' && organizationRoles.teamsRole === 'student') ||
    (source === 'blackboard' && organizationRoles.blackboardRole === 'student');

  const filteredRepos = availableRepos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isStudentRestricted) return;

    if (source === 'github') {
      const targetRepo = selectedRepo.trim() || 'Dowiw/widkanban';
      setLastUsedRepo(targetRepo);
      addTask({
        title: title.trim(),
        source: 'github',
        status,
        url: `https://github.com/${targetRepo}/issues`,
        sourceMeta: {
          repo: targetRepo,
          issueNumber: Math.floor(Math.random() * 899) + 100,
          labels: [{ name: 'user-created', color: '6366f1' }],
          isPullRequest: false,
        },
      });
    } else if (source === 'google_tasks') {
      const activeList = availableGoogleLists.find((l) => l.id === selectedGoogleListId);
      addTask({
        title: title.trim(),
        source: 'google_tasks',
        status,
        url: 'https://tasks.google.com',
        sourceMeta: {
          listId: selectedGoogleListId || 'personal',
          listTitle: activeList?.title || 'Personal Tasks',
          dueDate: new Date().toISOString(),
        },
      });
    } else if (source === 'microsoft') {
      const activeList = availableMicrosoftLists.find((l) => l.id === selectedMicrosoftListId);
      addTask({
        title: title.trim(),
        source: 'microsoft',
        status,
        url: 'https://to-do.office.com',
        sourceMeta: {
          listId: selectedMicrosoftListId || 'tasks',
          listTitle: activeList?.title || 'Personal To-Do',
          dueDate: new Date().toISOString(),
        },
      });
    }

    setTitle('');
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
              Add Task
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
          {/* Provider Selection */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Provider</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSource('github')}
                className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[11px] transition-all ${
                  source === 'github'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Github className="h-3 w-3 shrink-0" />
                <span className="truncate">GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('google_tasks')}
                className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[11px] transition-all ${
                  source === 'google_tasks'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500/60 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="h-3 w-3 shrink-0" />
                <span className="truncate">Google</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('microsoft')}
                className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[11px] transition-all ${
                  source === 'microsoft'
                    ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500/60 text-sky-700 dark:text-sky-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="h-3 w-3 shrink-0" />
                <span className="truncate">To Do</span>
              </button>
            </div>

            {/* Academic & Class Integrations */}
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => setSource('teams')}
                className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[10.5px] transition-all ${
                  source === 'teams'
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="h-3 w-3 shrink-0 text-indigo-500" />
                <span className="truncate">Teams Class</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('blackboard')}
                className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[10.5px] transition-all ${
                  source === 'blackboard'
                    ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-500/60 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="truncate">Blackboard</span>
              </button>
            </div>
          </div>

          {/* Student Organization Boundary Banner */}
          {isStudentRestricted && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold text-[11.5px]">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Disabled by organization (Student access)</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-amber-700 dark:text-amber-400">
                Student accounts cannot publish class assignments or coursework. Assignments are published by teachers and instructors.
              </p>
              <button
                type="button"
                onClick={() => setSource('microsoft')}
                className="mt-1 text-[10.5px] font-medium underline text-amber-900 dark:text-amber-200 hover:text-amber-700"
              >
                Switch to Personal To-Do item instead →
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Task Title</label>
            <input
              type="text"
              required
              disabled={isStudentRestricted}
              placeholder="e.g. Implement refresh token storage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Status Column */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Initial Status</label>
            <select
              value={status}
              disabled={isStudentRestricted}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* GitHub: Searchable Repository Dropdown */}
          {source === 'github' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-300 font-medium">Repository</label>
                <button
                  type="button"
                  onClick={handleRefreshContainers}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5"
                  title="Refresh repository list"
                >
                  <RotateCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Selector Trigger Button */}
              <button
                type="button"
                onClick={() => setIsRepoDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:border-indigo-500"
              >
                <span className="truncate">{selectedRepo || 'Select a repository...'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isRepoDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 z-30 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 shadow-xl overflow-hidden p-1.5 space-y-1">
                  <div className="flex items-center px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    <Search className="h-3 w-3 text-slate-400 mr-1.5 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search repositories..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {filteredRepos.length > 0 ? (
                      filteredRepos.map((repo) => (
                        <button
                          key={repo.name}
                          type="button"
                          onClick={() => {
                            setSelectedRepo(repo.name);
                            setLastUsedRepo(repo.name);
                            setIsRepoDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded-md text-xs transition-colors ${
                            selectedRepo === repo.name
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{repo.name}</span>
                          <span className="flex items-center space-x-1 shrink-0 ml-1">
                            {repo.isOwner && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                Owner
                              </span>
                            )}
                            {selectedRepo === repo.name && <Check className="h-3 w-3 text-indigo-600" />}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-center text-slate-400 text-xs">
                        No matching repositories found.
                      </div>
                    )}
                  </div>

                  {/* Custom Repo manual entry fallback */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Or type custom owner/repo..."
                      value={selectedRepo}
                      onChange={(e) => {
                        setSelectedRepo(e.target.value);
                        setLastUsedRepo(e.target.value);
                      }}
                      className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Tasks: List Dropdown with Inline Creation */}
          {source === 'google_tasks' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-300 font-medium">Task List</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRefreshContainers}
                    className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5"
                    title="Refresh lists"
                  >
                    <RotateCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  {!isCreatingGoogleList && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingGoogleList(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
                    >
                      + Create List
                    </button>
                  )}
                </div>
              </div>

              {isCreatingGoogleList ? (
                <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600">
                  <input
                    type="text"
                    autoFocus
                    placeholder="New list title..."
                    value={newGoogleListTitle}
                    onChange={(e) => setNewGoogleListTitle(e.target.value)}
                    className="flex-1 bg-transparent text-xs p-1 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateGoogleListSubmit}
                    disabled={!newGoogleListTitle.trim()}
                    className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingGoogleList(false);
                      setNewGoogleListTitle('');
                    }}
                    className="px-1.5 py-1 text-slate-500 text-xs hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={selectedGoogleListId}
                  onChange={(e) => setSelectedGoogleListId(e.target.value)}
                  className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {availableGoogleLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Microsoft To Do: List Dropdown with Inline Creation */}
          {source === 'microsoft' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-300 font-medium">To-Do List</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRefreshContainers}
                    className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5"
                    title="Refresh lists"
                  >
                    <RotateCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  {!isCreatingMicrosoftList && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingMicrosoftList(true)}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-700 font-medium"
                    >
                      + Create List
                    </button>
                  )}
                </div>
              </div>

              {isCreatingMicrosoftList ? (
                <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-sky-300 dark:border-sky-600">
                  <input
                    type="text"
                    autoFocus
                    placeholder="New list title..."
                    value={newMicrosoftListTitle}
                    onChange={(e) => setNewMicrosoftListTitle(e.target.value)}
                    className="flex-1 bg-transparent text-xs p-1 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateMicrosoftListSubmit}
                    disabled={!newMicrosoftListTitle.trim()}
                    className="px-2 py-1 bg-sky-600 text-white rounded text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingMicrosoftList(false);
                      setNewMicrosoftListTitle('');
                    }}
                    className="px-1.5 py-1 text-slate-500 text-xs hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={selectedMicrosoftListId}
                  onChange={(e) => setSelectedMicrosoftListId(e.target.value)}
                  className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {availableMicrosoftLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              disabled={isStudentRestricted || !title.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-md shadow-indigo-600/30 transition-colors"
            >
              {isStudentRestricted ? 'Disabled by Organization' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

