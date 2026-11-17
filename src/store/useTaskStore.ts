import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import {
  defaultTaskSyncAdapter,
  TaskSyncAdapter,
} from '../sync/taskSyncAdapter';
import {
  ActionResult,
  createSubtask as engineCreateSubtask,
  deleteSubtask as engineDeleteSubtask,
  executeGitHubDoneAction as engineExecuteGitHubDoneAction,
  removeTask as engineRemoveTask,
  RemoveTaskOptions,
  setTaskDeadline as engineSetTaskDeadline,
  syncGithubLabelsWithBoard,
  syncProviderTasks,
  toggleSubtask as engineToggleSubtask,
  transitionTask as engineTransitionTask,
} from '../sync/taskSyncEngine';
import {
  UnifiedTask,
  SubtaskItem,
  TaskStatus,
  TaskSource,
  AuthStatus,
  GitHubDoneAction,
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
  CredentialInspectionReport,
  MicrosoftOAuthResult,
  DeadlineFilterOption,
  DeadlineSortOption,
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

  // Runtime Task Sync Seam
  syncAdapter: TaskSyncAdapter;
  setSyncAdapter: (adapter: TaskSyncAdapter) => void;

  moveTask: (taskId: string, targetStatus: TaskStatus, targetIndex?: number) => Promise<void>;
  addTask: (task: Omit<UnifiedTask, 'id' | 'updatedAt'>) => void;
  deleteTask: (taskId: string) => void;
  removeTask: (taskId: string, options?: RemoveTaskOptions) => Promise<ActionResult>;
  openDeleteModal: (task: UnifiedTask) => void;
  closeDeleteModal: () => void;
  setTrashDropdownOpen: (isOpen: boolean) => void;
  toggleTrashDropdown: () => void;
  deleteTaskLocally: (taskId: string) => void;
  restoreLocallyDeletedTask: (taskId: string) => void;
  clearLocallyDeletedTasks: () => void;
  setDeletePreference: (pref: DeletePreference | null) => void;
  dismissLocallyDeletedTip: () => void;
  deadlineFilter: DeadlineFilterOption;
  deadlineSort: DeadlineSortOption;
  setDeadlineFilter: (filter: DeadlineFilterOption) => void;
  setDeadlineSort: (sort: DeadlineSortOption) => void;
  setTaskDeadline: (
    taskId: string,
    dueDate: string | null,
    deadlineType?: string
  ) => Promise<ActionResult>;
  setSearchQuery: (query: string) => void;
  setFilterSource: (source: 'all' | TaskSource) => void;
  togglePin: () => void;
  setAddTaskOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setGithubSetupOpen: (isOpen: boolean) => void;
  setCompletedOnboarding: (completed: boolean) => void;
  setGithubSyncSettings: (settings: Partial<GitHubSyncSettings>) => void;
  groupLinkedPRs: boolean;
  setGroupLinkedPRs: (group: boolean) => void;
  githubDoneModalTask: UnifiedTask | null;
  openGithubDoneModal: (task: UnifiedTask) => void;
  closeGithubDoneModal: () => void;
  executeGitHubDoneAction: (
    task: UnifiedTask,
    action: GitHubDoneAction,
    remember?: boolean
  ) => Promise<void>;
  setupRepoLabels: (repo: string) => Promise<RepoLabelsResult | null>;
  syncLabelsWithHomeBoard: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  fetchGoogleTasks: () => Promise<void>;
  fetchGithubTasks: () => Promise<void>;
  fetchMicrosoftTasks: () => Promise<void>;
  toggleSubtask: (parentTaskId: string, subtaskId: string) => Promise<ActionResult>;
  createSubtask: (parentTaskId: string, title: string) => Promise<SubtaskItem | null>;
  deleteSubtask: (parentTaskId: string, subtaskId: string) => Promise<ActionResult>;
  checkAuthStatus: () => Promise<AuthStatus>;
  inspectCredentials: (payload: {
    githubToken?: string;
    googleToken?: string;
    microsoftToken?: string;
  }) => Promise<CredentialInspectionReport | null>;
  saveCredentials: (creds: {
    githubToken?: string;
    googleToken?: string;
    googleRefreshToken?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    microsoftToken?: string;
    microsoftRefreshToken?: string;
    microsoftClientId?: string;
    microsoftIncludeEducation?: boolean;
  }) => Promise<boolean>;
  clearCredentials: (provider?: string) => Promise<boolean>;
  startGoogleOAuthFlow: (creds?: {
    clientId?: string;
    clientSecret?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  startMicrosoftOAuthFlow: (creds?: {
    clientId?: string;
    includeEducation?: boolean;
  }) => Promise<{ success: boolean; report?: CredentialInspectionReport; error?: string }>;
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
        doneLabel: 'done',
        doneAction: 'ask',
        postCommentsFallback: false,
        hasPromptedSetup: false,
      },
      groupLinkedPRs: true,
      githubDoneModalTask: null,
      startupSettings: DEFAULT_STARTUP_SETTINGS,
      isStartupPromptOpen: false,
      locallyDeletedTasks: [],
      deleteModalTask: null,
      deletePreference: null,
      hasSeenLocallyDeletedTip: false,
      isTrashDropdownOpen: false,

      // Deadline filter & sort
      deadlineFilter: 'all',
      deadlineSort: 'none',

      // Customization initial state
      customization: DEFAULT_CUSTOMIZATION_SETTINGS,

      // Auto-Sync & API Health initial state
      autoSyncSettings: DEFAULT_AUTOSYNC_SETTINGS,
      isAutoSyncPromptOpen: false,
      apiHealth: DEFAULT_API_HEALTH_STATE,
      syncBanner: null,
      syncAdapter: defaultTaskSyncAdapter(),
      setSyncAdapter: (adapter) => set({ syncAdapter: adapter }),
      setAutoSyncSettings: (settings) =>
        set((state) => ({
          autoSyncSettings: { ...state.autoSyncSettings, ...settings },
        })),
      setAutoSyncPromptOpen: (isOpen) => set({ isAutoSyncPromptOpen: isOpen }),
      setSyncBanner: (banner) => set({ syncBanner: banner }),

      setGroupLinkedPRs: (group) => set({ groupLinkedPRs: group }),
      openGithubDoneModal: (task) => set({ githubDoneModalTask: task }),
      closeGithubDoneModal: () => set({ githubDoneModalTask: null }),
      executeGitHubDoneAction: async (task, action, remember) => {
        set((state) => ({
          githubDoneModalTask: null,
          ...(remember
            ? {
                githubSyncSettings: {
                  ...state.githubSyncSettings,
                  doneAction: action,
                },
              }
            : {}),
        }));
        await engineExecuteGitHubDoneAction(get, set, get().syncAdapter, task, action);
      },

      moveTask: async (taskId, targetStatus, targetIndex) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (
          task &&
          task.source === 'github' &&
          targetStatus === 'done' &&
          task.status !== 'done' &&
          state.githubSyncSettings.doneAction === 'ask'
        ) {
          set({ githubDoneModalTask: task });
          return;
        }
        await engineTransitionTask(
          get,
          set,
          state.syncAdapter,
          taskId,
          targetStatus,
          targetIndex
        );
      },

      addTask: (newTaskData) => {
        const rawUuid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
            : Date.now().toString(36);
        const task: UnifiedTask = {
          ...newTaskData,
          id: `local_${rawUuid}`,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [task, ...state.tasks],
        }));
      },

      deleteTask: (taskId) => {
        void engineRemoveTask(get, set, get().syncAdapter, taskId, { mode: 'local' });
      },

      removeTask: async (taskId, options = { mode: 'local' }) => {
        return await engineRemoveTask(get, set, get().syncAdapter, taskId, options);
      },

      openDeleteModal: (task) => set({ deleteModalTask: task }),
      closeDeleteModal: () => set({ deleteModalTask: null }),
      setTrashDropdownOpen: (isOpen) => set({ isTrashDropdownOpen: isOpen }),
      toggleTrashDropdown: () =>
        set((state) => ({ isTrashDropdownOpen: !state.isTrashDropdownOpen })),

      deleteTaskLocally: (taskId) => {
        void engineRemoveTask(get, set, get().syncAdapter, taskId, { mode: 'local' });
        set({ deleteModalTask: null });
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

      toggleSubtask: async (parentTaskId, subtaskId) => {
        return await engineToggleSubtask(get, set, get().syncAdapter, parentTaskId, subtaskId);
      },

      createSubtask: async (parentTaskId, title) => {
        return await engineCreateSubtask(get, set, get().syncAdapter, parentTaskId, title);
      },

      deleteSubtask: async (parentTaskId, subtaskId) => {
        return await engineDeleteSubtask(get, set, get().syncAdapter, parentTaskId, subtaskId);
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterSource: (source) => set({ filterSource: source }),
      setDeadlineFilter: (filter) => set({ deadlineFilter: filter }),
      setDeadlineSort: (sort) => set({ deadlineSort: sort }),

      setTaskDeadline: async (taskId, dueDate, deadlineType) => {
        return await engineSetTaskDeadline(
          get,
          set,
          get().syncAdapter,
          taskId,
          dueDate,
          deadlineType
        );
      },

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
        await syncGithubLabelsWithBoard(get, set, get().syncAdapter);
        await get().fetchApiHealth();
        await get().checkAuthStatus();
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
        await syncProviderTasks(get, set, get().syncAdapter, 'google_tasks');
        await get().fetchApiHealth();
        await get().checkAuthStatus();
      },

      fetchGithubTasks: async () => {
        await syncProviderTasks(get, set, get().syncAdapter, 'github');
        await get().fetchApiHealth();
        await get().checkAuthStatus();
      },

      fetchMicrosoftTasks: async () => {
        await syncProviderTasks(get, set, get().syncAdapter, 'microsoft_teams');
      },

      checkAuthStatus: async () => {
        const res = await safeInvoke<AuthStatus>('get_auth_status');
        if (res) {
          set({ authStatus: res });
          return res;
        }
        return get().authStatus;
      },

      inspectCredentials: async ({ githubToken, googleToken, microsoftToken }) => {
        return await safeInvoke<CredentialInspectionReport>('inspect_credentials', {
          githubToken: githubToken || null,
          googleToken: googleToken || null,
          microsoftToken: microsoftToken || null,
        });
      },

      saveCredentials: async ({
        githubToken,
        googleToken,
        googleRefreshToken,
        googleClientId,
        googleClientSecret,
        microsoftToken,
        microsoftRefreshToken,
        microsoftClientId,
        microsoftIncludeEducation,
      }) => {
        const res = await safeInvoke<AuthStatus>('save_credentials', {
          githubToken: githubToken || null,
          googleToken: googleToken || null,
          googleRefreshToken: googleRefreshToken || null,
          googleClientId: googleClientId || null,
          googleClientSecret: googleClientSecret || null,
          microsoftToken: microsoftToken || null,
          microsoftRefreshToken: microsoftRefreshToken || null,
          microsoftClientId: microsoftClientId || null,
          microsoftIncludeEducation: microsoftIncludeEducation ?? null,
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
            (authStatus.has_github || authStatus.has_google || authStatus.has_microsoft) &&
            !get().autoSyncSettings.hasPrompted;

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

      startMicrosoftOAuthFlow: async (creds) => {
        const result = await safeInvokeWithResult<MicrosoftOAuthResult>('start_microsoft_oauth_flow', {
          clientId: creds?.clientId || null,
          includeEducation: creds?.includeEducation ?? null,
        });

        if (result.success && result.data) {
          const { authStatus, report } = result.data;
          const isFirstConnect =
            (authStatus.has_github || authStatus.has_google || authStatus.has_microsoft) &&
            !get().autoSyncSettings.hasPrompted;

          set({
            authStatus,
            hasCompletedOnboarding: true,
            isAutoSyncPromptOpen: isFirstConnect ? true : get().isAutoSyncPromptOpen,
          });

          await get().fetchApiHealth();
          return { success: true, report };
        }

        return {
          success: false,
          error: result.error || 'Failed to complete Microsoft authentication',
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
        groupLinkedPRs: state.groupLinkedPRs,
        autoSyncSettings: state.autoSyncSettings,
        locallyDeletedTasks: state.locallyDeletedTasks,
        deletePreference: state.deletePreference,
        hasSeenLocallyDeletedTip: state.hasSeenLocallyDeletedTip,
        customization: state.customization,
        startupSettings: state.startupSettings,
        deadlineFilter: state.deadlineFilter,
        deadlineSort: state.deadlineSort,
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
