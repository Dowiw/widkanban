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
            // Insert into target position among tasks of target status
            const sameStatusTasks = updatedTasks.filter((t) => t.status === targetStatus);
            const otherStatusTasks = updatedTasks.filter((t) => t.status !== targetStatus);
            
            sameStatusTasks.splice(targetIndex, 0, updatedTask);
            return { tasks: [...otherStatusTasks, ...sameStatusTasks] };
          } else {
            return { tasks: [...updatedTasks, updatedTask] };
          }
        });
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
        // Simulated refresh update
        set((state) => ({
          tasks: state.tasks.map((t) => ({ ...t, updatedAt: new Date().toISOString() })),
        }));
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
          return true;
        }
        return false;
      },

      clearCredentials: async (provider) => {
        const res = await safeInvoke<AuthStatus>('clear_credentials', {
          provider: provider || null,
        });
        if (res) {
          set({ authStatus: res });
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
