import { SubtaskItem, TaskCapabilities, UnifiedTask } from '../types/task';

/**
 * Derives normalized action capabilities and display labels for any UnifiedTask,
 * keeping provider-specific metadata checks out of UI components.
 */
export function getTaskCapabilities(task: UnifiedTask): TaskCapabilities {
  const meta = task.sourceMeta ?? {};

  if (task.source === 'github') {
    const hasRemoteRepo = Boolean(meta.repo && meta.issueNumber);
    const containerLabel = hasRemoteRepo
      ? `${meta.repo}#${meta.issueNumber}`
      : meta.isPullRequest
      ? 'Pull Request'
      : 'Issue';

    return {
      canEditDeadline: hasRemoteRepo,
      canManageSubtasks: false,
      supportedRemoteDeleteModes: hasRemoteRepo ? ['close', 'permanent'] : [],
      containerLabel,
      deadlinePopoverTitle: meta.isPullRequest ? 'PR Review Due' : 'Issue Deadline',
      supportsDeadlineTypeToggle: true,
      supportsDateTimePicker: true,
    };
  }

  if (task.source === 'google_tasks') {
    const hasList = Boolean(meta.listId);
    return {
      canEditDeadline: hasList,
      canManageSubtasks: hasList,
      supportedRemoteDeleteModes: [],
      containerLabel: meta.listTitle || 'Google Task',
      deadlinePopoverTitle: 'Google Task Due Date',
      supportsDeadlineTypeToggle: false,
      supportsDateTimePicker: false,
    };
  }

  // microsoft_teams
  const fallbackLabel = meta.isAssignment
    ? 'Teams Assignment'
    : meta.isPlanner
    ? 'Planner'
    : meta.isFlaggedEmail
    ? 'Flagged Email'
    : 'Microsoft 365';

  return {
    canEditDeadline: false,
    canManageSubtasks: false,
    supportedRemoteDeleteModes: [],
    containerLabel: meta.teamName || meta.courseName || fallbackLabel,
    deadlinePopoverTitle: 'Task Deadline',
    supportsDeadlineTypeToggle: false,
    supportsDateTimePicker: false,
  };
}

export function isSubtaskDone(subtask: SubtaskItem): boolean {
  return subtask.status === 'done' || (subtask.status as string) === 'completed';
}

export function countCompletedSubtasks(subtasks?: SubtaskItem[]): {
  completed: number;
  total: number;
} {
  if (!subtasks || subtasks.length === 0) {
    return { completed: 0, total: 0 };
  }
  const completed = subtasks.filter(isSubtaskDone).length;
  return { completed, total: subtasks.length };
}
