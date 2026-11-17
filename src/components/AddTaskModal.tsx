import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskSource, TaskStatus, TaskPriority, SubtaskItem } from '../types/task';
import {
  X,
  Github,
  CheckSquare,
  Plus,
  AlignLeft,
  Flag,
  Users,
  Search,
  RotateCw,
  Lock,
  Layers,
  GraduationCap,
  Check,
  ChevronDown,
} from 'lucide-react';

interface TaskListContainerPickerProps {
  label: string;
  lists: { id: string; title: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreateList: (title: string) => Promise<{ id: string } | null>;
  onRefresh: () => void;
  isRefreshing: boolean;
  accent: 'indigo' | 'sky';
}

const TaskListContainerPicker: React.FC<TaskListContainerPickerProps> = ({
  label,
  lists,
  selectedId,
  onSelect,
  onCreateList,
  onRefresh,
  isRefreshing,
  accent,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleSave = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const created = await onCreateList(trimmed);
    if (created) {
      onSelect(created.id);
    }
    setNewTitle('');
    setIsCreating(false);
  };

  const buttonAccent =
    accent === 'sky'
      ? 'text-sky-600 dark:text-sky-400 hover:text-sky-700'
      : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700';
  const saveBg = accent === 'sky' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-indigo-600 hover:bg-indigo-500';
  const createBorder =
    accent === 'sky'
      ? 'border-sky-300 dark:border-sky-600'
      : 'border-indigo-300 dark:border-indigo-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRefresh}
            className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5"
            title="Refresh lists"
          >
            <RotateCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className={`text-[10px] font-medium ${buttonAccent}`}
            >
              + Create List
            </button>
          )}
        </div>
      </div>

      {isCreating ? (
        <div
          className={`flex items-center space-x-1.5 p-1 rounded-lg bg-slate-50 dark:bg-slate-800 border ${createBorder}`}
        >
          <input
            type="text"
            autoFocus
            placeholder="New list title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSave();
              } else if (e.key === 'Escape') {
                setIsCreating(false);
                setNewTitle('');
              }
            }}
            className="flex-1 bg-transparent text-xs p-1 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!newTitle.trim()}
            className={`px-2 py-1 ${saveBg} text-white rounded text-xs font-medium disabled:opacity-50`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setNewTitle('');
            }}
            className="px-1.5 py-1 text-slate-500 text-xs hover:text-slate-700 dark:hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

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
  const [msContextMode, setMsContextMode] = useState<'todo' | 'assignment'>('todo');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [description, setDescription] = useState('');
  const [initialSubtasks, setInitialSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Smart container state
  const [selectedRepo, setSelectedRepo] = useState(lastUsedRepo || 'Dowiw/widkanban');
  const [repoSearch, setRepoSearch] = useState('');
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [selectedGoogleListId, setSelectedGoogleListId] = useState('');
  const [selectedMicrosoftListId, setSelectedMicrosoftListId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAddTaskOpen) {
      void fetchAvailableContainers();
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

  const isStudentRestricted =
    source === 'microsoft_teams' &&
    msContextMode === 'assignment' &&
    organizationRoles.teamsRole === 'student';

  const filteredRepos = availableRepos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const handleRefreshContainers = async () => {
    setIsRefreshing(true);
    await fetchAvailableContainers();
    setIsRefreshing(false);
  };

  const handleAddInitialSubtask = () => {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    setInitialSubtasks((prev) => [...prev, trimmed]);
    setNewSubtaskInput('');
  };

  const handleRemoveInitialSubtask = (idx: number) => {
    setInitialSubtasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isStudentRestricted) return;

    const cleanDesc = description.trim() || undefined;

    if (source === 'github') {
      const targetRepo = selectedRepo.trim() || 'Dowiw/widkanban';
      setLastUsedRepo(targetRepo);
      addTask({
        title: cleanTitle,
        source: 'github',
        status,
        priority,
        description: cleanDesc,
        url: `https://github.com/${targetRepo}/issues`,
        sourceMeta: {
          repo: targetRepo,
          isPullRequest: false,
          priority,
          notes: cleanDesc,
        },
      });
    } else if (source === 'microsoft_teams') {
      const activeList = availableMicrosoftLists.find((l) => l.id === selectedMicrosoftListId);
      const listId = selectedMicrosoftListId || 'tasks';
      const listTitle = activeList?.title || 'Tasks';
      addTask({
        title: cleanTitle,
        source: 'microsoft_teams',
        status,
        priority,
        description: cleanDesc,
        url: 'https://to-do.office.com',
        sourceMeta: {
          listId: msContextMode === 'todo' ? listId : undefined,
          listTitle: msContextMode === 'todo' ? listTitle : undefined,
          teamName: msContextMode === 'assignment' ? courseName.trim() || 'Teams Class' : undefined,
          isAssignment: msContextMode === 'assignment' ? true : undefined,
          isPlanner: msContextMode === 'todo' ? true : undefined,
          percentComplete: status === 'done' ? 100 : status === 'in_progress' ? 50 : 0,
          dueDate: new Date().toISOString(),
          priority,
          notes: cleanDesc,
        },
      });
    } else {
      const activeList = availableGoogleLists.find((l) => l.id === selectedGoogleListId);
      const listId = selectedGoogleListId || 'personal';
      const listTitle = activeList?.title || 'Personal Tasks';
      const subtaskItems: SubtaskItem[] = initialSubtasks.map((stTitle, idx) => ({
        id: `local_sub_init_${Date.now()}_${idx}`,
        title: stTitle,
        status: 'todo',
      }));

      addTask({
        title: cleanTitle,
        source: 'google_tasks',
        status,
        priority,
        description: cleanDesc,
        url: 'https://tasks.google.com',
        sourceMeta: {
          listTitle,
          listId,
          dueDate: new Date().toISOString(),
          priority,
          notes: cleanDesc,
          hasSubtasks: subtaskItems.length > 0,
          subtaskCount: subtaskItems.length,
          subtasks: subtaskItems,
        },
      });
    }

    setTitle('');
    setCourseName('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setInitialSubtasks([]);
    setNewSubtaskInput('');
    setIsRepoDropdownOpen(false);
    setAddTaskOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        style={{ borderRadius: 'var(--modal-radius, 16px)' }}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 p-4 shadow-2xl space-y-3.5 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
      >
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
            type="button"
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
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
              Provider
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSource('github')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs transition-all ${
                  source === 'github'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Github className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px]">GitHub</span>
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
                <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-[11px]">Google</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('microsoft_teams')}
                className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs transition-all ${
                  source === 'microsoft_teams'
                    ? 'bg-violet-50 dark:bg-violet-950/80 border-violet-500/60 text-violet-700 dark:text-violet-300 font-semibold shadow-xs ring-1 ring-violet-500/30'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-[11px]">Microsoft</span>
              </button>
            </div>

            {source === 'microsoft_teams' && (
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setMsContextMode('todo')}
                  className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[10.5px] transition-all ${
                    msContextMode === 'todo'
                      ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="h-3 w-3 shrink-0 text-sky-500" />
                  <span className="truncate">Personal To Do</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMsContextMode('assignment')}
                  className={`flex items-center justify-center space-x-1 p-1.5 rounded-lg border text-[10.5px] transition-all ${
                    msContextMode === 'assignment'
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <GraduationCap className="h-3 w-3 shrink-0 text-indigo-500" />
                  <span className="truncate">Teams Class</span>
                </button>
              </div>
            )}
          </div>

          {/* Student Organization Boundary Banner */}
          {isStudentRestricted && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold text-[11.5px]">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Disabled by organization (Student access)</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-amber-700 dark:text-amber-400">
                Student accounts cannot publish class assignments. Assignments are published by instructors.
              </p>
              <button
                type="button"
                onClick={() => setMsContextMode('todo')}
                className="mt-1 text-[10.5px] font-medium underline text-amber-900 dark:text-amber-200 hover:text-amber-700"
              >
                Switch to Personal To-Do item instead →
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isStudentRestricted}
              placeholder={
                source === 'github'
                  ? 'e.g. Implement background token refresh'
                  : source === 'microsoft_teams'
                  ? 'e.g. Prepare quarterly sprint report'
                  : 'e.g. Plan sprint meeting'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
                Status Column
              </label>
              <select
                value={status}
                disabled={isStudentRestricted}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                disabled={isStudentRestricted}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 capitalize disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* GitHub: Searchable Repository Dropdown */}
          {source === 'github' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  Repository
                </label>
                <button
                  type="button"
                  onClick={() => void handleRefreshContainers()}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5"
                  title="Refresh repository list"
                >
                  <RotateCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRepoDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 text-left focus:outline-none focus:border-indigo-500"
              >
                <span className="truncate">{selectedRepo || 'Select a repository...'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

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
                            {selectedRepo === repo.name && (
                              <Check className="h-3 w-3 text-indigo-600" />
                            )}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-center text-slate-400 text-xs">
                        No matching repositories found.
                      </div>
                    )}
                  </div>

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
            <TaskListContainerPicker
              label="Task List"
              lists={availableGoogleLists}
              selectedId={selectedGoogleListId}
              onSelect={setSelectedGoogleListId}
              onCreateList={createGoogleTaskList}
              onRefresh={() => void handleRefreshContainers()}
              isRefreshing={isRefreshing}
              accent="indigo"
            />
          )}

          {/* Microsoft To-Do or Teams Class Course */}
          {source === 'microsoft_teams' && msContextMode === 'todo' && (
            <TaskListContainerPicker
              label="To-Do List"
              lists={availableMicrosoftLists}
              selectedId={selectedMicrosoftListId}
              onSelect={setSelectedMicrosoftListId}
              onCreateList={createMicrosoftTodoList}
              onRefresh={() => void handleRefreshContainers()}
              isRefreshing={isRefreshing}
              accent="sky"
            />
          )}

          {source === 'microsoft_teams' && msContextMode === 'assignment' && !isStudentRestricted && (
            <div>
              <label className="block text-slate-600 dark:text-slate-300 mb-1 text-[11px] font-medium">
                Class / Course Name
              </label>
              <input
                type="text"
                placeholder="e.g. CS 401"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Description / Notes (Markdown) */}
          {!isStudentRestricted && (
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
          )}

          {/* Subtasks for Google Tasks */}
          {source === 'google_tasks' && (
            <div className="space-y-1.5 pt-1 border-t border-slate-150 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  Initial Subtasks (optional)
                </label>
                <span className="text-[10px] text-slate-400">{initialSubtasks.length} added</span>
              </div>

              {initialSubtasks.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                  {initialSubtasks.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-200">{st}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInitialSubtask(idx)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0 ml-1"
                        title="Remove subtask"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="Subtask title..."
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInitialSubtask();
                    }
                  }}
                  className="flex-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddInitialSubtask}
                  disabled={!newSubtaskInput.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 text-xs font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

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
              disabled={isStudentRestricted || !title.trim()}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isStudentRestricted || !title.trim()
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              {isStudentRestricted ? 'Disabled by Organization' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
