export type TaskSource = 'github' | 'google_tasks';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface UnifiedTask {
  id: string;             // e.g., 'gh_102' or 'gt_abc123'
  title: string;
  source: TaskSource;
  status: TaskStatus;
  url: string;            // Direct link to issue/task
  updatedAt: string;
  sourceMeta: {
    repo?: string;
    issueNumber?: number;
    labels?: string[];
    listId?: string;
    notes?: string;
    dueDate?: string;
  };
}
