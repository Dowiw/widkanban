import { UnifiedTask, TaskSource, TaskStatus, DeadlineFilterOption, DeadlineSortOption } from '../types/task';

export interface SmartDueDate {
  label: string;
  urgency: 'overdue' | 'today' | 'upcoming' | 'completed';
  relativeText: string;
  formattedExact: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // < 24 hours
}

export function getSmartDueDate(dueDateStr?: string, status?: TaskStatus): SmartDueDate | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) {
    return {
      label: dueDateStr,
      urgency: 'upcoming',
      relativeText: dueDateStr,
      formattedExact: dueDateStr,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
    };
  }

  const now = new Date();
  const formattedExact = due.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (status === 'done') {
    const shortDate = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      label: shortDate,
      urgency: 'completed',
      relativeText: `Completed (Due was ${shortDate})`,
      formattedExact,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
    };
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const dueTime = due.getTime();
  const diffMs = dueTime - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor((dueTime - todayStart) / (1000 * 60 * 60 * 24));

  const shortDate = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (dueTime < todayStart) {
    const overdueDays = Math.max(1, Math.abs(diffDays));
    return {
      label: overdueDays === 1 ? 'Overdue · 1d' : `Overdue · ${overdueDays}d`,
      urgency: 'overdue',
      relativeText: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      formattedExact,
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
    };
  }

  if (dueTime <= todayEnd || (diffHours >= 0 && diffHours <= 24)) {
    let label = 'Today';
    let relativeText = 'Due today';
    if (diffHours > 0 && diffHours <= 24) {
      relativeText = `Due in ${diffHours}h`;
      label = diffHours <= 6 ? `Due in ${diffHours}h` : 'Today';
    } else if (diffHours <= 0) {
      label = 'Due today';
    }
    return {
      label,
      urgency: 'today',
      relativeText,
      formattedExact,
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
    };
  }

  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      urgency: 'upcoming',
      relativeText: 'Due tomorrow',
      formattedExact,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: diffHours <= 24,
    };
  }

  if (diffDays > 1 && diffDays < 7) {
    const weekday = due.toLocaleDateString(undefined, { weekday: 'short' });
    return {
      label: `Due ${weekday}`,
      urgency: 'upcoming',
      relativeText: `Due on ${weekday} (${shortDate})`,
      formattedExact,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: false,
    };
  }

  return {
    label: shortDate,
    urgency: 'upcoming',
    relativeText: `Due ${shortDate}`,
    formattedExact,
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
  };
}

export function filterAndSortTasks(
  tasks: UnifiedTask[],
  searchQuery: string,
  filterSource: 'all' | TaskSource,
  deadlineFilter: DeadlineFilterOption,
  deadlineSort: DeadlineSortOption
): UnifiedTask[] {
  const query = searchQuery.toLowerCase().trim();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const thisWeekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

  const filtered = tasks.filter((task) => {
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchRepo = task.sourceMeta?.repo?.toLowerCase().includes(query) ?? false;
      const matchNotes = task.sourceMeta?.notes?.toLowerCase().includes(query) ?? false;
      if (!matchTitle && !matchRepo && !matchNotes) {
        return false;
      }
    }

    if (filterSource !== 'all' && task.source !== filterSource) {
      return false;
    }

    if (deadlineFilter === 'all') return true;
    if (deadlineFilter === 'has_deadline') return Boolean(task.sourceMeta?.dueDate);
    if (deadlineFilter === 'no_deadline') return !task.sourceMeta?.dueDate;

    if (!task.sourceMeta?.dueDate) return false;
    const dueTime = new Date(task.sourceMeta.dueDate).getTime();
    if (isNaN(dueTime)) return false;

    if (deadlineFilter === 'overdue') {
      return dueTime < todayStart && task.status !== 'done';
    }
    if (deadlineFilter === 'today') {
      return dueTime >= todayStart && dueTime <= todayEnd;
    }
    if (deadlineFilter === 'this_week') {
      return dueTime >= todayStart && dueTime <= thisWeekEnd;
    }

    return true;
  });

  if (deadlineSort === 'none') {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    if (deadlineSort === 'soonest') {
      const aDue = a.sourceMeta?.dueDate ? new Date(a.sourceMeta.dueDate).getTime() : Infinity;
      const bDue = b.sourceMeta?.dueDate ? new Date(b.sourceMeta.dueDate).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return 0;
    }
    if (deadlineSort === 'latest') {
      const aDue = a.sourceMeta?.dueDate ? new Date(a.sourceMeta.dueDate).getTime() : -Infinity;
      const bDue = b.sourceMeta?.dueDate ? new Date(b.sourceMeta.dueDate).getTime() : -Infinity;
      if (aDue !== bDue) return bDue - aDue;
      return 0;
    }
    if (deadlineSort === 'updated') {
      const aUp = new Date(a.updatedAt).getTime();
      const bUp = new Date(b.updatedAt).getTime();
      return bUp - aUp;
    }
    if (deadlineSort === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });
}

export function getDeadlineCounts(tasks: UnifiedTask[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const thisWeekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let hasDeadline = 0;

  for (const t of tasks) {
    if (t.sourceMeta?.dueDate) {
      hasDeadline++;
      const time = new Date(t.sourceMeta.dueDate).getTime();
      if (!isNaN(time)) {
        if (time < todayStart && t.status !== 'done') {
          overdue++;
        } else if (time >= todayStart && time <= todayEnd) {
          today++;
        } else if (time >= todayStart && time <= thisWeekEnd) {
          thisWeek++;
        }
      }
    }
  }

  return {
    overdue,
    today,
    thisWeek,
    hasDeadline,
    total: tasks.length,
  };
}
