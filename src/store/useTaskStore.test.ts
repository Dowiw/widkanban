import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore, routeTaskToColumn } from './useTaskStore';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';
import { UnifiedTask, BoardColumn, DEFAULT_COLUMNS } from '../types/task';

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
      columns: DEFAULT_COLUMNS,
      searchQuery: '',
      filterSource: 'all',
      isPinned: true,
      isAddTaskOpen: false,
      isSettingsOpen: false,
      hasCompletedOnboarding: false,
      authStatus: { has_github: false, has_google: false },
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

    it('toggles pin and triggers set_window_resizable with inverse pin state', () => {
      const { togglePin } = useTaskStore.getState();
      expect(useTaskStore.getState().isPinned).toBe(true);

      // Unpin: should enable resizing (resizable: true)
      togglePin();
      expect(useTaskStore.getState().isPinned).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith('set_window_resizable', { resizable: true });
      expect(mockInvoke).toHaveBeenCalledWith('toggle_always_on_top', undefined);

      // Pin: should lock resizing (resizable: false)
      togglePin();
      expect(useTaskStore.getState().isPinned).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('set_window_resizable', { resizable: false });
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

  describe('Board columns, custom action triggers, and reverse routing', () => {
    it('initializes with default 3-column setup', () => {
      const state = useTaskStore.getState();
      expect(state.columns).toHaveLength(3);
      expect(state.columns.map((c) => c.id)).toEqual(['todo', 'in_progress', 'done']);
    });

    it('adds a new custom column and formats ID cleanly', () => {
      const { addColumn } = useTaskStore.getState();
      addColumn({
        title: 'QA Testing',
        color: 'indigo',
        triggers: { githubAddLabel: 'qa-ready' },
      });

      const cols = useTaskStore.getState().columns;
      expect(cols).toHaveLength(4);
      const newCol = cols.find((c) => c.id === 'qa_testing');
      expect(newCol).toBeDefined();
      expect(newCol?.title).toBe('QA Testing');
      expect(newCol?.color).toBe('indigo');
      expect(newCol?.triggers?.githubAddLabel).toBe('qa-ready');
    });

    it('updates column title, color, and triggers', () => {
      const { updateColumn } = useTaskStore.getState();
      updateColumn('todo', {
        title: 'Backlog Queue',
        color: 'purple',
        triggers: { githubAddLabel: 'backlog' },
      });

      const updated = useTaskStore.getState().columns.find((c) => c.id === 'todo');
      expect(updated?.title).toBe('Backlog Queue');
      expect(updated?.color).toBe('purple');
      expect(updated?.triggers?.githubAddLabel).toBe('backlog');
    });

    it('removes a column and reassigns orphaned tasks to fallback column', () => {
      const { addColumn, removeColumn } = useTaskStore.getState();
      addColumn({ title: 'Temporary Review', color: 'rose' });
      const tempId = useTaskStore.getState().columns.find((c) => c.title === 'Temporary Review')!.id;

      const orphanTask: UnifiedTask = {
        id: 'gh_orphan',
        title: 'Orphan Issue',
        source: 'github',
        status: tempId,
        url: 'https://github.com/org/repo/issues/1',
        updatedAt: new Date().toISOString(),
        sourceMeta: {},
      };
      useTaskStore.setState({ tasks: [...useTaskStore.getState().tasks, orphanTask] });

      removeColumn(tempId);

      const stateAfter = useTaskStore.getState();
      expect(stateAfter.columns.some((c) => c.id === tempId)).toBe(false);
      const migratedTask = stateAfter.tasks.find((t) => t.id === 'gh_orphan');
      expect(migratedTask?.status).toBe('todo');
    });

    it('reorders columns correctly', () => {
      const { reorderColumns } = useTaskStore.getState();
      // Initially: ['todo', 'in_progress', 'done']
      reorderColumns(0, 1);
      const cols = useTaskStore.getState().columns.map((c) => c.id);
      expect(cols).toEqual(['in_progress', 'todo', 'done']);
    });

    it('applies column preset workflow', () => {
      const { applyColumnPreset } = useTaskStore.getState();
      // Preset 1: Developer Workflow (5 columns: backlog, todo, in_progress, review, done)
      applyColumnPreset(1);

      const cols = useTaskStore.getState().columns;
      expect(cols).toHaveLength(5);
      expect(cols.map((c) => c.id)).toEqual(['backlog', 'todo', 'in_progress', 'review', 'done']);
    });

    it('executes custom column triggers and updates labels and remote state', () => {
      const { addColumn, moveTask } = useTaskStore.getState();
      addColumn({
        title: 'Review',
        color: 'purple',
        triggers: {
          githubAddLabel: 'needs-review',
          githubRemoveLabel: 'in-progress',
          githubState: 'open',
        },
      });

      const ghTask: UnifiedTask = {
        id: 'gh_trigger_test',
        title: 'Trigger Issue',
        source: 'github',
        status: 'in_progress',
        url: 'https://github.com/org/repo/issues/45',
        updatedAt: new Date().toISOString(),
        sourceMeta: {
          repo: 'org/repo',
          issueNumber: 45,
          labels: [{ name: 'in-progress', color: 'd93f0b' }],
        },
      };

      useTaskStore.setState({ tasks: [ghTask] });
      moveTask('gh_trigger_test', 'review');

      const updated = useTaskStore.getState().tasks.find((t) => t.id === 'gh_trigger_test')!;
      expect(updated.status).toBe('review');
      expect(updated.sourceMeta?.labels?.some((l) => l.name === 'needs-review')).toBe(true);
      expect(updated.sourceMeta?.labels?.some((l) => l.name === 'in-progress')).toBe(false);

      expect(mockInvoke).toHaveBeenCalledWith(
        'update_github_issue_labels',
        expect.objectContaining({
          repo: 'org/repo',
          issueNumber: 45,
          targetLabel: 'needs-review',
          opposingLabel: 'in-progress',
        })
      );
      expect(mockInvoke).toHaveBeenCalledWith(
        'set_github_issue_state',
        expect.objectContaining({
          repo: 'org/repo',
          issueNumber: 45,
          state: 'open',
        })
      );
    });

    it('routes incoming tasks with reverse routing rules', () => {
      const testColumns: BoardColumn[] = [
        {
          id: 'todo',
          title: 'To Do',
          color: 'sky',
          routingRules: { githubLabels: ['to-do', 'todo'] },
        },
        {
          id: 'review',
          title: 'Review',
          color: 'purple',
          routingRules: { githubLabels: ['needs-review', 'in-review', 'review'] },
        },
        {
          id: 'done',
          title: 'Done',
          color: 'emerald',
          routingRules: {
            githubLabels: ['done', 'closed'],
            googleStatus: 'completed',
          },
        },
      ];

      // 1. Task with 'review' label
      const reviewTask: UnifiedTask = {
        id: 'gh_rev',
        title: 'PR waiting for review',
        source: 'github',
        status: 'todo',
        url: 'https://github.com/org/repo/pull/10',
        updatedAt: new Date().toISOString(),
        sourceMeta: {
          labels: [{ name: 'needs-review', color: '123456' }],
        },
      };
      expect(routeTaskToColumn(reviewTask, testColumns)).toBe('review');

      // 2. Google task with completed status
      const completedGtask: UnifiedTask = {
        id: 'gt_comp',
        title: 'Finished Task',
        source: 'google_tasks',
        status: 'done',
        url: 'https://tasks.google.com',
        updatedAt: new Date().toISOString(),
        sourceMeta: {},
      };
      expect(routeTaskToColumn(completedGtask, testColumns)).toBe('done');

      // 3. Fallback task with no matching labels
      const unroutedTask: UnifiedTask = {
        id: 'gh_misc',
        title: 'Random Bug',
        source: 'github',
        status: 'todo',
        url: 'https://github.com/org/repo/issues/88',
        updatedAt: new Date().toISOString(),
        sourceMeta: {
          labels: [{ name: 'bug', color: 'd73a4a' }],
        },
      };
      expect(routeTaskToColumn(unroutedTask, testColumns)).toBe('todo');
    });
  });
});
