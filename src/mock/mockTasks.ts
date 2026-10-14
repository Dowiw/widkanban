import { UnifiedTask } from '../types/task';

export const INITIAL_MOCK_TASKS: UnifiedTask[] = [
  {
    id: 'gt_201',
    title: 'Review Google Tasks API free tier rate limits & quota',
    source: 'google_tasks',
    status: 'todo',
    url: 'https://tasks.google.com',
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    sourceMeta: {
      listId: 'work_deliverables',
      notes: 'Ensure 3-minute background poll fits within daily quota limits.',
      dueDate: 'Today',
    },
  },
  {
    id: 'gt_202',
    title: 'Design glassmorphic widget backdrop & dark UI theme',
    source: 'google_tasks',
    status: 'in_progress',
    url: 'https://tasks.google.com',
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    sourceMeta: {
      listId: 'ui_design',
      notes: 'Use dark slate tones with subtle neon glow on card drag.',
      dueDate: 'Tomorrow',
    },
  },
  {
    id: 'gt_203',
    title: 'Finalize WidKanban Phase 1 technical specification',
    source: 'google_tasks',
    status: 'done',
    url: 'https://tasks.google.com',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    sourceMeta: {
      listId: 'specifications',
      notes: 'UnifiedTask schema defined & approved.',
    },
  },
];
