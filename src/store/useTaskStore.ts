import { create } from 'zustand';
import { UnifiedTask, TaskStatus, TaskSource } from '../types/task';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';

interface TaskState {
  tasks: UnifiedTask[];
  searchQuery: string;
  filterSource: 'all' | TaskSource;
  isPinned: boolean;
  isAddTaskOpen: boolean;

  // Actions
  moveTask: (taskId: string, targetStatus: TaskStatus, targetIndex?: number) => void;
  addTask: (task: Omit<UnifiedTask, 'id' | 'updatedAt'>) => void;
  deleteTask: (taskId: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterSource: (source: 'all' | TaskSource) => void;
  togglePin: () => void;
  setAddTaskOpen: (isOpen: boolean) => void;
  refreshTasks: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: INITIAL_MOCK_TASKS,
  searchQuery: '',
  filterSource: 'all',
  isPinned: true,
  isAddTaskOpen: false,

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
  refreshTasks: () => {
    // Simulated refresh update
    set((state) => ({
      tasks: state.tasks.map((t) => ({ ...t, updatedAt: new Date().toISOString() })),
    }));
  },
}));
