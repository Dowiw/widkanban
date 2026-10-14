export type TaskSource = 'github' | 'google_tasks';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface GitHubLabel {
  name: string;
  color: string;       // 6-character hex code from GitHub (e.g., "d73a4a")
  description?: string;
}

export interface TaskUser {
  login: string;
  avatarUrl: string;
}

export interface TaskLink {
  description?: string;
  link: string;
  linkType?: 'email' | 'calendar' | 'generic';
}

export interface SubtaskItem {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface UnifiedTask {
  id: string;             // e.g., 'gh_102' or 'gt_abc123'
  title: string;
  source: TaskSource;
  status: TaskStatus;
  url: string;            // Direct link to issue/task
  updatedAt: string;
  description?: string;   // Markdown body or task notes

  sourceMeta: {
    // --- Google Tasks ---
    listId?: string;
    listTitle?: string;
    notes?: string;
    dueDate?: string;            // RFC 3339 timestamp (e.g. "2026-10-15T00:00:00.000Z")
    parentId?: string;
    hasSubtasks?: boolean;
    subtaskCount?: number;
    subtasks?: SubtaskItem[];
    links?: TaskLink[];

    // --- GitHub ---
    repo?: string;               // e.g. "org/repo"
    issueNumber?: number;
    isPullRequest?: boolean;     // Distinction between Issue and PR
    commentsCount?: number;
    milestone?: {
      title: string;
      dueOn?: string;
    };
    author?: TaskUser;
    assignees?: TaskUser[];
    labels?: GitHubLabel[];
  };
}

export interface AuthStatus {
  has_github: boolean;
  has_google: boolean;
}
