export type TaskSource = 'github' | 'google_tasks';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | (string & {});

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

export interface PRBranchInfo {
  headRef: string;          // e.g. "feat/smart-due-date"
  baseRef: string;          // e.g. "main"
  isFork?: boolean;         // true if head repo is an external fork
  headRepo?: string;        // e.g. "contributor/widkanban"
  isDraft?: boolean;        // true if draft PR
  additions?: number;       // e.g. 142
  deletions?: number;       // e.g. 38
  changedFiles?: number;    // e.g. 4
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
    branchInfo?: PRBranchInfo;
  };
}

export interface AuthStatus {
  has_github: boolean;
  has_google: boolean;
  github_from_env?: boolean;
  google_from_env?: boolean;
}

export interface GitHubSyncSettings {
  manageLabels: boolean;             // Master toggle for repo label management
  todoLabel: string;                 // Default "to-do" (empty for no label)
  inProgressLabel: string;           // Default "in-progress" (empty for no label)
  postCommentsFallback: boolean;     // Opt-in comment fallback when labels cannot be applied
  hasPromptedSetup: boolean;         // Tracks whether first-time setup dialog was shown
}

export interface RepoLabelsResult {
  repo: string;
  actualTodoLabel: string;
  actualInProgressLabel: string;
  createdLabels: string[];
}

export type DeleteActionType = 'local' | 'github_close' | 'github_permanent';

export interface DeletePreference {
  action: DeleteActionType;
  remember: boolean;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type FontFamilyOption = 'outfit' | 'unifont' | 'system' | 'mono';
export type CardDensity = 'compact' | 'normal' | 'relaxed';

export interface WidgetCustomizationSettings {
  // Appearance
  theme: ThemeMode;
  cornerRadius: number; // 0 to 32px (0 = sharp)
  fontFamily: FontFamilyOption;

  // Advanced & Layout
  columnHeaderHeight: number; // 24 to 56px (default 36px)
  columnHeaderFontSize: 'xs' | 'sm' | 'base';
  columnMinWidth: number; // 200 to 400px (default 260px)
  cardDensity: CardDensity;

  // Window Defaults
  defaultWidth: number;
  defaultHeight: number;
  rememberWindowPlacement: boolean;
}

export const DEFAULT_CUSTOMIZATION_SETTINGS: WidgetCustomizationSettings = {
  theme: 'system',
  cornerRadius: 16,
  fontFamily: 'outfit',
  columnHeaderHeight: 36,
  columnHeaderFontSize: 'xs',
  columnMinWidth: 260,
  cardDensity: 'normal',
  defaultWidth: 380,
  defaultHeight: 680,
  rememberWindowPlacement: true,
};

export type ColumnColor =
  | 'slate'
  | 'indigo'
  | 'amber'
  | 'purple'
  | 'rose'
  | 'cyan'
  | 'emerald'
  | 'sky'
  | 'blue';

export interface ColumnActionTrigger {
  githubAddLabel?: string;
  githubRemoveLabel?: string;
  githubState?: 'open' | 'closed';
  googleStatus?: 'needsAction' | 'completed';
  microsoftStatus?: 'notStarted' | 'inProgress' | 'completed';
}

export interface ColumnReverseRoutingRule {
  githubLabels?: string[];
  googleStatus?: 'needsAction' | 'completed';
  microsoftStatus?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  color: ColumnColor;
  isSystem?: boolean;
  triggers?: ColumnActionTrigger;
  routingRules?: ColumnReverseRoutingRule;
}

export const DEFAULT_COLUMNS: BoardColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'sky',
    isSystem: true,
    routingRules: {
      githubLabels: ['to-do', 'todo', 'backlog'],
      googleStatus: 'needsAction',
    },
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'rose',
    isSystem: true,
    routingRules: {
      githubLabels: ['in-progress', 'in progress', 'wip', 'doing'],
    },
  },
  {
    id: 'done',
    title: 'Done',
    color: 'emerald',
    isSystem: true,
    routingRules: {
      githubLabels: ['done', 'closed'],
      googleStatus: 'completed',
    },
  },
];

export const COLUMN_PRESETS: { name: string; description: string; columns: BoardColumn[] }[] = [
  {
    name: 'Default 3-Column',
    description: 'Standard Kanban workflow (To Do, In Progress, Done)',
    columns: DEFAULT_COLUMNS,
  },
  {
    name: 'Developer Workflow',
    description: 'Backlog, To Do, In Progress, Review, and Done',
    columns: [
      {
        id: 'backlog',
        title: 'Backlog',
        color: 'slate',
        triggers: { githubAddLabel: 'backlog', githubRemoveLabel: 'to-do' },
        routingRules: { githubLabels: ['backlog'] },
      },
      {
        id: 'todo',
        title: 'To Do',
        color: 'sky',
        triggers: { githubAddLabel: 'to-do', githubRemoveLabel: 'in-progress', googleStatus: 'needsAction' },
        routingRules: { githubLabels: ['to-do', 'todo'] },
      },
      {
        id: 'in_progress',
        title: 'In Progress',
        color: 'rose',
        triggers: { githubAddLabel: 'in-progress', githubRemoveLabel: 'to-do', googleStatus: 'needsAction' },
        routingRules: { githubLabels: ['in-progress', 'wip'] },
      },
      {
        id: 'review',
        title: 'In Review',
        color: 'purple',
        triggers: { githubAddLabel: 'needs-review', githubRemoveLabel: 'in-progress' },
        routingRules: { githubLabels: ['needs-review', 'in-review', 'review'] },
      },
      {
        id: 'done',
        title: 'Done',
        color: 'emerald',
        triggers: { githubState: 'closed', googleStatus: 'completed' },
        routingRules: { githubLabels: ['done'], googleStatus: 'completed' },
      },
    ],
  },
  {
    name: 'Team Agile',
    description: 'Backlog, Ready, Active, QA, and Done',
    columns: [
      {
        id: 'backlog',
        title: 'Backlog',
        color: 'slate',
        triggers: { githubAddLabel: 'backlog' },
        routingRules: { githubLabels: ['backlog'] },
      },
      {
        id: 'ready',
        title: 'Ready',
        color: 'cyan',
        triggers: { githubAddLabel: 'ready', githubRemoveLabel: 'backlog' },
        routingRules: { githubLabels: ['ready', 'sprint-ready'] },
      },
      {
        id: 'active',
        title: 'Active',
        color: 'amber',
        triggers: { githubAddLabel: 'in-progress', googleStatus: 'needsAction' },
        routingRules: { githubLabels: ['in-progress', 'active'] },
      },
      {
        id: 'qa',
        title: 'QA / Testing',
        color: 'indigo',
        triggers: { githubAddLabel: 'qa-ready', githubRemoveLabel: 'in-progress' },
        routingRules: { githubLabels: ['qa', 'testing', 'qa-ready'] },
      },
      {
        id: 'done',
        title: 'Done',
        color: 'emerald',
        triggers: { githubState: 'closed', googleStatus: 'completed' },
        routingRules: { githubLabels: ['done'], googleStatus: 'completed' },
      },
    ],
  },
];

