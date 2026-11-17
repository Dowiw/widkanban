import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTaskSyncAdapter } from './taskSyncAdapter';
import {
  applyGitHubLabelsForStatus,
  createSubtask,
  deleteSubtask,
  GetSyncState,
  removeTask,
  setTaskDeadline,
  SetSyncState,
  syncProviderTasks,
  SyncStoreSnapshot,
  toggleSubtask,
  transitionTask,
} from './taskSyncEngine';
import { GitHubSyncSettings, UnifiedTask } from '../types/task';

const defaultGithubSettings: GitHubSyncSettings = {
  manageLabels: true,
  todoLabel: 'to-do',
  inProgressLabel: 'in-progress',
  postCommentsFallback: false,
  hasPromptedSetup: true,
};

function createTestHarness(initialTasks: UnifiedTask[], locallyDeleted: UnifiedTask[] = []) {
  let state: SyncStoreSnapshot = {
    tasks: initialTasks,
    locallyDeletedTasks: locallyDeleted,
    githubSyncSettings: { ...defaultGithubSettings },
  };
  const get: GetSyncState = () => state;
  const set: SetSyncState = (updater) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  const adapter = new InMemoryTaskSyncAdapter();
  return { get, set, adapter };
}

describe('TaskSyncEngine', () => {
  let googleTask: UnifiedTask;
  let githubTask: UnifiedTask;
  let microsoftTask: UnifiedTask;

  beforeEach(() => {
    googleTask = {
      id: 'gt_parent_1',
      title: 'Google task with subtasks',
      source: 'google_tasks',
      status: 'todo',
      url: 'https://tasks.google.com',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: {
        listId: 'work_list',
        listTitle: 'Work',
        hasSubtasks: true,
        subtaskCount: 1,
        subtasks: [{ id: 'gt_sub_1', title: 'Draft outline', status: 'todo' }],
      },
    };

    githubTask = {
      id: 'gh_42',
      title: 'Unify sync seam',
      source: 'github',
      status: 'todo',
      description: 'Refactor body',
      url: 'https://github.com/Dowiw/widkanban/issues/42',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: {
        repo: 'Dowiw/widkanban',
        issueNumber: 42,
        isPullRequest: false,
        labels: [{ name: 'to-do', color: '0075ca' }],
      },
    };

    microsoftTask = {
      id: 'ms_todo_7',
      title: 'Teams checklist item',
      source: 'microsoft_teams',
      status: 'todo',
      url: 'https://to-do.office.com',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: {
        listId: 'ms_list_1',
        subtasks: [{ id: 'c1', title: 'Checklist 1', status: 'done' }],
      },
    };
  });

  it('transitions tasks through the unified adapter seam and reverts on failure', async () => {
    const { get, set, adapter } = createTestHarness([googleTask, githubTask]);

    await transitionTask(get, set, adapter, googleTask.id, 'done');
    expect(adapter.transitions).toHaveLength(1);
    expect(adapter.transitions[0]).toEqual({
      provider: 'google_tasks',
      taskId: 'gt_parent_1',
      newStatus: 'done',
      containerId: 'work_list',
    });
    expect(get().tasks.find((t) => t.id === googleTask.id)?.status).toBe('done');

    adapter.nextError = new Error('Network offline');
    const failed = await transitionTask(get, set, adapter, githubTask.id, 'in_progress');
    expect(failed.success).toBe(false);
    expect(failed.error).toContain('Network offline');
    expect(get().tasks.find((t) => t.id === githubTask.id)?.status).toBe('todo');
  });

  it('keeps GitHub Done transitions local-only and applies labels on todo/in_progress transitions', async () => {
    const { get, set, adapter } = createTestHarness([githubTask]);

    await transitionTask(get, set, adapter, githubTask.id, 'in_progress');
    expect(adapter.transitions).toHaveLength(1);
    expect(adapter.transitions[0].targetLabel).toBe('in-progress');
    const inProgLabels = get().tasks[0].sourceMeta.labels?.map((l) => l.name);
    expect(inProgLabels).toEqual(['in-progress']);

    await transitionTask(get, set, adapter, githubTask.id, 'done');
    expect(adapter.transitions).toHaveLength(1);
    expect(get().tasks[0].status).toBe('done');
  });

  it('computes GitHub workflow labels uniformly for transitions and bulk sync', () => {
    const updated = applyGitHubLabelsForStatus(
      [{ name: 'to-do', color: '0075ca' }, { name: 'bug', color: 'd73a4a' }],
      'in_progress',
      defaultGithubSettings
    );
    expect(updated.map((l) => l.name)).toEqual(['bug', 'in-progress']);
  });

  it('updates deadlines across providers via opaque task IDs and reconciles server-confirmed descriptions', async () => {
    const { get, set, adapter } = createTestHarness([githubTask, googleTask, microsoftTask]);

    adapter.nextDeadlineResult = {
      dueDate: '2026-11-20T23:59:59Z',
      updatedDescription: 'Server merged body\n\n> ⏱️ **Widkanban Deadline**: 2026-11-20T23:59:59Z',
    };

    const ghRes = await setTaskDeadline(
      get,
      set,
      adapter,
      githubTask.id,
      '2026-11-20T23:59:59Z',
      'review'
    );
    expect(ghRes.success).toBe(true);
    expect(adapter.deadlineUpdates[0].taskId).toBe('gh_42');
    const updatedGh = get().tasks.find((t) => t.id === 'gh_42')!;
    expect(updatedGh.description).toContain('Server merged body');
    expect(updatedGh.sourceMeta.dueDate).toBe('2026-11-20T23:59:59Z');

    adapter.nextDeadlineResult = { dueDate: '2026-11-21T00:00:00.000Z' };
    const gtRes = await setTaskDeadline(
      get,
      set,
      adapter,
      googleTask.id,
      '2026-11-21T00:00:00.000Z'
    );
    expect(gtRes.success).toBe(true);
    expect(adapter.deadlineUpdates[1].taskId).toBe('gt_parent_1');
    expect(adapter.deadlineUpdates[1].containerId).toBe('work_list');
    expect(get().tasks.find((t) => t.id === 'gt_parent_1')?.sourceMeta.dueDate).toBe(
      '2026-11-21T00:00:00.000Z'
    );

    const msRes = await setTaskDeadline(get, set, adapter, microsoftTask.id, '2026-11-21');
    expect(msRes.success).toBe(false);
  });

  it('handles local trash and remote deletion atomically without leaving broken state on failure', async () => {
    const { get, set, adapter } = createTestHarness([githubTask, googleTask]);

    adapter.nextError = new Error('GitHub 403 Forbidden');
    const failedRemote = await removeTask(get, set, adapter, githubTask.id, {
      mode: 'remote',
      remoteMode: 'permanent',
    });
    expect(failedRemote.success).toBe(false);
    expect(get().tasks.some((t) => t.id === githubTask.id)).toBe(true);
    expect(get().locallyDeletedTasks).toHaveLength(0);

    const closeRes = await removeTask(get, set, adapter, githubTask.id, {
      mode: 'remote',
      remoteMode: 'close',
      reason: 'Superseded',
      duplicateOf: 99,
    });
    expect(closeRes.success).toBe(true);
    expect(adapter.remoteDeletions[1].mode).toBe('close');
    expect(adapter.remoteDeletions[1].duplicateOf).toBe(99);
    expect(get().tasks.some((t) => t.id === githubTask.id)).toBe(false);
    expect(get().locallyDeletedTasks.some((t) => t.id === githubTask.id)).toBe(true);
  });

  it('mutates Google subtasks through the unified seam and blocks read-only Microsoft subtasks', async () => {
    const { get, set, adapter } = createTestHarness([googleTask, microsoftTask]);

    await toggleSubtask(get, set, adapter, googleTask.id, 'gt_sub_1');
    expect(adapter.subtaskMutations[0].action).toBe('toggle');
    expect(get().tasks[0].sourceMeta.subtasks?.[0].status).toBe('done');

    adapter.nextCreatedSubtask = { id: 'gt_sub_remote', title: 'Verify seam', status: 'todo' };
    const created = await createSubtask(get, set, adapter, googleTask.id, 'Verify seam');
    expect(created?.id).toBe('gt_sub_remote');
    expect(get().tasks[0].sourceMeta.subtaskCount).toBe(2);

    await deleteSubtask(get, set, adapter, googleTask.id, 'gt_sub_1');
    expect(get().tasks[0].sourceMeta.subtaskCount).toBe(1);

    const msToggle = await toggleSubtask(get, set, adapter, microsoftTask.id, 'c1');
    expect(msToggle.success).toBe(false);
  });

  it('filters locallyDeletedTasks consistently across all providers during syncProviderTasks', async () => {
    const { get, set, adapter } = createTestHarness([], [googleTask]);
    const activeGoogle: UnifiedTask = { ...googleTask, id: 'gt_active_2', title: 'Active' };
    adapter.tasksByProvider.google_tasks = [googleTask, activeGoogle];

    await syncProviderTasks(get, set, adapter, 'google_tasks');
    const syncedIds = get().tasks.map((t) => t.id);
    expect(syncedIds).toEqual(['gt_active_2']);
  });
});
