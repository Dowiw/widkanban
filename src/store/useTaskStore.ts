import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { UnifiedTask, TaskStatus, TaskSource, AuthStatus } from '../types/task';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';

const safeInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Tauri IPC fallback] Failed to invoke '${cmd}':`, err);
    return null;
  }
};

interface TaskState {
  tasks: UnifiedTask[];
  searchQuery: string;
  filterSource: 'all' | TaskSource;
  isPinned: boolean;
  isAddTaskOpen: boolean;
  isSettingsOpen: boolean;
  hasCompletedOnboarding: boolean;
  authStatus: AuthStatus;

  // Actions
  moveTask: (taskId: string, targetStatus: TaskStatus, targetIndex?: number) => void;
  addTask: (task: Omit<UnifiedTask, 'id' | 'updatedAt'>) => void;
  deleteTask: (taskId: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterSource: (source: 'all' | TaskSource) => void;
  togglePin: () => void;
  setAddTaskOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setCompletedOnboarding: (completed: boolean) => void;
  refreshTasks: () => void;
  fetchGoogleTasks: () => Promise<void>;
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
      hasCompletedOnboarding: false,
      authStatus: {
        has_github: false,
        has_google: false,
      },

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
            const sameStatusTasks = updatedTasks.filter((t) => t.status === targetStatus);
            const otherStatusTasks = updatedTasks.filter((t) => t.status !== targetStatus);
            sameStatusTasks.splice(targetIndex, 0, updatedTask);
            return { tasks: [...otherStatusTasks, ...sameStatusTasks] };
          } else {
            return { tasks: [...updatedTasks, updatedTask] };
          }
        });

        // --- Background write-back for Google Tasks ---
        const task = prevTasks.find((t) => t.id === taskId);
        if (task?.source === 'google_tasks' && task.sourceMeta.listId) {
          // Strip the "gt_" prefix to get the raw Google Tasks API task ID
          const rawTaskId = taskId.startsWith('gt_') ? taskId.slice(3) : taskId;

          safeInvoke('update_google_task', {
            taskId: rawTaskId,
            listId: task.sourceMeta.listId,
            newStatus: targetStatus,
          }).catch((err) => {
            console.error('[Google Tasks write-back failed]', err);
            // Revert optimistic update on failure
            set({ tasks: prevTasks });
          });
        }
      },

      addTask: (newTaskData) => {
        set((state) => {
          const newTask: UnifiedTask = {
            ...newTaskData,
            id: `${newTaskData.source === 'github' ? 'gh' : 'gt'}_${Date.now()}`,
            updatedAt: new Date().toISOString(),
          };
          return { tasks: [newTask, ...state.tasks] };
        });
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterSource: (source) => set({ filterSource: source }),
      togglePin: () => set((state) => ({ isPinned: !state.isPinned })),
      setAddTaskOpen: (isOpen) => set({ isAddTaskOpen: isOpen }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
      setCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),

      refreshTasks: () => {
        set((state) => ({
          tasks: state.tasks.map((t) => ({ ...t, updatedAt: new Date().toISOString() })),
        }));
      },

      /**
       * Fetch all Google Tasks from the Rust backend and merge them into the
       * local task list. Existing Google Tasks are replaced wholesale by the
       * fresh API data; GitHub tasks and manually-added tasks are left untouched.
       */
      fetchGoogleTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_google_tasks');
        if (!fetched) return; // Token missing or IPC unavailable — silently skip

        set((state) => {
          // Remove all existing google_tasks entries and replace with fresh data
          const nonGoogleTasks = state.tasks.filter((t) => t.source !== 'google_tasks');
          return { tasks: [...fetched, ...nonGoogleTasks] };
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
          set({ authStatus: res, hasCompletedOnboarding: true });
          // Immediately fetch Google Tasks after saving a new token
          if (res.has_google) {
            await get().fetchGoogleTasks();
          }
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
            // If Google token was cleared, remove Google tasks from the board
            if (provider === 'google' || !provider) {
              return {
                authStatus: res,
                tasks: state.tasks.filter((t) => t.source !== 'google_tasks'),
              };
            }
            return { authStatus: res };
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
      }),
    }
  )
);
