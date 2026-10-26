import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from './useTaskStore';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';
import { UnifiedTask, DEFAULT_AUTOSYNC_SETTINGS, DEFAULT_API_HEALTH_STATE } from '../types/task';

// Access the mocked invoke so we can control its return value per-test
import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

describe('useTaskStore', () => {
  beforeEach(() => {
    // Clear persisted storage between tests to prevent state bleed
    localStorage.clear();

    // Reset the invoke mock to default (returns null → safeInvoke returns null)
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(null);

    // Reset store state before each test
    useTaskStore.setState({
      tasks: INITIAL_MOCK_TASKS,
      searchQuery: '',
      filterSource: 'all',
      isPinned: true,
      isAddTaskOpen: false,
      isSettingsOpen: false,
      hasCompletedOnboarding: false,
      authStatus: { has_github: false, has_google: false },
      autoSyncSettings: DEFAULT_AUTOSYNC_SETTINGS,
      isAutoSyncPromptOpen: false,
      apiHealth: DEFAULT_API_HEALTH_STATE,
      syncBanner: null,
    });
  });

  it('initializes with mock tasks dataset and no github placeholders', () => {
    const state = useTaskStore.getState();
    expect(state.tasks).toHaveLength(INITIAL_MOCK_TASKS.length);
    expect(state.isPinned).toBe(true);
    expect(state.tasks.some((t) => t.source === 'github')).toBe(false);
  });

  it('moves task status from todo to in_progress', () => {
    const { moveTask } = useTaskStore.getState();
    const taskIdToMove = 'gt_201'; // initially 'todo'

    moveTask(taskIdToMove, 'in_progress');

    const updatedTask = useTaskStore.getState().tasks.find((t) => t.id === taskIdToMove);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.status).toBe('in_progress');
  });

  it('moves task status to done', () => {
    const { moveTask } = useTaskStore.getState();
    const taskIdToMove = 'gt_202'; // initially 'in_progress'

    moveTask(taskIdToMove, 'done');

    const updatedTask = useTaskStore.getState().tasks.find((t) => t.id === taskIdToMove);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.status).toBe('done');
  });

  it('fires update_google_task IPC when moving a Google Task', () => {
    const { moveTask } = useTaskStore.getState();
    moveTask('gt_201', 'done');

    expect(mockInvoke).toHaveBeenCalledWith('update_google_task', {
      taskId: '201', // "gt_" prefix stripped
      listId: 'work_deliverables',
      newStatus: 'done',
    });
  });

  it('does NOT fire update_google_task IPC when moving a GitHub issue', () => {
    mockInvoke.mockClear();
    const { addTask, moveTask } = useTaskStore.getState();

    addTask({
      title: 'GitHub issue test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/101',
      sourceMeta: { repo: 'widkanban', issueNumber: 101 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.source === 'github')!;
    moveTask(added.id, 'in_progress');

    const googleUpdateCalls = mockInvoke.mock.calls.filter(
      (call) => call[0] === 'update_google_task'
    );
    expect(googleUpdateCalls).toHaveLength(0);
  });

  it('adds a new GitHub task correctly with rich label metadata', () => {
    const { addTask } = useTaskStore.getState();

    addTask({
      title: 'Fix authentication token refresh',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/999',
      sourceMeta: {
        repo: 'widkanban',
        issueNumber: 999,
        labels: [{ name: 'auth', color: 'd73a4a' }],
        isPullRequest: false,
        commentsCount: 2,
      },
    });

    const tasks = useTaskStore.getState().tasks;
    expect(tasks.length).toBe(INITIAL_MOCK_TASKS.length + 1);

    const createdTask = tasks[0];
    expect(createdTask.title).toBe('Fix authentication token refresh');
    expect(createdTask.id).toContain('gh_');
    expect(createdTask.source).toBe('github');
    expect(createdTask.sourceMeta.labels?.[0].color).toBe('d73a4a');
  });

  it('deletes a task by ID', () => {
    const { deleteTask } = useTaskStore.getState();
    const targetId = 'gt_203';

    deleteTask(targetId);

    const tasks = useTaskStore.getState().tasks;
    expect(tasks.find((t) => t.id === targetId)).toBeUndefined();
    expect(tasks.length).toBe(INITIAL_MOCK_TASKS.length - 1);
  });

  it('updates search query and provider filter state', () => {
    const { setSearchQuery, setFilterSource, togglePin } = useTaskStore.getState();

    setSearchQuery('Google');
    expect(useTaskStore.getState().searchQuery).toBe('Google');

    setFilterSource('google_tasks');
    expect(useTaskStore.getState().filterSource).toBe('google_tasks');

    togglePin();
    expect(useTaskStore.getState().isPinned).toBe(false);
  });

  it('manages settings modal and onboarding state', () => {
    const { setSettingsOpen, setCompletedOnboarding } = useTaskStore.getState();

    expect(useTaskStore.getState().isSettingsOpen).toBe(false);
    expect(useTaskStore.getState().hasCompletedOnboarding).toBe(false);

    setSettingsOpen(true);
    expect(useTaskStore.getState().isSettingsOpen).toBe(true);

    setCompletedOnboarding(true);
    expect(useTaskStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('persists board tasks and filters to localStorage', () => {
    const { addTask, setFilterSource } = useTaskStore.getState();

    addTask({
      title: 'Persistent task test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/100',
      sourceMeta: { repo: 'widkanban' },
    });
    setFilterSource('github');

    const storedData = localStorage.getItem('widkanban-store');
    expect(storedData).not.toBeNull();
    const parsed = JSON.parse(storedData!);
    expect(parsed.state.filterSource).toBe('github');
    expect(parsed.state.tasks.some((t: { title: string }) => t.title === 'Persistent task test')).toBe(true);
  });

  it('fetchGoogleTasks replaces existing google_tasks with fresh API data and keeps GitHub tasks', async () => {
    const sampleGithubTask: UnifiedTask = {
      id: 'gh_custom_99',
      title: 'User GitHub issue',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/99',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'widkanban', issueNumber: 99 },
    };
    useTaskStore.setState({ tasks: [...INITIAL_MOCK_TASKS, sampleGithubTask] });

    const freshGoogleTask: UnifiedTask = {
      id: 'gt_fresh_001',
      title: 'Fresh task from API',
      source: 'google_tasks',
      status: 'todo',
      url: 'https://tasks.googleapis.com/tasks/v1/lists/abc/tasks/fresh_001',
      updatedAt: new Date().toISOString(),
      sourceMeta: { listId: 'abc', listTitle: 'My Tasks' },
    };

    mockInvoke.mockResolvedValueOnce([freshGoogleTask]);

    const { fetchGoogleTasks } = useTaskStore.getState();
    await fetchGoogleTasks();

    const tasks = useTaskStore.getState().tasks;

    expect(tasks.some((t) => t.id === 'gt_fresh_001')).toBe(true);
    expect(tasks.some((t) => t.id === 'gt_201')).toBe(false);
    expect(tasks.some((t) => t.id === 'gt_202')).toBe(false);
    expect(tasks.some((t) => t.id === 'gt_203')).toBe(false);
    expect(tasks.some((t) => t.id === 'gh_custom_99')).toBe(true);
  });

  it('fetchGithubTasks replaces existing GitHub tasks with fresh data and keeps Google tasks', async () => {
    const freshGithubTask: UnifiedTask = {
      id: 'gh_fresh_777',
      title: 'PR: Implement OAuth',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/org/widkanban/pull/777',
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        repo: 'org/widkanban',
        issueNumber: 777,
        isPullRequest: true,
        commentsCount: 5,
        branchInfo: {
          headRef: 'feat/oauth',
          baseRef: 'main',
          isFork: false,
          isDraft: false,
          additions: 120,
          deletions: 30,
          changedFiles: 3,
        },
      },
    };

    mockInvoke.mockResolvedValueOnce([freshGithubTask]);

    const { fetchGithubTasks } = useTaskStore.getState();
    await fetchGithubTasks();

    const tasks = useTaskStore.getState().tasks;
    expect(tasks.some((t) => t.id === 'gh_fresh_777')).toBe(true);
    expect(tasks.find((t) => t.id === 'gh_fresh_777')?.sourceMeta.branchInfo?.headRef).toBe('feat/oauth');
    // Google tasks must still be present
    expect(tasks.some((t) => t.id === 'gt_201')).toBe(true);
  });

  it('fetchGoogleTasks and fetchGithubTasks do nothing when IPC returns null', async () => {
    mockInvoke.mockResolvedValue(null);

    const tasksBefore = useTaskStore.getState().tasks;
    const { fetchGoogleTasks, fetchGithubTasks } = useTaskStore.getState();
    await fetchGoogleTasks();
    await fetchGithubTasks();

    expect(useTaskStore.getState().tasks).toEqual(tasksBefore);
  });

  it('clearCredentials for google removes all google_tasks from board and preserves GitHub tasks', async () => {
    const sampleGithubTask: UnifiedTask = {
      id: 'gh_custom_99',
      title: 'User GitHub issue',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/99',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'widkanban', issueNumber: 99 },
    };
    useTaskStore.setState({ tasks: [...INITIAL_MOCK_TASKS, sampleGithubTask] });

    mockInvoke.mockResolvedValueOnce({ has_github: true, has_google: false });

    const { clearCredentials } = useTaskStore.getState();
    await clearCredentials('google');

    const tasks = useTaskStore.getState().tasks;
    const googleTasksRemaining = tasks.filter((t) => t.source === 'google_tasks');
    expect(googleTasksRemaining).toHaveLength(0);

    const githubTasks = tasks.filter((t) => t.source === 'github');
    expect(githubTasks).toHaveLength(1);
  });

  it('clearCredentials for github removes all github tasks from board and preserves Google tasks', async () => {
    const sampleGithubTask: UnifiedTask = {
      id: 'gh_custom_99',
      title: 'User GitHub issue',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/99',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'widkanban', issueNumber: 99 },
    };
    useTaskStore.setState({ tasks: [...INITIAL_MOCK_TASKS, sampleGithubTask] });

    mockInvoke.mockResolvedValueOnce({ has_github: false, has_google: true });

    const { clearCredentials } = useTaskStore.getState();
    await clearCredentials('github');

    const tasks = useTaskStore.getState().tasks;
    const githubTasks = tasks.filter((t) => t.source === 'github');
    expect(githubTasks).toHaveLength(0);

    const googleTasks = tasks.filter((t) => t.source === 'google_tasks');
    expect(googleTasks.length).toBeGreaterThan(0);
  });

  it('fires update_github_issue_labels IPC when moving GitHub issue between todo and in_progress', () => {
    mockInvoke.mockClear();
    const { addTask, moveTask } = useTaskStore.getState();

    addTask({
      title: 'GitHub label sync test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/105',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 105 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.id.startsWith('gh_'))!;

    // Move to in_progress
    moveTask(added.id, 'in_progress');

    expect(mockInvoke).toHaveBeenCalledWith('update_github_issue_labels', {
      repo: 'org/widkanban',
      issueNumber: 105,
      targetLabel: 'in-progress',
      opposingLabel: 'to-do',
      postCommentFallback: false,
    });

    mockInvoke.mockClear();

    // Move back to todo
    moveTask(added.id, 'todo');

    expect(mockInvoke).toHaveBeenCalledWith('update_github_issue_labels', {
      repo: 'org/widkanban',
      issueNumber: 105,
      targetLabel: 'to-do',
      opposingLabel: 'in-progress',
      postCommentFallback: false,
    });
  });

  it('does NOT call update_github_issue_labels when moving GitHub issue to done (Done is strictly local)', () => {
    mockInvoke.mockClear();
    const { addTask, moveTask } = useTaskStore.getState();

    addTask({
      title: 'GitHub done safety test',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/org/widkanban/issues/106',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 106 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.id.startsWith('gh_'))!;

    // Moving to done
    moveTask(added.id, 'done');

    // State updated locally
    const task = useTaskStore.getState().tasks.find((t) => t.id === added.id);
    expect(task?.status).toBe('done');

    // Never calls GitHub writeback!
    const githubLabelCalls = mockInvoke.mock.calls.filter(
      (call) => call[0] === 'update_github_issue_labels'
    );
    expect(githubLabelCalls).toHaveLength(0);
  });

  it('does NOT call update_github_issue_labels when manageLabels is disabled', () => {
    mockInvoke.mockClear();
    const { addTask, moveTask, setGithubSyncSettings } = useTaskStore.getState();

    setGithubSyncSettings({ manageLabels: false });

    addTask({
      title: 'GitHub manageLabels disabled test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/107',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 107 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.id.startsWith('gh_'))!;
    moveTask(added.id, 'in_progress');

    const githubLabelCalls = mockInvoke.mock.calls.filter(
      (call) => call[0] === 'update_github_issue_labels'
    );
    expect(githubLabelCalls).toHaveLength(0);
  });

  it('addTask creates production-compliant UnifiedTask with UUID-based client ID, status, priority, and description', () => {
    const { addTask } = useTaskStore.getState();

    addTask({
      title: 'Production Task Feature',
      source: 'github',
      status: 'in_progress',
      priority: 'urgent',
      description: '### Plan\n- [ ] Step 1\n- [ ] Step 2',
      url: 'https://github.com/Dowiw/widkanban/issues',
      sourceMeta: {
        repo: 'Dowiw/widkanban',
        isPullRequest: false,
        priority: 'urgent',
        notes: '### Plan\n- [ ] Step 1\n- [ ] Step 2',
      },
    });

    const tasks = useTaskStore.getState().tasks;
    const created = tasks.find((t) => t.title === 'Production Task Feature');

    expect(created).toBeDefined();
    expect(created?.id).toMatch(/^gh_[a-zA-Z0-9]+$/);
    expect(created?.status).toBe('in_progress');
    expect(created?.priority).toBe('urgent');
    expect(created?.description).toContain('### Plan');
    expect(created?.sourceMeta.repo).toBe('Dowiw/widkanban');
    expect(created?.updatedAt).toBeDefined();
  });

  it('addTask generates clean Google Task with list context, priority, and notes', () => {
    const { addTask } = useTaskStore.getState();

    addTask({
      title: 'Team Meeting Prep',
      source: 'google_tasks',
      status: 'todo',
      priority: 'high',
      description: 'Review Q4 OKRs',
      url: 'https://tasks.google.com',
      sourceMeta: {
        listTitle: 'Sprint 12',
        listId: 'sprint-12',
        dueDate: '2026-11-01T12:00:00.000Z',
        priority: 'high',
        notes: 'Review Q4 OKRs',
      },
    });

    const tasks = useTaskStore.getState().tasks;
    const created = tasks.find((t) => t.title === 'Team Meeting Prep');

    expect(created).toBeDefined();
    expect(created?.id).toMatch(/^gt_[a-zA-Z0-9]+$/);
    expect(created?.source).toBe('google_tasks');
    expect(created?.priority).toBe('high');
    expect(created?.sourceMeta.listTitle).toBe('Sprint 12');
  });

  it('saveCredentials triggers isGithubSetupOpen on first GitHub connection', async () => {
    mockInvoke.mockResolvedValueOnce({ has_github: true, has_google: false });

    useTaskStore.setState({
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        postCommentsFallback: false,
        hasPromptedSetup: false,
      },
      isGithubSetupOpen: false,
    });

    const { saveCredentials } = useTaskStore.getState();
    await saveCredentials({ githubToken: 'ghp_sample123' });

    expect(useTaskStore.getState().isGithubSetupOpen).toBe(true);
  });

  it('checkAuthStatus updates store with env indicator flags', async () => {
    mockInvoke.mockResolvedValueOnce({
      has_github: true,
      has_google: true,
      github_from_env: true,
      google_from_env: false,
    });

    const { checkAuthStatus } = useTaskStore.getState();
    const status = await checkAuthStatus();

    expect(mockInvoke).toHaveBeenCalledWith('get_auth_status', undefined);
    expect(status.github_from_env).toBe(true);
    expect(status.google_from_env).toBe(false);
    expect(useTaskStore.getState().authStatus.github_from_env).toBe(true);
  });

  it('setupRepoLabels invokes setup_github_repo_labels command with configured labels', async () => {
    mockInvoke.mockResolvedValueOnce({
      repo: 'org/widkanban',
      actualTodoLabel: 'to-do',
      actualInProgressLabel: 'in-progress',
      createdLabels: ['to-do'],
    });

    const { setupRepoLabels } = useTaskStore.getState();
    const res = await setupRepoLabels('org/widkanban');

    expect(mockInvoke).toHaveBeenCalledWith('setup_github_repo_labels', {
      repo: 'org/widkanban',
      todoLabel: 'to-do',
      inProgressLabel: 'in-progress',
    });
    expect(res?.createdLabels).toEqual(['to-do']);
  });

  it('deleteTaskLocally moves task to locallyDeletedTasks and removes from active tasks', () => {
    const { addTask, deleteTaskLocally } = useTaskStore.getState();

    addTask({
      title: 'Task to locally delete',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/201',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 201 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.id.startsWith('gh_'))!;
    deleteTaskLocally(added.id);

    expect(useTaskStore.getState().tasks.some((t) => t.id === added.id)).toBe(false);
    expect(useTaskStore.getState().locallyDeletedTasks.some((t) => t.id === added.id)).toBe(true);
  });

  it('restoreLocallyDeletedTask restores task to active board and removes from locallyDeletedTasks', () => {
    const { addTask, deleteTaskLocally, restoreLocallyDeletedTask } = useTaskStore.getState();

    addTask({
      title: 'Task to restore',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/org/widkanban/issues/202',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 202 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.id.startsWith('gh_'))!;
    deleteTaskLocally(added.id);
    expect(useTaskStore.getState().locallyDeletedTasks.some((t) => t.id === added.id)).toBe(true);

    restoreLocallyDeletedTask(added.id);
    expect(useTaskStore.getState().tasks.some((t) => t.id === added.id)).toBe(true);
    expect(useTaskStore.getState().locallyDeletedTasks.some((t) => t.id === added.id)).toBe(false);
  });

  it('fetchGithubTasks filters out locallyDeletedTasks so they do not reappear on resync', async () => {
    const hiddenTask: UnifiedTask = {
      id: 'gh_hidden_301',
      title: 'Hidden task',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/301',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'org/widkanban', issueNumber: 301 },
    };

    const regularTask: UnifiedTask = {
      id: 'gh_regular_302',
      title: 'Regular task',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/302',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'org/widkanban', issueNumber: 302 },
    };

    useTaskStore.setState({
      locallyDeletedTasks: [hiddenTask],
      tasks: [],
    });

    mockInvoke.mockResolvedValueOnce([hiddenTask, regularTask]);

    const { fetchGithubTasks } = useTaskStore.getState();
    await fetchGithubTasks();

    const currentTasks = useTaskStore.getState().tasks;
    expect(currentTasks.some((t) => t.id === hiddenTask.id)).toBe(false);
    expect(currentTasks.some((t) => t.id === regularTask.id)).toBe(true);
  });

  it('closeGitHubIssueOnRemote invokes close_github_issue with reason and duplicate', async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const { closeGitHubIssueOnRemote } = useTaskStore.getState();
    const res = await closeGitHubIssueOnRemote('org/widkanban', 42, 'Not needed', 10);

    expect(mockInvoke).toHaveBeenCalledWith('close_github_issue', {
      repo: 'org/widkanban',
      issueNumber: 42,
      reason: 'Not needed',
      duplicateOf: 10,
    });
    expect(res.success).toBe(true);
  });

  it('deleteGitHubIssuePermanentlyOnRemote invokes delete_github_issue_permanently command', async () => {
    mockInvoke.mockResolvedValueOnce(null);

    const { deleteGitHubIssuePermanentlyOnRemote } = useTaskStore.getState();
    const res = await deleteGitHubIssuePermanentlyOnRemote('org/widkanban', 42);

    expect(mockInvoke).toHaveBeenCalledWith('delete_github_issue_permanently', {
      repo: 'org/widkanban',
      issueNumber: 42,
    });
    expect(res.success).toBe(true);
  });

  it('syncLabelsWithHomeBoard synchronizes local task labels and dispatches GitHub updates', async () => {
    const ghTask1: UnifiedTask = {
      id: 'gh_task_1',
      title: 'In Progress Task',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/org/widkanban/issues/1',
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        repo: 'org/widkanban',
        issueNumber: 1,
        labels: [{ name: 'to-do', color: '0075ca' }],
      },
    };

    const ghTask2: UnifiedTask = {
      id: 'gh_task_2',
      title: 'Todo Task',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/2',
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        repo: 'org/widkanban',
        issueNumber: 2,
        labels: [{ name: 'in-progress', color: 'd93f0b' }],
      },
    };

    useTaskStore.setState({
      tasks: [ghTask1, ghTask2],
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        postCommentsFallback: false,
        hasPromptedSetup: true,
      },
    });

    mockInvoke.mockResolvedValue(null);

    const { syncLabelsWithHomeBoard } = useTaskStore.getState();
    await syncLabelsWithHomeBoard();

    // Verify task1 (in_progress) now has in-progress label locally
    const updated1 = useTaskStore.getState().tasks.find((t) => t.id === 'gh_task_1');
    expect(updated1?.sourceMeta?.labels?.some((l) => l.name === 'in-progress')).toBe(true);
    expect(updated1?.sourceMeta?.labels?.some((l) => l.name === 'to-do')).toBe(false);

    // Verify task2 (todo) now has to-do label locally
    const updated2 = useTaskStore.getState().tasks.find((t) => t.id === 'gh_task_2');
    expect(updated2?.sourceMeta?.labels?.some((l) => l.name === 'to-do')).toBe(true);
    expect(updated2?.sourceMeta?.labels?.some((l) => l.name === 'in-progress')).toBe(false);

    // Verify update_github_issue_labels was called for both tasks
    expect(mockInvoke).toHaveBeenCalledWith('update_github_issue_labels', {
      repo: 'org/widkanban',
      issueNumber: 1,
      targetLabel: 'in-progress',
      opposingLabel: 'to-do',
      postCommentFallback: false,
    });
    expect(mockInvoke).toHaveBeenCalledWith('update_github_issue_labels', {
      repo: 'org/widkanban',
      issueNumber: 2,
      targetLabel: 'to-do',
      opposingLabel: 'in-progress',
      postCommentFallback: false,
    });
  });

  it('moveTask optimistically updates sourceMeta.labels when moving between todo and in_progress', () => {
    const ghTask: UnifiedTask = {
      id: 'gh_drag_test',
      title: 'Drag Label Test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/99',
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        repo: 'org/widkanban',
        issueNumber: 99,
        labels: [{ name: 'to-do', color: '0075ca' }],
      },
    };

    useTaskStore.setState({
      tasks: [ghTask],
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        postCommentsFallback: false,
        hasPromptedSetup: true,
      },
    });

    const { moveTask } = useTaskStore.getState();

    // Move to in_progress
    moveTask('gh_drag_test', 'in_progress');
    const inProgTask = useTaskStore.getState().tasks.find((t) => t.id === 'gh_drag_test')!;
    expect(inProgTask.status).toBe('in_progress');
    expect(inProgTask.sourceMeta?.labels?.some((l) => l.name === 'in-progress')).toBe(true);
    expect(inProgTask.sourceMeta?.labels?.some((l) => l.name === 'to-do')).toBe(false);

    // Move back to todo
    moveTask('gh_drag_test', 'todo');
    const todoTask = useTaskStore.getState().tasks.find((t) => t.id === 'gh_drag_test')!;
    expect(todoTask.status).toBe('todo');
    expect(todoTask.sourceMeta?.labels?.some((l) => l.name === 'to-do')).toBe(true);
    expect(todoTask.sourceMeta?.labels?.some((l) => l.name === 'in-progress')).toBe(false);
  });

  describe('customization and window sizing', () => {
    it('initializes with default customization values', () => {
      const state = useTaskStore.getState();
      expect(state.customization.theme).toBe('system');
      expect(state.customization.cornerRadius).toBe(16);
      expect(state.customization.fontFamily).toBe('outfit');
      expect(state.customization.columnHeaderHeight).toBe(36);
      expect(state.customization.columnMinWidth).toBe(260);
      expect(state.customization.cardDensity).toBe('normal');
    });

    it('updates customization settings partially', () => {
      const { setCustomization } = useTaskStore.getState();
      setCustomization({
        cornerRadius: 0,
        fontFamily: 'unifont',
        columnHeaderHeight: 48,
        cardDensity: 'compact',
      });

      const state = useTaskStore.getState();
      expect(state.customization.cornerRadius).toBe(0);
      expect(state.customization.fontFamily).toBe('unifont');
      expect(state.customization.columnHeaderHeight).toBe(48);
      expect(state.customization.cardDensity).toBe('compact');
      // Unmodified properties remain default
      expect(state.customization.theme).toBe('system');
      expect(state.customization.columnMinWidth).toBe(260);
    });

    it('updates font family across all supported options (outfit, unifont, system, mono)', () => {
      const { setCustomization } = useTaskStore.getState();
      const fonts: ('outfit' | 'unifont' | 'system' | 'mono')[] = ['outfit', 'unifont', 'system', 'mono'];

      for (const font of fonts) {
        setCustomization({ fontFamily: font });
        expect(useTaskStore.getState().customization.fontFamily).toBe(font);
      }
    });

    it('cycles theme through system -> light -> dark -> system via toggleTheme', () => {
      const { toggleTheme } = useTaskStore.getState();
      expect(useTaskStore.getState().customization.theme).toBe('system');

      toggleTheme();
      expect(useTaskStore.getState().customization.theme).toBe('light');

      toggleTheme();
      expect(useTaskStore.getState().customization.theme).toBe('dark');

      toggleTheme();
      expect(useTaskStore.getState().customization.theme).toBe('system');
    });

    it('toggles pin and triggers set_window_pin_mode with appropriate mode', async () => {
      const { togglePin, setPinMode } = useTaskStore.getState();
      expect(useTaskStore.getState().isPinned).toBe(true);

      // Unpin: should set normal window mode
      await togglePin();
      expect(useTaskStore.getState().isPinned).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith('set_window_pin_mode', { mode: 'normal' });

      // Pin with always-on-top
      await togglePin();
      expect(useTaskStore.getState().isPinned).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('set_window_pin_mode', { mode: 'always-on-top' });

      // Switch pin mode to desktop-layer while pinned
      await setPinMode('desktop-layer');
      expect(useTaskStore.getState().customization.pinMode).toBe('desktop-layer');
      expect(mockInvoke).toHaveBeenCalledWith('set_window_pin_mode', { mode: 'desktop-layer' });
    });

    it('handles autostart status check and enable/disable', async () => {
      const { checkAutostartStatus, enableAutostart, disableAutostart } =
        useTaskStore.getState();

      mockInvoke.mockResolvedValueOnce(true);
      const isEnabled = await checkAutostartStatus();
      expect(isEnabled).toBe(true);
      expect(useTaskStore.getState().startupSettings.autostartEnabled).toBe(true);

      mockInvoke.mockResolvedValueOnce(undefined);
      const enabled = await enableAutostart(true);
      expect(enabled).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('enable_autostart', { startMinimized: true });
      expect(useTaskStore.getState().startupSettings.autostartEnabled).toBe(true);
      expect(useTaskStore.getState().startupSettings.startMinimized).toBe(true);
      expect(useTaskStore.getState().startupSettings.hasPrompted).toBe(true);

      mockInvoke.mockResolvedValueOnce(undefined);
      const disabled = await disableAutostart();
      expect(disabled).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('disable_autostart', undefined);
      expect(useTaskStore.getState().startupSettings.autostartEnabled).toBe(false);
    });

    it('applies window size presets and updates defaultWidth/defaultHeight', async () => {
      const { setWindowSizePreset } = useTaskStore.getState();

      await setWindowSizePreset('wide');
      expect(mockInvoke).toHaveBeenCalledWith('set_window_size', { width: 850, height: 600 });
      expect(useTaskStore.getState().customization.defaultWidth).toBe(850);
      expect(useTaskStore.getState().customization.defaultHeight).toBe(600);

      await setWindowSizePreset('expanded');
      expect(mockInvoke).toHaveBeenCalledWith('set_window_size', { width: 1100, height: 720 });
      expect(useTaskStore.getState().customization.defaultWidth).toBe(1100);

      await setWindowSizePreset('compact');
      expect(mockInvoke).toHaveBeenCalledWith('set_window_size', { width: 380, height: 680 });
      expect(useTaskStore.getState().customization.defaultWidth).toBe(380);
    });

    it('resets window position and size geometry via resetWindowPositionAndSize', async () => {
      const { resetWindowPositionAndSize, setCustomization } = useTaskStore.getState();
      setCustomization({ defaultWidth: 999, defaultHeight: 888 });

      await resetWindowPositionAndSize();
      expect(mockInvoke).toHaveBeenCalledWith('reset_window_geometry', undefined);
      expect(useTaskStore.getState().customization.defaultWidth).toBe(380);
      expect(useTaskStore.getState().customization.defaultHeight).toBe(680);
    });
  });

  describe('Auto-Sync & API Health Tracking', () => {
    it('initializes with default autoSyncSettings and apiHealth', () => {
      const state = useTaskStore.getState();
      expect(state.autoSyncSettings.enabled).toBe(false);
      expect(state.autoSyncSettings.intervalMinutes).toBe(3);
      expect(state.autoSyncSettings.notifyOnNewTasks).toBe(true);
      expect(state.autoSyncSettings.hasPrompted).toBe(false);
      expect(state.isAutoSyncPromptOpen).toBe(false);
      expect(state.apiHealth.github.connected).toBe(false);
      expect(state.syncBanner).toBeNull();
    });

    it('updates autoSyncSettings with partial updates', () => {
      const { setAutoSyncSettings } = useTaskStore.getState();
      setAutoSyncSettings({ enabled: true, intervalMinutes: 5 });

      const state = useTaskStore.getState();
      expect(state.autoSyncSettings.enabled).toBe(true);
      expect(state.autoSyncSettings.intervalMinutes).toBe(5);
      expect(state.autoSyncSettings.notifyOnNewTasks).toBe(true); // preserved
    });

    it('controls auto-sync prompt modal open and sync banner', () => {
      const { setAutoSyncPromptOpen, setSyncBanner } = useTaskStore.getState();
      setAutoSyncPromptOpen(true);
      expect(useTaskStore.getState().isAutoSyncPromptOpen).toBe(true);

      setSyncBanner('2 new tasks detected');
      expect(useTaskStore.getState().syncBanner).toBe('2 new tasks detected');

      setSyncBanner(null);
      expect(useTaskStore.getState().syncBanner).toBeNull();
    });

    it('fetches api health and detects token expiring soon', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'get_api_health') {
          return {
            github: {
              connected: true,
              rateLimitRemaining: 4800,
              rateLimitLimit: 5000,
              rateLimitReset: Math.floor(Date.now() / 1000) + 1800,
              tokenExpiresAt: futureDate,
              isExpiringSoon: false,
              isRateLimited: false,
            },
            google: {
              connected: true,
            },
          };
        }
        return null;
      });

      const { fetchApiHealth } = useTaskStore.getState();
      const res = await fetchApiHealth();

      expect(mockInvoke).toHaveBeenCalledWith('get_api_health', undefined);
      expect(res?.github.rateLimitRemaining).toBe(4800);
      expect(res?.github.isExpiringSoon).toBe(true); // accurately flagged because 3 days <= 7 days
      expect(useTaskStore.getState().apiHealth.github.rateLimitRemaining).toBe(4800);
    });

    it('refreshTasksWithDiff detects new tasks, sets banner, and triggers notification', async () => {
      const initialTask: UnifiedTask = {
        id: 'gh_initial',
        title: 'Initial Issue',
        source: 'github',
        status: 'todo',
        url: 'https://github.com/org/repo/issues/1',
        updatedAt: new Date().toISOString(),
        sourceMeta: {},
      };

      const newTask: UnifiedTask = {
        id: 'gh_new_99',
        title: 'Brand New Assigned Issue',
        source: 'github',
        status: 'todo',
        url: 'https://github.com/org/repo/issues/99',
        updatedAt: new Date().toISOString(),
        sourceMeta: {},
      };

      useTaskStore.setState({
        tasks: [initialTask],
        autoSyncSettings: {
          enabled: true,
          intervalMinutes: 3,
          notifyOnNewTasks: true,
          hasPrompted: true,
        },
        authStatus: { has_github: true, has_google: false },
      });

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'get_auth_status') return { has_github: true, has_google: false };
        if (cmd === 'fetch_github_tasks') return [initialTask, newTask];
        if (cmd === 'get_api_health') return { github: { connected: true }, google: { connected: false } };
        if (cmd === 'send_desktop_notification') return null;
        return null;
      });

      const { refreshTasksWithDiff } = useTaskStore.getState();
      const diffResult = await refreshTasksWithDiff();

      expect(diffResult.addedCount).toBe(1);
      expect(diffResult.newTasks[0].id).toBe('gh_new_99');
      expect(useTaskStore.getState().syncBanner).toBe('New task synced: Brand New Assigned Issue');
      expect(mockInvoke).toHaveBeenCalledWith('send_desktop_notification', {
        title: 'WidKanban: New Task Assigned',
        body: 'Brand New Assigned Issue',
      });
    });

    it('skips GitHub fetch during refresh when rate limited', async () => {
      useTaskStore.setState({
        authStatus: { has_github: true, has_google: false },
        apiHealth: {
          github: {
            connected: true,
            isRateLimited: true,
            rateLimitReset: Math.floor(Date.now() / 1000) + 3600, // 1 hour in the future
          },
          google: { connected: false },
        },
      });

      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'get_auth_status') return { has_github: true, has_google: false };
        if (cmd === 'get_api_health') return useTaskStore.getState().apiHealth;
        return null;
      });

      mockInvoke.mockClear();

      const { refreshTasksWithDiff } = useTaskStore.getState();
      await refreshTasksWithDiff();

      // fetch_github_tasks should NOT have been called because it is rate limited!
      expect(mockInvoke).not.toHaveBeenCalledWith('fetch_github_tasks', undefined);
    });

    it('startGoogleOAuthFlow succeeds and updates auth status with refresh token', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'start_google_oauth_flow') {
          return {
            has_github: false,
            has_google: true,
            google_has_refresh_token: true,
          };
        }
        if (cmd === 'fetch_google_tasks') return [];
        if (cmd === 'get_api_health') return { github: { connected: false }, google: { connected: true } };
        return null;
      });

      const { startGoogleOAuthFlow } = useTaskStore.getState();
      const res = await startGoogleOAuthFlow({
        clientId: 'custom-client-id.apps.googleusercontent.com',
      });

      expect(res.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('start_google_oauth_flow', {
        clientId: 'custom-client-id.apps.googleusercontent.com',
        clientSecret: null,
      });
      expect(useTaskStore.getState().authStatus.google_has_refresh_token).toBe(true);
      expect(useTaskStore.getState().hasCompletedOnboarding).toBe(true);
    });

    it('startGoogleOAuthFlow handles rejection or cancellation gracefully', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'start_google_oauth_flow') {
          throw new Error('OAuth flow timed out waiting for user response');
        }
        return null;
      });

      const { startGoogleOAuthFlow } = useTaskStore.getState();
      const res = await startGoogleOAuthFlow();

      expect(res.success).toBe(false);
      expect(res.error).toContain('timed out');
    });

    it('saveCredentials passes refresh token and client credentials to native backend', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'save_credentials') {
          return {
            has_github: true,
            has_google: true,
            google_has_refresh_token: true,
          };
        }
        if (cmd === 'fetch_google_tasks') return [];
        if (cmd === 'fetch_github_tasks') return [];
        if (cmd === 'get_api_health') return { github: { connected: true }, google: { connected: true } };
        return null;
      });

      const { saveCredentials } = useTaskStore.getState();
      const ok = await saveCredentials({
        githubToken: 'ghp_test123',
        googleRefreshToken: '1//refresh_token_xyz',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
      });

      expect(ok).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('save_credentials', {
        githubToken: 'ghp_test123',
        googleToken: null,
        googleRefreshToken: '1//refresh_token_xyz',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: null,
      });
    });
  });
});

