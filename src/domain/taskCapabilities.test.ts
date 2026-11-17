import { describe, it, expect } from 'vitest';
import {
  countCompletedSubtasks,
  getTaskCapabilities,
  isSubtaskDone,
} from './taskCapabilities';
import { UnifiedTask } from '../types/task';

describe('taskCapabilities', () => {
  it('derives deadline editing and remote delete capabilities for GitHub issues with repo metadata', () => {
    const task: UnifiedTask = {
      id: 'gh_10',
      title: 'Fix auth seam',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/Dowiw/widkanban/issues/10',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: { repo: 'Dowiw/widkanban', issueNumber: 10, isPullRequest: false },
    };

    const caps = getTaskCapabilities(task);
    expect(caps.canEditDeadline).toBe(true);
    expect(caps.canManageSubtasks).toBe(false);
    expect(caps.supportedRemoteDeleteModes).toEqual(['close', 'permanent']);
    expect(caps.containerLabel).toBe('Dowiw/widkanban#10');
    expect(caps.deadlinePopoverTitle).toBe('Issue Deadline');
    expect(caps.supportsDeadlineTypeToggle).toBe(true);
  });

  it('derives PR review title for GitHub pull requests', () => {
    const task: UnifiedTask = {
      id: 'gh_11',
      title: 'Review PR',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/Dowiw/widkanban/pull/11',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: { repo: 'Dowiw/widkanban', issueNumber: 11, isPullRequest: true },
    };

    expect(getTaskCapabilities(task).deadlinePopoverTitle).toBe('PR Review Due');
  });

  it('derives deadline and subtask management capabilities for Google Tasks with listId', () => {
    const task: UnifiedTask = {
      id: 'gt_50',
      title: 'Buy milk',
      source: 'google_tasks',
      status: 'todo',
      url: 'https://tasks.google.com',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: { listId: 'list_1', listTitle: 'Errands' },
    };

    const caps = getTaskCapabilities(task);
    expect(caps.canEditDeadline).toBe(true);
    expect(caps.canManageSubtasks).toBe(true);
    expect(caps.supportedRemoteDeleteModes).toEqual([]);
    expect(caps.containerLabel).toBe('Errands');
    expect(caps.supportsDeadlineTypeToggle).toBe(false);
  });

  it('marks Microsoft 365 checklist items as read-only and counts both canonical and legacy done states', () => {
    const task: UnifiedTask = {
      id: 'ms_todo_1',
      title: 'Sprint notes',
      source: 'microsoft_teams',
      status: 'todo',
      url: 'https://to-do.office.com',
      updatedAt: '2026-11-16T00:00:00Z',
      sourceMeta: {
        teamName: 'Platform',
        subtasks: [
          { id: 's1', title: 'Step 1', status: 'done' },
          { id: 's2', title: 'Step 2', status: 'todo' },
          { id: 's3', title: 'Legacy persisted item', status: 'completed' as unknown as 'done' },
        ],
      },
    };

    const caps = getTaskCapabilities(task);
    expect(caps.canManageSubtasks).toBe(false);
    expect(caps.canEditDeadline).toBe(false);
    expect(caps.supportedRemoteDeleteModes).toEqual([]);
    expect(caps.containerLabel).toBe('Platform');

    expect(isSubtaskDone(task.sourceMeta.subtasks![0])).toBe(true);
    expect(isSubtaskDone(task.sourceMeta.subtasks![1])).toBe(false);
    expect(countCompletedSubtasks(task.sourceMeta.subtasks)).toEqual({ completed: 2, total: 3 });
  });
});
