import { describe, it, expect } from 'vitest';
import {
  getSmartDueDate,
  filterAndSortTasks,
  getDeadlineCounts,
  parseTaskDueDate,
  updateDescriptionWithDeadlineTag,
} from './deadline';
import { UnifiedTask } from '../types/task';

function formatGoogleDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00.000Z`;
}

describe('deadline utilities', () => {
  it('parses Google Tasks UTC-midnight date strings as local calendar dates', () => {
    const todayGoogle = formatGoogleDateString(0);
    const tomorrowGoogle = formatGoogleDateString(1);
    const in4DaysGoogle = formatGoogleDateString(4);
    const yesterdayGoogle = formatGoogleDateString(-1);

    const parsedToday = parseTaskDueDate(todayGoogle);
    expect(parsedToday?.isDateOnly).toBe(true);

    const todayDue = getSmartDueDate(todayGoogle, 'todo');
    expect(todayDue?.label).toBe('Today');
    expect(todayDue?.urgency).toBe('today');
    expect(todayDue?.isDueToday).toBe(true);
    expect(todayDue?.relativeText).toBe('Due today');

    const tomorrowDue = getSmartDueDate(tomorrowGoogle, 'todo');
    expect(tomorrowDue?.label).toBe('Tomorrow');
    expect(tomorrowDue?.urgency).toBe('upcoming');
    expect(tomorrowDue?.isDueToday).toBe(false);
    expect(tomorrowDue?.relativeText).toBe('Due tomorrow');

    const in4DaysDue = getSmartDueDate(in4DaysGoogle, 'todo');
    expect(in4DaysDue?.urgency).toBe('upcoming');
    expect(in4DaysDue?.label).toContain(','); // e.g. "Sat, Nov 14"

    const overdueDue = getSmartDueDate(yesterdayGoogle, 'todo');
    expect(overdueDue?.urgency).toBe('overdue');
    expect(overdueDue?.label).toBe('Overdue · 1d');
  });

  it('calculates smart due date urgency correctly', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const overdue = getSmartDueDate(yesterday, 'todo');
    expect(overdue?.urgency).toBe('overdue');
    expect(overdue?.isOverdue).toBe(true);

    const completed = getSmartDueDate(yesterday, 'done');
    expect(completed?.urgency).toBe('completed');
    expect(completed?.isOverdue).toBe(false);

    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const upcoming = getSmartDueDate(farFuture, 'todo');
    expect(upcoming?.urgency).toBe('upcoming');
    expect(upcoming?.isOverdue).toBe(false);
  });

  it('filters tasks by deadline', () => {
    const now = Date.now();
    const sampleTasks: UnifiedTask[] = [
      {
        id: '1',
        title: 'Overdue task',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(now - 48 * 60 * 60 * 1000).toISOString() },
      },
      {
        id: '2',
        title: 'Today task',
        source: 'google_tasks',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(new Date().setHours(23, 59, 59, 0)).toISOString() },
      },
      {
        id: '3',
        title: 'No deadline task',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: {},
      },
    ];

    const overdueFiltered = filterAndSortTasks(sampleTasks, '', 'all', 'overdue', 'none');
    expect(overdueFiltered.map((t) => t.id)).toEqual(['1']);

    const todayFiltered = filterAndSortTasks(sampleTasks, '', 'all', 'today', 'none');
    expect(todayFiltered.map((t) => t.id)).toEqual(['2']);

    const hasDeadline = filterAndSortTasks(sampleTasks, '', 'all', 'has_deadline', 'none');
    expect(hasDeadline.map((t) => t.id)).toEqual(['1', '2']);

    const noDeadline = filterAndSortTasks(sampleTasks, '', 'all', 'no_deadline', 'none');
    expect(noDeadline.map((t) => t.id)).toEqual(['3']);
  });

  it('sorts tasks by deadline (soonest and latest)', () => {
    const now = Date.now();
    const sampleTasks: UnifiedTask[] = [
      {
        id: 'far',
        title: 'Far task',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(now + 10000000).toISOString() },
      },
      {
        id: 'soon',
        title: 'Soon task',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(now + 1000).toISOString() },
      },
      {
        id: 'none',
        title: 'None task',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: {},
      },
    ];

    const soonestSorted = filterAndSortTasks(sampleTasks, '', 'all', 'all', 'soonest');
    expect(soonestSorted.map((t) => t.id)).toEqual(['soon', 'far', 'none']);

    const latestSorted = filterAndSortTasks(sampleTasks, '', 'all', 'all', 'latest');
    expect(latestSorted.map((t) => t.id)).toEqual(['far', 'soon', 'none']);
  });

  it('calculates deadline metrics counts accurately', () => {
    const now = Date.now();
    const sampleTasks: UnifiedTask[] = [
      {
        id: '1',
        title: 'Overdue',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(now - 72 * 60 * 60 * 1000).toISOString() },
      },
      {
        id: '2',
        title: 'Today',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: { dueDate: new Date(new Date().setHours(23, 59, 59, 0)).toISOString() },
      },
      {
        id: '3',
        title: 'None',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date(now).toISOString(),
        sourceMeta: {},
      },
    ];

    const counts = getDeadlineCounts(sampleTasks);
    expect(counts.total).toBe(3);
    expect(counts.hasDeadline).toBe(2);
    expect(counts.overdue).toBe(1);
    expect(counts.today).toBe(1);
    expect(counts.thisWeek).toBe(1);
  });

  it('consistently counts and filters Google Tasks UTC-midnight deadlines', () => {
    const now = new Date().toISOString();
    const googleTasks: UnifiedTask[] = [
      {
        id: 'gt-today',
        title: 'Due Today Task',
        source: 'google_tasks',
        status: 'todo',
        url: '',
        updatedAt: now,
        sourceMeta: { dueDate: formatGoogleDateString(0) },
      },
      {
        id: 'gt-tomorrow',
        title: 'Chicken expires',
        source: 'google_tasks',
        status: 'todo',
        url: '',
        updatedAt: now,
        sourceMeta: { dueDate: formatGoogleDateString(1) },
      },
      {
        id: 'gt-sat',
        title: 'GUI Class Week 1',
        source: 'google_tasks',
        status: 'todo',
        url: '',
        updatedAt: now,
        sourceMeta: { dueDate: formatGoogleDateString(4) },
      },
    ];

    const counts = getDeadlineCounts(googleTasks);
    expect(counts.today).toBe(1);
    expect(counts.thisWeek).toBe(3);
    expect(counts.overdue).toBe(0);

    const todayFiltered = filterAndSortTasks(googleTasks, '', 'all', 'today', 'none');
    expect(todayFiltered.map((t) => t.id)).toEqual(['gt-today']);

    const thisWeekFiltered = filterAndSortTasks(googleTasks, '', 'all', 'this_week', 'soonest');
    expect(thisWeekFiltered.map((t) => t.id)).toEqual(['gt-today', 'gt-tomorrow', 'gt-sat']);
  });

  it('syncs Widkanban Deadline tag in description text when setting, updating, or clearing', () => {
    const initial = 'Fix bug in parser';
    const withDeadline = updateDescriptionWithDeadlineTag(initial, '2026-11-11T22:59:59.999Z', 'deadline');
    expect(withDeadline).toContain('Fix bug in parser');
    expect(withDeadline).toContain('> ⏱️ **Widkanban Deadline**: 2026-11-11T22:59:59.999Z');

    const updatedDeadline = updateDescriptionWithDeadlineTag(
      withDeadline,
      '2026-11-13T22:59:59.999Z',
      'review'
    );
    expect(updatedDeadline).not.toContain('2026-11-11T22:59:59.999Z');
    expect(updatedDeadline).toContain('> ⏱️ **Widkanban Deadline**: 2026-11-13T22:59:59.999Z');
    expect(updatedDeadline).toContain('"type":"review"');

    const cleared = updateDescriptionWithDeadlineTag(updatedDeadline, null);
    expect(cleared).toBe('Fix bug in parser');
  });
});
