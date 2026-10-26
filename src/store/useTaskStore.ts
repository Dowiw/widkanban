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
  ThemeMode,
  WidgetCustomizationSettings,
  DEFAULT_CUSTOMIZATION_SETTINGS,
  PinMode,
  StartupSettings,
  DEFAULT_STARTUP_SETTINGS,
  AutoSyncSettings,
  DEFAULT_AUTOSYNC_SETTINGS,
  ApiHealthState,
  DEFAULT_API_HEALTH_STATE,
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

  // Autostart & System Launch
  startupSettings: StartupSettings;
  isStartupPromptOpen: boolean;

  // Local trash & deletion modal state
  locallyDeletedTasks: UnifiedTask[];
  deleteModalTask: UnifiedTask | null;
  deletePreference: DeletePreference | null;
  hasSeenLocallyDeletedTip: boolean;
  isTrashDropdownOpen: boolean;

  // Customization & Appearance
  customization: WidgetCustomizationSettings;

  // Actions
  setCustomization: (settings: Partial<WidgetCustomizationSettings>) => void;
  setPinMode: (mode: PinMode) => Promise<void>;
  toggleTheme: () => void;
  setWindowSizePreset: (preset: 'compact' | 'wide' | 'expanded') => Promise<void>;
  resetWindowPositionAndSize: () => Promise<void>;
  syncWindowResizable: (resizable: boolean) => Promise<void>;

  // Startup actions
  setStartupPromptOpen: (isOpen: boolean) => void;
  setStartupSettings: (settings: Partial<StartupSettings>) => void;
  checkAutostartStatus: () => Promise<boolean>;
  enableAutostart: (startMinimized?: boolean) => Promise<boolean>;
  disableAutostart: () => Promise<boolean>;

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
  syncLabelsWithHomeBoard: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  fetchGoogleTasks: () => Promise<void>;
  fetchGithubTasks: () => Promise<void>;
  fetchMicrosoftTasks: () => Promise<void>;
  checkAuthStatus: () => Promise<AuthStatus>;
  saveCredentials: (creds: {
    githubToken?: string;
    googleToken?: string;
    googleRefreshToken?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    microsoftToken?: string;
  }) => Promise<boolean>;
  clearCredentials: (provider?: string) => Promise<boolean>;
  startGoogleOAuthFlow: (creds?: {
    clientId?: string;
    clientSecret?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  autoSyncSettings: AutoSyncSettings;
  isAutoSyncPromptOpen: boolean;
  apiHealth: ApiHealthState;
  syncBanner: string | null;
  setAutoSyncSettings: (settings: Partial<AutoSyncSettings>) => void;
  setAutoSyncPromptOpen: (isOpen: boolean) => void;
  setSyncBanner: (banner: string | null) => void;
  fetchApiHealth: () => Promise<ApiHealthState | null>;
  sendDesktopNotification: (title: string, body: string) => Promise<void>;
  refreshTasksWithDiff: () => Promise<{ addedCount: number; newTasks: UnifiedTask[] }>;
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
        has_microsoft: false,
      },
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        postCommentsFallback: false,
        hasPromptedSetup: false,
      },
      startupSettings: DEFAULT_STARTUP_SETTINGS,
      isStartupPromptOpen: false,
      locallyDeletedTasks: [],
      deleteModalTask: null,
      deletePreference: null,
      hasSeenLocallyDeletedTip: false,
      isTrashDropdownOpen: false,

      // Customization initial state
      customization: DEFAULT_CUSTOMIZATION_SETTINGS,

      // Auto-Sync & API Health initial state
      autoSyncSettings: DEFAULT_AUTOSYNC_SETTINGS,
      isAutoSyncPromptOpen: false,
      apiHealth: DEFAULT_API_HEALTH_STATE,
      syncBanner: null,
      setAutoSyncSettings: (settings) =>
        set((state) => ({
          autoSyncSettings: { ...state.autoSyncSettings, ...settings },
        })),
      setAutoSyncPromptOpen: (isOpen) => set({ isAutoSyncPromptOpen: isOpen }),
      setSyncBanner: (banner) => set({ syncBanner: banner }),

      moveTask: (taskId, targetStatus, targetIndex) => {
        // --- Optimistic UI update ---
        const prevTasks = get().tasks;

        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;

          const updatedTasks = [...state.tasks];
          const [movedTask] = updatedTasks.splice(taskIndex, 1);

          let updatedSourceMeta = movedTask.sourceMeta;
          const syncSettings = state.githubSyncSettings;
          if (
            movedTask.source === 'github' &&
            syncSettings.manageLabels &&
            (targetStatus === 'todo' || targetStatus === 'in_progress')
          ) {
            const currentLabels = movedTask.sourceMeta?.labels || [];
            const todoTrim = syncSettings.todoLabel.trim().toLowerCase();
            const inProgTrim = syncSettings.inProgressLabel.trim().toLowerCase();

            let newLabels = [...currentLabels];
            if (targetStatus === 'in_progress') {
              if (todoTrim) {
                newLabels = newLabels.filter((l) => l.name.toLowerCase() !== todoTrim);
              }
              if (inProgTrim && !newLabels.some((l) => l.name.toLowerCase() === inProgTrim)) {
                newLabels.push({
                  name: syncSettings.inProgressLabel.trim(),
                  color: 'd93f0b',
                  description: 'Work currently in progress (managed by WidKanban)',
                });
              }
            } else if (targetStatus === 'todo') {
              if (inProgTrim) {
                newLabels = newLabels.filter((l) => l.name.toLowerCase() !== inProgTrim);
              }
              if (todoTrim && !newLabels.some((l) => l.name.toLowerCase() === todoTrim)) {
                newLabels.push({
                  name: syncSettings.todoLabel.trim(),
                  color: '0075ca',
                  description: 'Tasks ready to be worked on (managed by WidKanban)',
                });
              }
            }
            updatedSourceMeta = { ...movedTask.sourceMeta, labels: newLabels };
          }

          const updatedTask: UnifiedTask = {
            ...movedTask,
            status: targetStatus,
            updatedAt: new Date().toISOString(),
            sourceMeta: updatedSourceMeta,
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

        // --- Background write-back for Microsoft 365 / Teams Tasks ---
        if (task && task.source === 'microsoft_teams') {
          safeInvokeWithResult<void>('update_microsoft_task', {
            taskId: task.id,
            listId: task.sourceMeta?.listId || null,
            newStatus: targetStatus,
          }).then((res) => {
            if (!res.success) {
              console.warn(
                `[Sync] Background update failed for Microsoft task ${task.id}. Reverting...`
              );
              set({ tasks: prevTasks });
            }
          });
        }
      },

      addTask: (newTaskData) => {
        const rawUuid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
            : Date.now().toString(36);
        const prefix =
          newTaskData.source === 'github'
            ? 'gh'
            : newTaskData.source === 'microsoft_teams'
            ? 'ms'
            : 'gt';
        const id = `${prefix}_${rawUuid}`;
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
      setPinMode: async (mode: PinMode) => {
        set((state) => ({
          customization: { ...state.customization, pinMode: mode },
        }));
        if (get().isPinned) {
          await safeInvoke('set_window_pin_mode', { mode });
        }
      },
      togglePin: async () => {
        const nextPinned = !get().isPinned;
        set({ isPinned: nextPinned });
        if (nextPinned) {
          const currentMode = get().customization.pinMode || 'always-on-top';
          await safeInvoke('set_window_pin_mode', { mode: currentMode });
        } else {
          await safeInvoke('set_window_pin_mode', { mode: 'normal' });
        }
      },
      syncWindowResizable: async (resizable: boolean) => {
        await safeInvoke('set_window_resizable', { resizable });
      },
      setStartupPromptOpen: (isOpen) => set({ isStartupPromptOpen: isOpen }),
      setStartupSettings: (settings) =>
        set((state) => ({
          startupSettings: { ...state.startupSettings, ...settings },
        })),
      checkAutostartStatus: async () => {
        const res = await safeInvokeWithResult<boolean>('is_autostart_enabled');
        if (res.success && res.data !== undefined) {
          const isEnabled = res.data ?? false;
          set((state) => ({
            startupSettings: {
              ...state.startupSettings,
              autostartEnabled: isEnabled,
            },
          }));
          return isEnabled;
        }
        return false;
      },
      enableAutostart: async (startMinimized) => {
        const minimized = startMinimized ?? get().startupSettings.startMinimized;
        const res = await safeInvokeWithResult<void>('enable_autostart', {
          startMinimized: minimized,
        });
        if (res.success) {
          set((state) => ({
            startupSettings: {
              ...state.startupSettings,
              autostartEnabled: true,
              startMinimized: minimized,
              hasPrompted: true,
            },
          }));
          return true;
        }
        return false;
      },
      disableAutostart: async () => {
        const res = await safeInvokeWithResult<void>('disable_autostart');
        if (res.success) {
          set((state) => ({
            startupSettings: {
              ...state.startupSettings,
              autostartEnabled: false,
              hasPrompted: true,
            },
          }));
          return true;
        }
        return false;
      },
      setCustomization: (settings) =>
        set((state) => ({
          customization: { ...state.customization, ...settings },
        })),
      toggleTheme: () => {
        const current = get().customization.theme;
        const next: ThemeMode = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
        get().setCustomization({ theme: next });
      },
      setWindowSizePreset: async (preset) => {
        let width = 380;
        let height = 680;
        if (preset === 'wide') {
          width = 850;
          height = 600;
        } else if (preset === 'expanded') {
          width = 1100;
          height = 720;
        }
        await safeInvoke('set_window_size', { width, height });
        set((state) => ({
          customization: {
            ...state.customization,
            defaultWidth: width,
            defaultHeight: height,
          },
        }));
      },
      resetWindowPositionAndSize: async () => {
        await safeInvoke('reset_window_geometry');
        set((state) => ({
          customization: {
            ...state.customization,
            defaultWidth: DEFAULT_CUSTOMIZATION_SETTINGS.defaultWidth,
            defaultHeight: DEFAULT_CUSTOMIZATION_SETTINGS.defaultHeight,
          },
        }));
      },
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

      syncLabelsWithHomeBoard: async () => {
        const settings = get().githubSyncSettings;
        if (!settings.manageLabels) return;

        const todoTrim = settings.todoLabel.trim();
        const inProgTrim = settings.inProgressLabel.trim();
        const todoLower = todoTrim.toLowerCase();
        const inProgLower = inProgTrim.toLowerCase();

        // 1. Immediately synchronize local tasks on the home board (instant 60fps UI feedback)
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.source !== 'github') return task;

            const currentLabels = task.sourceMeta?.labels || [];
            let newLabels = [...currentLabels];

            if (task.status === 'in_progress') {
              if (todoLower) {
                newLabels = newLabels.filter((l) => l.name.toLowerCase() !== todoLower);
              }
              if (inProgLower && !newLabels.some((l) => l.name.toLowerCase() === inProgLower)) {
                newLabels.push({
                  name: inProgTrim,
                  color: 'd93f0b',
                  description: 'Work currently in progress (managed by WidKanban)',
                });
              }
            } else if (task.status === 'todo') {
              if (inProgLower) {
                newLabels = newLabels.filter((l) => l.name.toLowerCase() !== inProgLower);
              }
              if (todoLower && !newLabels.some((l) => l.name.toLowerCase() === todoLower)) {
                newLabels.push({
                  name: todoTrim,
                  color: '0075ca',
                  description: 'Tasks ready to be worked on (managed by WidKanban)',
                });
              }
            }

            return {
              ...task,
              sourceMeta: {
                ...task.sourceMeta,
                labels: newLabels,
              },
            };
          }),
        }));

        // 2. Dispatch background write-backs to GitHub so remote issues receive the agreed labels
        const activeGithubTasks = get().tasks.filter(
          (t) =>
            t.source === 'github' &&
            t.sourceMeta?.repo &&
            t.sourceMeta?.issueNumber &&
            (t.status === 'todo' || t.status === 'in_progress')
        );

        const updates = activeGithubTasks.map((t) => {
          const isProgress = t.status === 'in_progress';
          const target = isProgress ? inProgTrim : todoTrim;
          const opposing = isProgress ? todoTrim : inProgTrim;

          return safeInvokeWithResult<void>('update_github_issue_labels', {
            repo: t.sourceMeta.repo,
            issueNumber: t.sourceMeta.issueNumber,
            targetLabel: target || null,
            opposingLabel: opposing || null,
            postCommentFallback: settings.postCommentsFallback,
          });
        });

        await Promise.allSettled(updates);

        // 3. Re-fetch from GitHub so the home board has full confirmed remote state
        await get().fetchGithubTasks();
      },

      sendDesktopNotification: async (title: string, body: string) => {
        await safeInvoke('send_desktop_notification', { title, body });
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification(title, { body });
            } catch (_) {}
          } else if (Notification.permission !== 'denied') {
            try {
              const perm = await Notification.requestPermission();
              if (perm === 'granted') {
                new Notification(title, { body });
              }
            } catch (_) {}
          }
        }
      },

      fetchApiHealth: async () => {
        const res = await safeInvoke<ApiHealthState>('get_api_health');
        if (res) {
          if (res.github.tokenExpiresAt) {
            try {
              const expTime = Date.parse(res.github.tokenExpiresAt);
              if (!isNaN(expTime)) {
                const diffDays = (expTime - Date.now()) / (1000 * 60 * 60 * 24);
                res.github.isExpiringSoon = diffDays > 0 && diffDays <= 7;
              }
            } catch (_) {}
          }
          set({ apiHealth: res });
          return res;
        }
        return get().apiHealth;
      },

      refreshTasksWithDiff: async () => {
        const prevTasks = get().tasks;
        const prevTaskIds = new Set(prevTasks.map((t) => t.id));

        const health = get().apiHealth;
        const nowSec = Math.floor(Date.now() / 1000);
        const isGithubRateLimited =
          health.github.isRateLimited &&
          health.github.rateLimitReset &&
          health.github.rateLimitReset > nowSec;

        const status = await get().checkAuthStatus();
        const promises: Promise<void>[] = [];
        if (status.has_google) promises.push(get().fetchGoogleTasks());
        if (status.has_github && !isGithubRateLimited) {
          promises.push(get().fetchGithubTasks());
        }
        if (status.has_microsoft) {
          promises.push(get().fetchMicrosoftTasks());
        }

        await Promise.allSettled(promises);
        await get().fetchApiHealth();

        const nextTasks = get().tasks;
        const newTasks = nextTasks.filter(
          (t) =>
            !prevTaskIds.has(t.id) &&
            (t.source === 'github' || t.source === 'google_tasks' || t.source === 'microsoft_teams')
        );

        if (newTasks.length > 0) {
          const bannerMsg =
            newTasks.length === 1
              ? `New task synced: ${newTasks[0].title}`
              : `${newTasks.length} new tasks synced from remote`;

          set({ syncBanner: bannerMsg });

          if (get().autoSyncSettings.notifyOnNewTasks) {
            const notifTitle =
              newTasks.length === 1
                ? 'WidKanban: New Task Assigned'
                : `WidKanban: ${newTasks.length} New Tasks Assigned`;
            const notifBody =
              newTasks.length === 1
                ? newTasks[0].title
                : newTasks.map((t) => t.title).slice(0, 3).join(', ');
            await get().sendDesktopNotification(notifTitle, notifBody);
          }
        }

        return { addedCount: newTasks.length, newTasks };
      },

      refreshTasks: async () => {
        await get().refreshTasksWithDiff();
      },

      fetchGoogleTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_google_tasks');
        if (fetched) {
          set((state) => {
            const nonGoogleTasks = state.tasks.filter((t) => t.source !== 'google_tasks');
            return { tasks: [...fetched, ...nonGoogleTasks] };
          });
        }
        await get().fetchApiHealth();
        await get().checkAuthStatus();
      },

      fetchGithubTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_github_tasks');
        if (fetched) {
          set((state) => {
            const locallyDeletedIds = new Set(state.locallyDeletedTasks.map((t) => t.id));
            const activeFetched = fetched.filter((t) => !locallyDeletedIds.has(t.id));
            const nonGithubTasks = state.tasks.filter((t) => t.source !== 'github');
            return { tasks: [...nonGithubTasks, ...activeFetched] };
          });
        }
        await get().fetchApiHealth();
        await get().checkAuthStatus();
      },

      fetchMicrosoftTasks: async () => {
        const fetched = await safeInvoke<UnifiedTask[]>('fetch_microsoft_tasks');
        if (!fetched) return;

        set((state) => {
          const locallyDeletedIds = new Set(state.locallyDeletedTasks.map((t) => t.id));
          const activeFetched = fetched.filter((t) => !locallyDeletedIds.has(t.id));
          const nonMsTasks = state.tasks.filter((t) => t.source !== 'microsoft_teams');
          return { tasks: [...nonMsTasks, ...activeFetched] };
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

      saveCredentials: async ({
        githubToken,
        googleToken,
        googleRefreshToken,
        googleClientId,
        googleClientSecret,
        microsoftToken,
      }) => {
        const res = await safeInvoke<AuthStatus>('save_credentials', {
          githubToken: githubToken || null,
          googleToken: googleToken || null,
          googleRefreshToken: googleRefreshToken || null,
          googleClientId: googleClientId || null,
          googleClientSecret: googleClientSecret || null,
          microsoftToken: microsoftToken || null,
        });
        if (res) {
          const isFirstGithubConnect =
            res.has_github && !get().githubSyncSettings.hasPromptedSetup;
          const isFirstConnect =
            (res.has_github || res.has_google || res.has_microsoft) && !get().autoSyncSettings.hasPrompted;

          set({
            authStatus: res,
            hasCompletedOnboarding: true,
            isGithubSetupOpen: isFirstGithubConnect ? true : get().isGithubSetupOpen,
            isAutoSyncPromptOpen: isFirstConnect ? true : get().isAutoSyncPromptOpen,
          });

          const syncs: Promise<void>[] = [];
          if (res.has_google) syncs.push(get().fetchGoogleTasks());
          if (res.has_github) syncs.push(get().fetchGithubTasks());
          if (res.has_microsoft) syncs.push(get().fetchMicrosoftTasks());
          await Promise.all(syncs);
          await get().fetchApiHealth();
          return true;
        }
        return false;
      },

      startGoogleOAuthFlow: async (creds) => {
        const result = await safeInvokeWithResult<AuthStatus>('start_google_oauth_flow', {
          clientId: creds?.clientId || null,
          clientSecret: creds?.clientSecret || null,
        });

        if (result.success && result.data) {
          const authStatus = result.data;
          const isFirstConnect =
            (authStatus.has_github || authStatus.has_google) && !get().autoSyncSettings.hasPrompted;

          set({
            authStatus,
            hasCompletedOnboarding: true,
            isAutoSyncPromptOpen: isFirstConnect ? true : get().isAutoSyncPromptOpen,
          });

          await get().fetchGoogleTasks();
          await get().fetchApiHealth();
          return { success: true };
        }

        return {
          success: false,
          error: result.error || 'Failed to complete Google authentication',
        };
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
            if (provider === 'microsoft' || !provider) {
              updatedTasks = updatedTasks.filter((t) => t.source !== 'microsoft_teams');
            }
            return {
              authStatus: res,
              tasks: updatedTasks,
            };
          });
          await get().fetchApiHealth();
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
        autoSyncSettings: state.autoSyncSettings,
        locallyDeletedTasks: state.locallyDeletedTasks,
        deletePreference: state.deletePreference,
        hasSeenLocallyDeletedTip: state.hasSeenLocallyDeletedTip,
        customization: state.customization,
        startupSettings: state.startupSettings,
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
        if ((persistedState as Partial<TaskState>)?.autoSyncSettings) {
          merged.autoSyncSettings = {
            ...currentState.autoSyncSettings,
            ...((persistedState as Partial<TaskState>).autoSyncSettings || {}),
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
        if ((persistedState as Partial<TaskState>)?.customization) {
          merged.customization = {
            ...DEFAULT_CUSTOMIZATION_SETTINGS,
            ...((persistedState as Partial<TaskState>).customization || {}),
          };
        }
        if ((persistedState as Partial<TaskState>)?.startupSettings) {
          merged.startupSettings = {
            ...DEFAULT_STARTUP_SETTINGS,
            ...((persistedState as Partial<TaskState>).startupSettings || {}),
          };
        }
        return merged;
      },
    }
  )
);
