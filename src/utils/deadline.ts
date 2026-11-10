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

export interface ParsedTaskDueDate {
  date: Date;
  isDateOnly: boolean;
}

/**
 * Parses a task due date string into a normalized Date object.
 *
 * Google Tasks API v1 (and date-only strings) only store calendar date information
 * and return RFC 3339 timestamps at UTC midnight (`YYYY-MM-DDT00:00:00.000Z`),
 * while Widkanban date-only tags use `YYYY-MM-DD` or `YYYY-MM-DDT23:59:59Z`.
 *
 * Treating `YYYY-MM-DDT00:00:00.000Z` as a raw UTC timestamp causes two bugs:
 * 1. Tomorrow's midnight (`00:00Z`) is < 24 hours away during the afternoon/evening,
 *    falsely classifying "Due tomorrow" tasks as "Due today / Due in Xh".
 * 2. In timezones west of UTC, `00:00Z` shifts backward into the previous local calendar day.
 *
 * We normalize date-only strings to local end-of-day (`23:59:59.999`) on that exact
 * calendar date (`YYYY-MM-DD`).
 */
export function parseTaskDueDate(dueDateStr?: string): ParsedTaskDueDate | null {
  if (!dueDateStr) return null;
  const trimmed = dueDateStr.trim();
  if (!trimmed) return null;

  // Match YYYY-MM-DD, Google Tasks UTC midnight (YYYY-MM-DDT00:00:00.000Z),
  // or Widkanban date-only end-of-day UTC (YYYY-MM-DDT23:59:59Z)
  const dateOnlyMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(?:00:00:00|23:59:59)(?:\.\d+)?(?:Z|[+-]00:00)?)?$/i
  );

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (!isNaN(localEndOfDay.getTime())) {
      return { date: localEndOfDay, isDateOnly: true };
    }
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return { date: parsed, isDateOnly: false };
}

export function getSmartDueDate(dueDateStr?: string, status?: TaskStatus): SmartDueDate | null {
  if (!dueDateStr) return null;
  const parsed = parseTaskDueDate(dueDateStr);
  if (!parsed) {
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

  const { date: due, isDateOnly } = parsed;
  const now = new Date();
  const formattedExact = isDateOnly
    ? due.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : due.toLocaleString(undefined, {
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

  const todayCal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueCal = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueCal.getTime() - todayCal.getTime()) / (1000 * 60 * 60 * 24));

  const dueTime = due.getTime();
  const diffMs = dueTime - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const shortDate = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (diffDays < 0) {
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

  if (diffDays === 0) {
    let label = 'Today';
    let relativeText = 'Due today';
    if (!isDateOnly) {
      if (diffHours > 0 && diffHours <= 24) {
        relativeText = `Due in ${diffHours}h`;
        label = diffHours <= 6 ? `Due in ${diffHours}h` : 'Today';
      } else if (diffHours <= 0) {
        label = 'Due today';
      }
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
      isDueSoon: !isDateOnly && diffHours >= 0 && diffHours <= 24,
    };
  }

  if (diffDays > 1 && diffDays < 7) {
    const weekday = due.toLocaleDateString(undefined, { weekday: 'short' });
    return {
      label: `${weekday}, ${shortDate}`,
      urgency: 'upcoming',
      relativeText: `Due ${weekday}, ${shortDate}`,
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
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const thisWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).getTime();

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
    const parsedDue = parseTaskDueDate(task.sourceMeta.dueDate);
    if (!parsedDue) return false;
    const dueTime = parsedDue.date.getTime();

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
      const aDue = parseTaskDueDate(a.sourceMeta?.dueDate)?.date.getTime() ?? Infinity;
      const bDue = parseTaskDueDate(b.sourceMeta?.dueDate)?.date.getTime() ?? Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return 0;
    }
    if (deadlineSort === 'latest') {
      const aDue = parseTaskDueDate(a.sourceMeta?.dueDate)?.date.getTime() ?? -Infinity;
      const bDue = parseTaskDueDate(b.sourceMeta?.dueDate)?.date.getTime() ?? -Infinity;
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
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const thisWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).getTime();

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let hasDeadline = 0;

  for (const t of tasks) {
    if (t.sourceMeta?.dueDate) {
      hasDeadline++;
      const parsedDue = parseTaskDueDate(t.sourceMeta.dueDate);
      if (parsedDue) {
        const time = parsedDue.date.getTime();
        if (time < todayStart && t.status !== 'done') {
          overdue++;
        }
        if (time >= todayStart && time <= todayEnd) {
          today++;
        }
        if (time >= todayStart && time <= thisWeekEnd) {
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
