import {
  GitHubLabel,
  GitHubSyncSettings,
  RemoteDeleteMode,
  SubtaskItem,
  TaskSource,
  TaskStatus,
  TaskTransitionRequest,
  UnifiedTask,
} from '../types/task';
import { getTaskCapabilities, isSubtaskDone } from '../domain/taskCapabilities';
import { updateDescriptionWithDeadlineTag } from '../utils/deadline';
import { TaskSyncAdapter } from './taskSyncAdapter';

export interface SyncStoreSnapshot {
  tasks: UnifiedTask[];
  locallyDeletedTasks: UnifiedTask[];
  githubSyncSettings: GitHubSyncSettings;
}

export type SetSyncState = (
  updater:
    | Partial<SyncStoreSnapshot>
    | ((state: SyncStoreSnapshot) => Partial<SyncStoreSnapshot>)
) => void;

export type GetSyncState = () => SyncStoreSnapshot;

export interface RemoveTaskOptions {
  mode: 'local' | 'remote';
  remoteMode?: RemoteDeleteMode;
  reason?: string;
  duplicateOf?: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

function formatError(err: unknown): string {
  return typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
}

/**
 * Computes updated GitHub workflow labels when a task sits in todo or in_progress.
 */
export function applyGitHubLabelsForStatus(
  currentLabels: GitHubLabel[],
  targetStatus: TaskStatus,
  settings: GitHubSyncSettings
): GitHubLabel[] {
  if (!settings.manageLabels || (targetStatus !== 'todo' && targetStatus !== 'in_progress')) {
    return currentLabels;
  }

  const todoTrim = settings.todoLabel.trim();
  const inProgTrim = settings.inProgressLabel.trim();
  const todoLower = todoTrim.toLowerCase();
  const inProgLower = inProgTrim.toLowerCase();

  let nextLabels = [...currentLabels];
  if (targetStatus === 'in_progress') {
    if (todoLower) {
      nextLabels = nextLabels.filter((l) => l.name.toLowerCase() !== todoLower);
    }
    if (inProgTrim && !nextLabels.some((l) => l.name.toLowerCase() === inProgLower)) {
      nextLabels.push({
        name: inProgTrim,
        color: 'd93f0b',
        description: 'Work currently in progress (managed by WidKanban)',
      });
    }
  } else {
    if (inProgLower) {
      nextLabels = nextLabels.filter((l) => l.name.toLowerCase() !== inProgLower);
    }
    if (todoTrim && !nextLabels.some((l) => l.name.toLowerCase() === todoLower)) {
      nextLabels.push({
        name: todoTrim,
        color: '0075ca',
        description: 'Tasks ready to be worked on (managed by WidKanban)',
      });
    }
  }

  return nextLabels;
}

function buildTransitionRequest(
  task: UnifiedTask,
  targetStatus: TaskStatus,
  settings: GitHubSyncSettings
): TaskTransitionRequest | null {
  if (task.source === 'google_tasks') {
    if (!task.sourceMeta?.listId) return null;
    return {
      provider: 'google_tasks',
      taskId: task.id,
      newStatus: targetStatus,
      containerId: task.sourceMeta.listId,
    };
  }

  if (task.source === 'github') {
    const canSyncLabels =
      settings.manageLabels &&
      Boolean(task.sourceMeta?.repo && task.sourceMeta?.issueNumber) &&
      (targetStatus === 'todo' || targetStatus === 'in_progress') &&
      (task.status === 'todo' || task.status === 'in_progress');

    if (!canSyncLabels) return null;

    const isProgress = targetStatus === 'in_progress';
    const targetLabel = (isProgress ? settings.inProgressLabel : settings.todoLabel).trim() || null;
    const opposingLabel =
      (isProgress ? settings.todoLabel : settings.inProgressLabel).trim() || null;

    return {
      provider: 'github',
      taskId: task.id,
      newStatus: targetStatus,
      containerId: task.sourceMeta.repo,
      issueNumber: task.sourceMeta.issueNumber,
      targetLabel,
      opposingLabel,
      postCommentFallback: settings.postCommentsFallback,
    };
  }

  if (task.source === 'microsoft_teams') {
    return {
      provider: 'microsoft_teams',
      taskId: task.id,
      newStatus: targetStatus,
      containerId: task.sourceMeta?.listId,
    };
  }

  return null;
}

/**
 * Optimistically applies a local state patch and dispatches a remote effect,
 * automatically reverting `tasks` if the remote effect throws.
 */
async function withOptimisticRollback<T>(
  get: GetSyncState,
  set: SetSyncState,
  patch: (tasks: UnifiedTask[]) => UnifiedTask[],
  remoteEffect: () => Promise<T>,
  reconcile?: (tasks: UnifiedTask[], result: T) => UnifiedTask[]
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const prevTasks = get().tasks;
  set({ tasks: patch(prevTasks) });

  try {
    const data = await remoteEffect();
    if (reconcile) {
      set((state) => ({ tasks: reconcile(state.tasks, data) }));
    }
    return { success: true, data };
  } catch (err) {
    set({ tasks: prevTasks });
    return { success: false, error: formatError(err) };
  }
}

export async function transitionTask(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  taskId: string,
  targetStatus: TaskStatus,
  targetIndex?: number
): Promise<ActionResult> {
  const { tasks: prevTasks, githubSyncSettings } = get();
  const originalTask = prevTasks.find((t) => t.id === taskId);
  if (!originalTask) {
    return { success: false, error: 'Task not found' };
  }

  const transitionRequest = buildTransitionRequest(originalTask, targetStatus, githubSyncSettings);

  const patch = (tasks: UnifiedTask[]): UnifiedTask[] => {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return tasks;

    const updatedTasks = [...tasks];
    const [movedTask] = updatedTasks.splice(taskIndex, 1);

    const updatedLabels =
      movedTask.source === 'github'
        ? applyGitHubLabelsForStatus(
            movedTask.sourceMeta?.labels || [],
            targetStatus,
            githubSyncSettings
          )
        : movedTask.sourceMeta?.labels;

    const updatedTask: UnifiedTask = {
      ...movedTask,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        ...movedTask.sourceMeta,
        ...(updatedLabels !== undefined ? { labels: updatedLabels } : {}),
      },
    };

    if (targetIndex !== undefined) {
      updatedTasks.splice(targetIndex, 0, updatedTask);
    } else {
      updatedTasks.push(updatedTask);
    }
    return updatedTasks;
  };

  if (!transitionRequest) {
    set({ tasks: patch(prevTasks) });
    return { success: true };
  }

  const res = await withOptimisticRollback(get, set, patch, () =>
    adapter.transitionTaskStatus(transitionRequest)
  );
  if (!res.success) {
    console.warn(`[Sync] Background transition failed for ${taskId}. Reverted: ${res.error}`);
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function setTaskDeadline(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  taskId: string,
  dueDate: string | null,
  deadlineType?: string
): Promise<ActionResult> {
  const task = get().tasks.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  const capabilities = getTaskCapabilities(task);
  if (!capabilities.canEditDeadline) {
    return {
      success: false,
      error: `Deadlines cannot be edited remotely for ${task.source}`,
    };
  }

  const containerId =
    task.source === 'github' ? task.sourceMeta?.repo : task.sourceMeta?.listId;
  const resolvedType = deadlineType || task.sourceMeta?.deadlineType;

  const res = await withOptimisticRollback(
    get,
    set,
    (tasks) =>
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nextDesc =
          t.source === 'github'
            ? updateDescriptionWithDeadlineTag(
                t.description ?? t.sourceMeta?.notes,
                dueDate,
                resolvedType
              )
            : t.description;
        return {
          ...t,
          description: nextDesc,
          sourceMeta: {
            ...t.sourceMeta,
            dueDate: dueDate || undefined,
            deadlineType: resolvedType,
            ...(t.source === 'github' && t.sourceMeta.notes !== undefined
              ? { notes: nextDesc }
              : {}),
          },
        };
      }),
    () =>
      adapter.updateTaskDeadline({
        provider: task.source,
        taskId: task.id,
        containerId,
        issueNumber: task.sourceMeta?.issueNumber,
        isPr: Boolean(task.sourceMeta?.isPullRequest),
        dueDate: dueDate || null,
        deadlineType: deadlineType || null,
      }),
    (tasks, confirmed) =>
      tasks.map((t) => {
        if (t.id !== taskId) return t;
        const confirmedDue =
          confirmed.dueDate !== undefined ? confirmed.dueDate || undefined : t.sourceMeta.dueDate;
        const confirmedDesc =
          typeof confirmed.updatedDescription === 'string'
            ? confirmed.updatedDescription || undefined
            : t.description;
        return {
          ...t,
          description: confirmedDesc,
          sourceMeta: {
            ...t.sourceMeta,
            dueDate: confirmedDue,
            ...(t.source === 'github' && t.sourceMeta.notes !== undefined
              ? { notes: confirmedDesc }
              : {}),
          },
        };
      })
  );

  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function removeTask(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  taskId: string,
  options: RemoveTaskOptions = { mode: 'local' }
): Promise<ActionResult> {
  const { tasks, locallyDeletedTasks } = get();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  const capabilities = getTaskCapabilities(task);

  if (options.mode === 'remote') {
    const remoteMode: RemoteDeleteMode = options.remoteMode || 'close';
    if (!capabilities.supportedRemoteDeleteModes.includes(remoteMode)) {
      return {
        success: false,
        error: `Remote '${remoteMode}' delete is not supported for this task`,
      };
    }

    try {
      await adapter.deleteTaskRemote({
        provider: task.source,
        taskId: task.id,
        containerId: task.sourceMeta?.repo,
        issueNumber: task.sourceMeta?.issueNumber,
        mode: remoteMode,
        reason: options.reason,
        duplicateOf: options.duplicateOf,
      });
    } catch (err) {
      return { success: false, error: formatError(err) };
    }
  }

  set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== taskId),
    locallyDeletedTasks: state.locallyDeletedTasks.some((t) => t.id === taskId)
      ? state.locallyDeletedTasks
      : [task, ...locallyDeletedTasks],
  }));

  return { success: true };
}

export async function toggleSubtask(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  parentTaskId: string,
  subtaskId: string
): Promise<ActionResult> {
  const parentTask = get().tasks.find((t) => t.id === parentTaskId);
  if (!parentTask || !parentTask.sourceMeta?.subtasks) {
    return { success: false, error: 'Parent task or subtasks not found' };
  }

  const capabilities = getTaskCapabilities(parentTask);
  if (!capabilities.canManageSubtasks || !parentTask.sourceMeta?.listId) {
    return { success: false, error: 'Subtasks are read-only for this task' };
  }

  const targetSubtask = parentTask.sourceMeta.subtasks.find((st) => st.id === subtaskId);
  if (!targetSubtask) {
    return { success: false, error: 'Subtask not found' };
  }

  const newStatus: TaskStatus = isSubtaskDone(targetSubtask) ? 'todo' : 'done';
  const containerId = parentTask.sourceMeta.listId;

  const res = await withOptimisticRollback(
    get,
    set,
    (tasks) =>
      tasks.map((task) => {
        if (task.id !== parentTaskId || !task.sourceMeta?.subtasks) return task;
        return {
          ...task,
          sourceMeta: {
            ...task.sourceMeta,
            subtasks: task.sourceMeta.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, status: newStatus } : st
            ),
          },
        };
      }),
    () =>
      adapter.mutateSubtask({
        provider: parentTask.source,
        action: 'toggle',
        containerId,
        taskId: parentTask.id,
        subtaskId,
        newStatus,
      })
  );

  if (!res.success) {
    console.warn(`[Sync] Failed to toggle subtask ${subtaskId}. Reverting...`);
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function createSubtask(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  parentTaskId: string,
  title: string
): Promise<SubtaskItem | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const parentTask = get().tasks.find((t) => t.id === parentTaskId);
  if (!parentTask) return null;

  const capabilities = getTaskCapabilities(parentTask);
  if (!capabilities.canManageSubtasks || !parentTask.sourceMeta?.listId) {
    return null;
  }

  const tempId = `tmp_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const optimisticSubtask: SubtaskItem = {
    id: tempId,
    title: trimmed,
    status: 'todo',
  };
  const containerId = parentTask.sourceMeta.listId;

  const res = await withOptimisticRollback(
    get,
    set,
    (tasks) =>
      tasks.map((task) => {
        if (task.id !== parentTaskId) return task;
        const updatedSubtasks = [...(task.sourceMeta?.subtasks || []), optimisticSubtask];
        return {
          ...task,
          sourceMeta: {
            ...task.sourceMeta,
            hasSubtasks: true,
            subtaskCount: updatedSubtasks.length,
            subtasks: updatedSubtasks,
          },
        };
      }),
    () =>
      adapter.mutateSubtask({
        provider: parentTask.source,
        action: 'create',
        containerId,
        taskId: parentTask.id,
        title: trimmed,
      }),
    (tasks, confirmed) => {
      if (!confirmed) return tasks;
      return tasks.map((task) => {
        if (task.id !== parentTaskId || !task.sourceMeta?.subtasks) return task;
        return {
          ...task,
          sourceMeta: {
            ...task.sourceMeta,
            subtasks: task.sourceMeta.subtasks.map((st) =>
              st.id === tempId ? confirmed : st
            ),
          },
        };
      });
    }
  );

  if (!res.success) {
    console.warn(`[Sync] Failed to create subtask: ${res.error}`);
    return null;
  }
  return res.data ?? optimisticSubtask;
}

export async function deleteSubtask(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  parentTaskId: string,
  subtaskId: string
): Promise<ActionResult> {
  const parentTask = get().tasks.find((t) => t.id === parentTaskId);
  if (!parentTask || !parentTask.sourceMeta?.subtasks) {
    return { success: false, error: 'Parent task or subtasks not found' };
  }

  const capabilities = getTaskCapabilities(parentTask);
  if (!capabilities.canManageSubtasks || !parentTask.sourceMeta?.listId) {
    return { success: false, error: 'Subtasks are read-only for this task' };
  }

  const containerId = parentTask.sourceMeta.listId;
  const res = await withOptimisticRollback(
    get,
    set,
    (tasks) =>
      tasks.map((task) => {
        if (task.id !== parentTaskId || !task.sourceMeta?.subtasks) return task;
        const updatedSubtasks = task.sourceMeta.subtasks.filter((st) => st.id !== subtaskId);
        return {
          ...task,
          sourceMeta: {
            ...task.sourceMeta,
            hasSubtasks: updatedSubtasks.length > 0,
            subtaskCount: updatedSubtasks.length,
            subtasks: updatedSubtasks,
          },
        };
      }),
    () =>
      adapter.mutateSubtask({
        provider: parentTask.source,
        action: 'delete',
        containerId,
        taskId: parentTask.id,
        subtaskId,
      })
  );

  if (!res.success) {
    console.warn(`[Sync] Failed to delete subtask ${subtaskId}. Reverting...`);
  }
  return res.success ? { success: true } : { success: false, error: res.error };
}

export async function syncProviderTasks(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter,
  provider: TaskSource
): Promise<UnifiedTask[] | null> {
  try {
    const fetched = await adapter.fetchProviderTasks(provider);
    set((state) => {
      const locallyDeletedIds = new Set(state.locallyDeletedTasks.map((t) => t.id));
      const activeFetched = fetched.filter((t) => !locallyDeletedIds.has(t.id));
      const otherProviderTasks = state.tasks.filter((t) => t.source !== provider);
      return {
        tasks:
          provider === 'google_tasks'
            ? [...activeFetched, ...otherProviderTasks]
            : [...otherProviderTasks, ...activeFetched],
      };
    });
    return get().tasks;
  } catch (err) {
    console.warn(`[Sync] Failed to fetch tasks for provider '${provider}':`, err);
    return null;
  }
}

export async function syncGithubLabelsWithBoard(
  get: GetSyncState,
  set: SetSyncState,
  adapter: TaskSyncAdapter
): Promise<void> {
  const settings = get().githubSyncSettings;
  if (!settings.manageLabels) return;

  const todoTrim = settings.todoLabel.trim();
  const inProgTrim = settings.inProgressLabel.trim();

  set((state) => ({
    tasks: state.tasks.map((task) => {
      if (task.source !== 'github') return task;
      return {
        ...task,
        sourceMeta: {
          ...task.sourceMeta,
          labels: applyGitHubLabelsForStatus(
            task.sourceMeta?.labels || [],
            task.status,
            settings
          ),
        },
      };
    }),
  }));

  const activeGithubTasks = get().tasks.filter(
    (t) =>
      t.source === 'github' &&
      t.sourceMeta?.repo &&
      t.sourceMeta?.issueNumber &&
      (t.status === 'todo' || t.status === 'in_progress')
  );

  await Promise.allSettled(
    activeGithubTasks.map((t) => {
      const isProgress = t.status === 'in_progress';
      const target = (isProgress ? inProgTrim : todoTrim) || null;
      const opposing = (isProgress ? todoTrim : inProgTrim) || null;
      return adapter.transitionTaskStatus({
        provider: 'github',
        taskId: t.id,
        newStatus: t.status,
        containerId: t.sourceMeta.repo,
        issueNumber: t.sourceMeta.issueNumber,
        targetLabel: target,
        opposingLabel: opposing,
        postCommentFallback: settings.postCommentsFallback,
      });
    })
  );

  await syncProviderTasks(get, set, adapter, 'github');
}
