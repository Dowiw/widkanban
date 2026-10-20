import { describe, it, expect } from 'vitest';
import { getSmartDueDate, filterAndSortTasks, getDeadlineCounts } from './deadline';
import { UnifiedTask } from '../types/task';

describe('deadline utilities', () => {
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
        sourceMeta: { dueDate: new Date(now + 2 * 60 * 60 * 1000).toISOString() },
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
        sourceMeta: { dueDate: new Date(now + 1 * 60 * 60 * 1000).toISOString() },
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
  });
});
