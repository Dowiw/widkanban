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
  {
    id: 'ms_301',
    title: 'CS 450: Lab 3 - Network Packet Inspection & Routing',
    source: 'microsoft_teams',
    status: 'todo',
    url: 'https://teams.microsoft.com/l/entity/66aeee93-507d-479a-a3ef-ba44ac2e7735/classroom',
    updatedAt: new Date(now - 3600000 * 6).toISOString(),
    description: 'Complete Wireshark capture analysis for TCP three-way handshake and submit PDF report.',
    sourceMeta: {
      teamName: 'CS 450 Computer Networks',
      courseName: 'CS 450 Computer Networks',
      assignmentId: 'assign_wireshark_03',
      isAssignment: true,
      dueDate: new Date(now + oneDayMs * 2).toISOString(),
      submissionUrl: 'https://teams.microsoft.com/l/entity/66aeee93-507d-479a-a3ef-ba44ac2e7735/classroom',
    },
  },
  {
    id: 'ms_302',
    title: 'Migrate OAuth PKCE loopback listener to dynamic port',
    source: 'microsoft_teams',
    status: 'in_progress',
    url: 'https://tasks.office.com/',
    updatedAt: new Date(now - 3600000 * 3).toISOString(),
    description: 'Update Microsoft Entra app registration redirect URIs and verify local TCP listener.',
    sourceMeta: {
      teamName: 'Infrastructure & Auth',
      isPlanner: true,
      percentComplete: 65,
      dueDate: new Date(now + oneDayMs).toISOString(),
      hasSubtasks: true,
      subtaskCount: 3,
      subtasks: [
        { id: 'ms_sub_1', title: 'Register http://localhost/callback redirect in Entra', status: 'done' },
        { id: 'ms_sub_2', title: 'Add PKCE code_verifier and code_challenge generators', status: 'done' },
        { id: 'ms_sub_3', title: 'Test multi-tenant token exchange with personal Outlook account', status: 'todo' },
      ],
    },
  },
  {
    id: 'ms_303',
    title: 'Follow up on Microsoft Graph Tenant Admin consent request',
    source: 'microsoft_teams',
    status: 'todo',
    url: 'https://outlook.office.com/mail/',
    updatedAt: new Date(now - 3600000 * 8).toISOString(),
    description: 'Respond to IT department regarding Organization-wide Tasks.ReadWrite scope approval.',
    sourceMeta: {
      listId: 'flaggedEmails',
      listTitle: 'Flagged Emails',
      isFlaggedEmail: true,
      dueDate: new Date(now).toISOString(),
    },
  },
];
