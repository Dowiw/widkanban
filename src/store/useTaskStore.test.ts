import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from './useTaskStore';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';
import { UnifiedTask } from '../types/task';

// Access the mocked invoke so we can control its return value per-test
import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

describe('useTaskStore', () => {
  beforeEach(() => {
    // Clear persisted storage between tests to prevent state bleed
    localStorage.clear();

    // Reset the invoke mock to default (returns null → safeInvoke returns null)
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
});
