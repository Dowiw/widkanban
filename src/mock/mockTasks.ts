import { UnifiedTask } from '../types/task';

const now = Date.now();
const oneDayMs = 86400000;

export const INITIAL_MOCK_TASKS: UnifiedTask[] = [
  {
    id: 'gt_201',
    title: 'Review Google Tasks API free tier rate limits & quota',
    source: 'google_tasks',
    status: 'todo',
    url: 'https://tasks.google.com',
    updatedAt: new Date(now - 3600000 * 12).toISOString(),
    description: 'Ensure 3-minute background poll fits within daily quota limits.\nVerify write-back PATCH latency.',
    sourceMeta: {
      listId: 'work_deliverables',
      listTitle: 'Work Deliverables',
      notes: 'Ensure 3-minute background poll fits within daily quota limits.\nVerify write-back PATCH latency.',
      dueDate: new Date(now).toISOString(), // Today
      hasSubtasks: true,
      subtaskCount: 2,
      subtasks: [
        { id: 'gt_sub_1', title: 'Check daily request quota limit in Google Cloud Console', status: 'done' },
        { id: 'gt_sub_2', title: 'Verify burst rate limit for rapid drag-and-drop', status: 'todo' },
      ],
    },
  },
  {
    id: 'gt_202',
    title: 'Design glassmorphic widget backdrop & dark UI theme',
    source: 'google_tasks',
    status: 'in_progress',
    url: 'https://tasks.google.com',
    updatedAt: new Date(now - 3600000 * 2).toISOString(),
    description: 'Use dark slate tones with subtle neon glow on card drag and smooth CSS transitions.',
    sourceMeta: {
      listId: 'ui_design',
      listTitle: 'Design System',
      notes: 'Use dark slate tones with subtle neon glow on card drag and smooth CSS transitions.',
      dueDate: new Date(now + oneDayMs).toISOString(), // Tomorrow
      links: [
        {
          description: 'Design review thread in Gmail',
          link: 'https://mail.google.com',
          linkType: 'email',
        },
      ],
    },
  },
  {
    id: 'gt_203',
    title: 'Finalize WidKanban Phase 1 technical specification',
    source: 'google_tasks',
    status: 'done',
    url: 'https://tasks.google.com',
    updatedAt: new Date(now - 3600000 * 24).toISOString(),
    description: 'UnifiedTask schema defined, tested, and validated.',
    sourceMeta: {
      listId: 'specifications',
      listTitle: 'Engineering Specs',
      notes: 'UnifiedTask schema defined, tested, and validated.',
    },
  },
];
