import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import {
  UnifiedTask,
  TaskStatus,
  TaskSource,
  AuthStatus,
  GitHubSyncSettings,
  RepoLabelsResult,
  DeletePreference,
} from '../types/task';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';

interface IpcResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

const safeInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Tauri IPC fallback] Failed to invoke '${cmd}':`, err);
    return null;
  }
};

const safeInvokeWithResult = async <T = void>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<IpcResult<T>> => {
  try {
    const data = await invoke<T>(cmd, args);
    return { success: true, data };
  } catch (err) {
    const error =
      typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
    console.warn(`[Tauri IPC] Failed to invoke '${cmd}':`, error);
    return { success: false, error };
  }
};

interface TaskState {
  tasks: UnifiedTask[];
  searchQuery: string;
  filterSource: 'all' | TaskSource;
  isPinned: boolean;
  isAddTaskOpen: boolean;
  isSettingsOpen: boolean;
  isGithubSetupOpen: boolean;
  hasCompletedOnboarding: boolean;
  authStatus: AuthStatus;
  githubSyncSettings: GitHubSyncSettings;

  // Local trash & deletion modal state
  locallyDeletedTasks: UnifiedTask[];
  deleteModalTask: UnifiedTask | null;
  deletePreference: DeletePreference | null;
  hasSeenLocallyDeletedTip: boolean;
  isTrashDropdownOpen: boolean;

  // Actions
  moveTask: (taskId: string, targetStatus: TaskStatus, targetIndex?: number) => void;
  addTask: (task: Omit<UnifiedTask, 'id' | 'updatedAt'>) => void;
  deleteTask: (taskId: string) => void;
  openDeleteModal: (task: UnifiedTask) => void;
  closeDeleteModal: () => void;
  setTrashDropdownOpen: (isOpen: boolean) => void;
  toggleTrashDropdown: () => void;
  deleteTaskLocally: (taskId: string) => void;
  restoreLocallyDeletedTask: (taskId: string) => void;
  clearLocallyDeletedTasks: () => void;
  setDeletePreference: (pref: DeletePreference | null) => void;
  dismissLocallyDeletedTip: () => void;
  closeGitHubIssueOnRemote: (
    repo: string,
    issueNumber: number,
    reason?: string,
    duplicateOf?: number
  ) => Promise<{ success: boolean; error?: string }>;
  deleteGitHubIssuePermanentlyOnRemote: (
    repo: string,
    issueNumber: number
  ) => Promise<{ success: boolean; error?: string }>;
  setSearchQuery: (query: string) => void;
  setFilterSource: (source: 'all' | TaskSource) => void;
  togglePin: () => void;
  setAddTaskOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setGithubSetupOpen: (isOpen: boolean) => void;
  setCompletedOnboarding: (completed: boolean) => void;
  setGithubSyncSettings: (settings: Partial<GitHubSyncSettings>) => void;
  setupRepoLabels: (repo: string) => Promise<RepoLabelsResult | null>;
  refreshTasks: () => Promise<void>;
  fetchGoogleTasks: () => Promise<void>;
  fetchGithubTasks: () => Promise<void>;
  checkAuthStatus: () => Promise<AuthStatus>;
  saveCredentials: (creds: { githubToken?: string; googleToken?: string }) => Promise<boolean>;
  clearCredentials: (provider?: string) => Promise<boolean>;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_MOCK_TASKS,
      searchQuery: '',
      filterSource: 'all',
      isPinned: true,
      isAddTaskOpen: false,
      isSettingsOpen: false,
      isGithubSetupOpen: false,
      hasCompletedOnboarding: false,
      authStatus: {
        has_github: false,
        has_google: false,
      },
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        postCommentsFallback: false,
        hasPromptedSetup: false,
      },
      locallyDeletedTasks: [],
      deleteModalTask: null,
      deletePreference: null,
      hasSeenLocallyDeletedTip: false,
      isTrashDropdownOpen: false,

      moveTask: (taskId, targetStatus, targetIndex) => {
        // --- Optimistic UI update ---
        const prevTasks = get().tasks;

        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;

          const updatedTasks = [...state.tasks];
          const [movedTask] = updatedTasks.splice(taskIndex, 1);

          const updatedTask: UnifiedTask = {
            ...movedTask,
            status: targetStatus,
            updatedAt: new Date().toISOString(),
          };

          if (targetIndex !== undefined) {
            updatedTasks.splice(targetIndex, 0, updatedTask);
          } else {
            updatedTasks.push(updatedTask);
          }

          return { tasks: updatedTasks };
        });

        // --- Background write-back for Google Tasks ---
        const task = prevTasks.find((t) => t.id === taskId);
        if (task && task.source === 'google_tasks' && task.sourceMeta?.listId) {
          const rawId = task.id.replace(/^gt_/, '');
          safeInvokeWithResult<void>('update_google_task', {
            taskId: rawId,
            listId: task.sourceMeta.listId,
            newStatus: targetStatus,
          }).then((res) => {
            if (!res.success) {
              console.warn(`[Sync] Background update failed for Google Task ${rawId}. Reverting...`);
              set({ tasks: prevTasks });
            }
          });
        }

        // --- Background write-back for GitHub Tasks (To-Do <-> In-Progress only; Done remains strictly local) ---
        if (
          task &&
          task.source === 'github' &&
          task.sourceMeta?.repo &&
          task.sourceMeta?.issueNumber &&
          (targetStatus === 'todo' || targetStatus === 'in_progress') &&
          (task.status === 'todo' || task.status === 'in_progress')
        ) {
          const settings = get().githubSyncSettings;
          if (settings.manageLabels) {
            const targetLabel =
              targetStatus === 'in_progress' ? settings.inProgressLabel : settings.todoLabel;
            const opposingLabel =
              targetStatus === 'in_progress' ? settings.todoLabel : settings.inProgressLabel;

            safeInvokeWithResult<void>('update_github_issue_labels', {
              repo: task.sourceMeta.repo,
              issueNumber: task.sourceMeta.issueNumber,
              targetLabel: targetLabel.trim() || null,
              opposingLabel: opposingLabel.trim() || null,
              postCommentFallback: settings.postCommentsFallback,
            }).then((res) => {
              if (!res.success) {
                console.warn(
                  `[Sync] Background label update failed for ${task.sourceMeta.repo}#${task.sourceMeta.issueNumber}. Reverting...`
                );
                set({ tasks: prevTasks });
              }
            });
          }
        }
      },

      addTask: (newTaskData) => {
        const id = `${newTaskData.source === 'github' ? 'gh' : 'gt'}_${Date.now()}`;
        const task: UnifiedTask = {
          ...newTaskData,
          id,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [task, ...state.tasks],
        }));
      },

      deleteTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          locallyDeletedTasks:
            task && !state.locallyDeletedTasks.some((t) => t.id === taskId)
              ? [task, ...state.locallyDeletedTasks]
              : state.locallyDeletedTasks,
        }));
      },

      openDeleteModal: (task) => set({ deleteModalTask: task }),
      closeDeleteModal: () => set({ deleteModalTask: null }),
      setTrashDropdownOpen: (isOpen) => set({ isTrashDropdownOpen: isOpen }),
      toggleTrashDropdown: () =>
        set((state) => ({ isTrashDropdownOpen: !state.isTrashDropdownOpen })),

      deleteTaskLocally: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          locallyDeletedTasks:
            task && !state.locallyDeletedTasks.some((t) => t.id === taskId)
              ? [task, ...state.locallyDeletedTasks]
              : state.locallyDeletedTasks,
          deleteModalTask: null,
        }));
      },

      restoreLocallyDeletedTask: (taskId) => {
        const task = get().locallyDeletedTasks.find((t) => t.id === taskId);
        if (!task) return;
        set((state) => ({
          locallyDeletedTasks: state.locallyDeletedTasks.filter((t) => t.id !== taskId),
          tasks: state.tasks.some((t) => t.id === taskId)
            ? state.tasks
            : [...state.tasks, task],
        }));
      },

      clearLocallyDeletedTasks: () => set({ locallyDeletedTasks: [] }),
      setDeletePreference: (pref) => set({ deletePreference: pref }),
      dismissLocallyDeletedTip: () => set({ hasSeenLocallyDeletedTip: true }),

      closeGitHubIssueOnRemote: async (repo, issueNumber, reason, duplicateOf) => {
        return await safeInvokeWithResult<void>('close_github_issue', {
          repo,
          issueNumber,
          reason: reason || null,
          duplicateOf: duplicateOf || null,
        });
      },

      deleteGitHubIssuePermanentlyOnRemote: async (repo, issueNumber) => {
        return await safeInvokeWithResult<void>('delete_github_issue_permanently', {
          repo,
          issueNumber,
        });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterSource: (source) => set({ filterSource: source }),
      togglePin: () => set((state) => ({ isPinned: !state.isPinned })),
      setAddTaskOpen: (isOpen) => set({ isAddTaskOpen: isOpen }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      setGithubSetupOpen: (isOpen) => set({ isGithubSetupOpen: isOpen }),
      setCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      setGithubSyncSettings: (settings) =>
        set((state) => ({
          githubSyncSettings: { ...state.githubSyncSettings, ...settings },
        })),

      setupRepoLabels: async (repo: string) => {
        const settings = get().githubSyncSettings;
        return await safeInvoke<RepoLabelsResult>('setup_github_repo_labels', {
          repo,
          todoLabel: settings.todoLabel,
          inProgressLabel: settings.inProgressLabel,
        });
      },

      refreshTasks: async () => {
        const status = await get().checkAuthStatus();
        const promises: Promise<void>[] = [];
        if (status.has_google) promises.push(get().fetchGoogleTasks());
        if (status.has_github) promises.push(get().fetchGithubTasks());
        await Promise.all(promises);
      },

      fetchGoogleTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_google_tasks');
        if (!fetched) return;

        set((state) => {
          const nonGoogleTasks = state.tasks.filter((t) => t.source !== 'google_tasks');
          return { tasks: [...fetched, ...nonGoogleTasks] };
        });
      },

      fetchGithubTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_github_tasks');
        if (!fetched) return;

        set((state) => {
          const locallyDeletedIds = new Set(state.locallyDeletedTasks.map((t) => t.id));
          const activeFetched = fetched.filter((t) => !locallyDeletedIds.has(t.id));
          const nonGithubTasks = state.tasks.filter((t) => t.source !== 'github');
          return { tasks: [...nonGithubTasks, ...activeFetched] };
        });
      },

      checkAuthStatus: async () => {
        const res = await safeInvoke<AuthStatus>('get_auth_status');
        if (res) {
          set({ authStatus: res });
          return res;
        }
        return get().authStatus;
      },

      saveCredentials: async ({ githubToken, googleToken }) => {
        const res = await safeInvoke<AuthStatus>('save_credentials', {
          githubToken: githubToken || null,
          googleToken: googleToken || null,
        });
        if (res) {
          const isFirstGithubConnect =
            res.has_github && !get().githubSyncSettings.hasPromptedSetup;

          set({
            authStatus: res,
            hasCompletedOnboarding: true,
            isGithubSetupOpen: isFirstGithubConnect ? true : get().isGithubSetupOpen,
          });

          const syncs: Promise<void>[] = [];
          if (res.has_google) syncs.push(get().fetchGoogleTasks());
          if (res.has_github) syncs.push(get().fetchGithubTasks());
          await Promise.all(syncs);
          return true;
        }
        return false;
      },

      clearCredentials: async (provider) => {
        const res = await safeInvoke<AuthStatus>('clear_credentials', {
          provider: provider || null,
        });
        if (res) {
          set((state) => {
            let updatedTasks = state.tasks;
            if (provider === 'google' || !provider) {
              updatedTasks = updatedTasks.filter((t) => t.source !== 'google_tasks');
            }
            if (provider === 'github' || !provider) {
              updatedTasks = updatedTasks.filter((t) => t.source !== 'github');
            }
            return {
              authStatus: res,
              tasks: updatedTasks,
            };
          });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'widkanban-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        filterSource: state.filterSource,
        isPinned: state.isPinned,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        githubSyncSettings: state.githubSyncSettings,
        locallyDeletedTasks: state.locallyDeletedTasks,
        deletePreference: state.deletePreference,
        hasSeenLocallyDeletedTip: state.hasSeenLocallyDeletedTip,
      }),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<TaskState>) };
        if (Array.isArray(merged.tasks)) {
          merged.tasks = merged.tasks.filter(
            (t) => !['gh_101', 'gh_102', 'gh_103'].includes(t.id)
          );
        }
        if ((persistedState as Partial<TaskState>)?.githubSyncSettings) {
          merged.githubSyncSettings = {
            ...currentState.githubSyncSettings,
            ...((persistedState as Partial<TaskState>).githubSyncSettings || {}),
          };
        }
        if (Array.isArray((persistedState as Partial<TaskState>)?.locallyDeletedTasks)) {
          merged.locallyDeletedTasks = (persistedState as Partial<TaskState>).locallyDeletedTasks || [];
        }
        if ((persistedState as Partial<TaskState>)?.deletePreference !== undefined) {
          merged.deletePreference = (persistedState as Partial<TaskState>).deletePreference || null;
        }
        if (typeof (persistedState as Partial<TaskState>)?.hasSeenLocallyDeletedTip === 'boolean') {
          merged.hasSeenLocallyDeletedTip = (persistedState as Partial<TaskState>).hasSeenLocallyDeletedTip!;
        }
        return merged;
      },
    }
  )
);
