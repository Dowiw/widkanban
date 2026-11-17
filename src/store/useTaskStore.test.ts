import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from './useTaskStore';
import { InMemoryTaskSyncAdapter } from '../sync/taskSyncAdapter';
import { INITIAL_MOCK_TASKS } from '../mock/mockTasks';
import { UnifiedTask, DEFAULT_AUTOSYNC_SETTINGS, DEFAULT_API_HEALTH_STATE } from '../types/task';

// Access the mocked invoke so we can control non-task-sync IPC commands (auth/health/window)
import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);
let testSyncAdapter: InMemoryTaskSyncAdapter;

describe('useTaskStore', () => {
  beforeEach(() => {
    // Clear persisted storage between tests to prevent state bleed
    localStorage.clear();

    // Reset the invoke mock to default (returns null → safeInvoke returns null)
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(null);

    testSyncAdapter = new InMemoryTaskSyncAdapter();

    // Reset store state before each test
    useTaskStore.setState({
      tasks: INITIAL_MOCK_TASKS,
      searchQuery: '',
      filterSource: 'all',
      isPinned: true,
      isAddTaskOpen: false,
      isSettingsOpen: false,
      hasCompletedOnboarding: false,
      authStatus: { has_github: false, has_google: false, has_microsoft: false },
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        doneLabel: 'done',
        doneAction: 'ask',
        postCommentsFallback: false,
        hasPromptedSetup: false,
      },
      groupLinkedPRs: true,
      githubDoneModalTask: null,
      autoSyncSettings: DEFAULT_AUTOSYNC_SETTINGS,
      isAutoSyncPromptOpen: false,
      apiHealth: DEFAULT_API_HEALTH_STATE,
      syncBanner: null,
      syncAdapter: testSyncAdapter,
    });
  });

  it('initializes with mock tasks dataset and no github placeholders', () => {
    const state = useTaskStore.getState();
    expect(state.tasks).toHaveLength(INITIAL_MOCK_TASKS.length);
    expect(state.isPinned).toBe(true);
    expect(state.tasks.some((t) => t.source === 'github')).toBe(false);
    expect(state.tasks.some((t) => t.source === 'microsoft_teams')).toBe(true);
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

  it('dispatches unified google_tasks transition through syncAdapter when moving a Google Task', async () => {
    const { moveTask } = useTaskStore.getState();
    await moveTask('gt_201', 'done');

    expect(testSyncAdapter.transitions).toEqual([
      {
        provider: 'google_tasks',
        taskId: 'gt_201',
        containerId: 'work_deliverables',
        newStatus: 'done',
      },
    ]);
  });

  it('does NOT dispatch a google_tasks transition when moving a GitHub issue', async () => {
    const { addTask, moveTask } = useTaskStore.getState();

    addTask({
      title: 'GitHub issue test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/101',
      sourceMeta: { repo: 'widkanban', issueNumber: 101 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.source === 'github')!;
    await moveTask(added.id, 'in_progress');

    expect(testSyncAdapter.transitions.filter((t) => t.provider === 'google_tasks')).toHaveLength(0);
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
    expect(createdTask.id.length).toBeGreaterThan(0);
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

    testSyncAdapter.tasksByProvider.google_tasks = [freshGoogleTask];

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

    testSyncAdapter.tasksByProvider.github = [freshGithubTask];

    const { fetchGithubTasks } = useTaskStore.getState();
    await fetchGithubTasks();

    const tasks = useTaskStore.getState().tasks;
    expect(tasks.some((t) => t.id === 'gh_fresh_777')).toBe(true);
    expect(tasks.find((t) => t.id === 'gh_fresh_777')?.sourceMeta.branchInfo?.headRef).toBe('feat/oauth');
    // Google tasks must still be present
    expect(tasks.some((t) => t.id === 'gt_201')).toBe(true);
  });

  it('fetchGoogleTasks and fetchGithubTasks preserve existing tasks when adapter fails', async () => {
    const tasksBefore = useTaskStore.getState().tasks;
    const { fetchGoogleTasks, fetchGithubTasks } = useTaskStore.getState();

    testSyncAdapter.nextError = new Error('Google offline');
    await fetchGoogleTasks();

    testSyncAdapter.nextError = new Error('GitHub offline');
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

  it('clearCredentials for microsoft removes all microsoft_teams tasks from board and preserves others', async () => {
    mockInvoke.mockResolvedValueOnce({ has_github: false, has_google: false, has_microsoft: false });

    const { clearCredentials } = useTaskStore.getState();
    await clearCredentials('microsoft');

    const tasks = useTaskStore.getState().tasks;
    const msTasks = tasks.filter((t) => t.source === 'microsoft_teams');
    expect(msTasks).toHaveLength(0);

    const googleTasks = tasks.filter((t) => t.source === 'google_tasks');
    expect(googleTasks.length).toBeGreaterThan(0);
  });

  it('fetchMicrosoftTasks replaces existing microsoft_teams tasks with fresh API data and keeps other tasks', async () => {
    const freshMsTask: UnifiedTask = {
      id: 'ms_fresh_001',
      title: 'Fresh Teams Assignment',
      source: 'microsoft_teams',
      status: 'todo',
      url: 'https://teams.microsoft.com',
      updatedAt: new Date().toISOString(),
      sourceMeta: { teamName: 'Math 101', isAssignment: true },
    };

    testSyncAdapter.tasksByProvider.microsoft_teams = [freshMsTask];

    const { fetchMicrosoftTasks } = useTaskStore.getState();
    await fetchMicrosoftTasks();

    const tasks = useTaskStore.getState().tasks;
    expect(tasks.some((t) => t.id === 'ms_fresh_001')).toBe(true);
    expect(tasks.some((t) => t.id === 'ms_301')).toBe(false);
    expect(tasks.some((t) => t.source === 'google_tasks')).toBe(true);
  });

  it('dispatches microsoft_teams transition through syncAdapter when moving a Microsoft task', async () => {
    const { moveTask } = useTaskStore.getState();

    await moveTask('ms_302', 'done');

    expect(testSyncAdapter.transitions).toContainEqual({
      provider: 'microsoft_teams',
      taskId: 'ms_302',
      containerId: undefined,
      newStatus: 'done',
    });
  });

  it('saveCredentials accepts microsoftToken and triggers sync', async () => {
    mockInvoke.mockClear();
    mockInvoke
      .mockResolvedValueOnce({ has_github: false, has_google: false, has_microsoft: true }); // save_credentials
    const msSyncedTask: UnifiedTask = {
      id: 'ms_saved_1',
      title: 'Synced after save',
      source: 'microsoft_teams',
      status: 'todo',
      url: 'https://teams.microsoft.com',
      updatedAt: new Date().toISOString(),
      sourceMeta: {},
    };
    testSyncAdapter.tasksByProvider.microsoft_teams = [msSyncedTask];

    const { saveCredentials } = useTaskStore.getState();
    const result = await saveCredentials({ microsoftToken: 'ms_mock_token' });

    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('save_credentials', {
      githubToken: null,
      googleToken: null,
      googleRefreshToken: null,
      googleClientId: null,
      googleClientSecret: null,
      microsoftToken: 'ms_mock_token',
      microsoftRefreshToken: null,
      microsoftClientId: null,
      microsoftIncludeEducation: null,
    });
    expect(useTaskStore.getState().tasks.some((t) => t.id === 'ms_saved_1')).toBe(true);
  });

  it('inspectCredentials invokes inspect_credentials IPC and returns report', async () => {
    mockInvoke.mockClear();
    const mockReport = {
      providers: [
        {
          provider: 'microsoft',
          isValid: true,
          permissions: [],
          allRequiredGranted: true,
        },
      ],
      canProceed: true,
    };
    mockInvoke.mockResolvedValueOnce(mockReport);

    const { inspectCredentials } = useTaskStore.getState();
    const report = await inspectCredentials({ microsoftToken: 'candidate_token' });

    expect(report).toEqual(mockReport);
    expect(mockInvoke).toHaveBeenCalledWith('inspect_credentials', {
      githubToken: null,
      googleToken: null,
      microsoftToken: 'candidate_token',
    });
  });

  it('dispatches unified transition with label metadata when moving GitHub issue between todo and in_progress', async () => {
    const { addTask, moveTask } = useTaskStore.getState();

    addTask({
      title: 'GitHub label sync test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/105',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 105 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.source === 'github')!;

    await moveTask(added.id, 'in_progress');

    expect(testSyncAdapter.transitions[0]).toMatchObject({
      provider: 'github',
      taskId: added.id,
      containerId: 'org/widkanban',
      issueNumber: 105,
      newStatus: 'in_progress',
      targetLabel: 'in-progress',
      opposingLabel: 'to-do',
      postCommentFallback: false,
    });

    await moveTask(added.id, 'todo');

    expect(testSyncAdapter.transitions[1]).toMatchObject({
      provider: 'github',
      taskId: added.id,
      containerId: 'org/widkanban',
      issueNumber: 105,
      newStatus: 'todo',
      targetLabel: 'to-do',
      opposingLabel: 'in-progress',
      postCommentFallback: false,
    });
  });

  it('does NOT dispatch a remote transition when moving GitHub issue to done with doneAction=local_only', async () => {
    const { addTask, moveTask, setGithubSyncSettings } = useTaskStore.getState();

    setGithubSyncSettings({ doneAction: 'local_only' });

    addTask({
      title: 'GitHub done safety test',
      source: 'github',
      status: 'in_progress',
      url: 'https://github.com/org/widkanban/issues/106',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 106 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.source === 'github')!;

    await moveTask(added.id, 'done');

    const task = useTaskStore.getState().tasks.find((t) => t.id === added.id);
    expect(task?.status).toBe('done');
    expect(testSyncAdapter.transitions).toHaveLength(0);
  });

  it('does NOT dispatch GitHub transitions when manageLabels is disabled', async () => {
    const { addTask, moveTask, setGithubSyncSettings } = useTaskStore.getState();

    setGithubSyncSettings({ manageLabels: false });

    addTask({
      title: 'GitHub manageLabels disabled test',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/107',
      sourceMeta: { repo: 'org/widkanban', issueNumber: 107 },
    });

    const added = useTaskStore.getState().tasks.find((t) => t.source === 'github')!;
    await moveTask(added.id, 'in_progress');

    expect(testSyncAdapter.transitions).toHaveLength(0);
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
    expect(created?.id).toMatch(/^local_[a-zA-Z0-9]+$/);
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
    expect(created?.id).toMatch(/^local_[a-zA-Z0-9]+$/);
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
        doneLabel: 'done',
        doneAction: 'ask',
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

    const added = useTaskStore.getState().tasks.find((t) => t.title === 'Task to locally delete')!;
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

    const added = useTaskStore.getState().tasks.find((t) => t.title === 'Task to restore')!;
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

    testSyncAdapter.tasksByProvider.github = [hiddenTask, regularTask];

    const { fetchGithubTasks } = useTaskStore.getState();
    await fetchGithubTasks();

    const currentTasks = useTaskStore.getState().tasks;
    expect(currentTasks.some((t) => t.id === hiddenTask.id)).toBe(false);
    expect(currentTasks.some((t) => t.id === regularTask.id)).toBe(true);
  });

  it('removeTask closes GitHub issue with reason/duplicate and permanently deletes via unified adapter', async () => {
    const issueTask: UnifiedTask = {
      id: 'gh_42',
      title: 'Issue to remove',
      source: 'github',
      status: 'todo',
      url: 'https://github.com/org/widkanban/issues/42',
      updatedAt: new Date().toISOString(),
      sourceMeta: { repo: 'org/widkanban', issueNumber: 42 },
    };
    useTaskStore.setState({ tasks: [issueTask] });

    const { removeTask } = useTaskStore.getState();
    const closeRes = await removeTask('gh_42', {
      mode: 'remote',
      remoteMode: 'close',
      reason: 'Not needed',
      duplicateOf: 10,
    });

    expect(closeRes.success).toBe(true);
    expect(testSyncAdapter.remoteDeletions[0]).toEqual({
      provider: 'github',
      taskId: 'gh_42',
      containerId: 'org/widkanban',
      issueNumber: 42,
      mode: 'close',
      reason: 'Not needed',
      duplicateOf: 10,
    });

    useTaskStore.setState({ tasks: [issueTask], locallyDeletedTasks: [] });
    const permRes = await removeTask('gh_42', {
      mode: 'remote',
      remoteMode: 'permanent',
    });

    expect(permRes.success).toBe(true);
    expect(testSyncAdapter.remoteDeletions[1]).toMatchObject({
      provider: 'github',
      taskId: 'gh_42',
      containerId: 'org/widkanban',
      issueNumber: 42,
      mode: 'permanent',
    });
  });

  it('syncLabelsWithHomeBoard synchronizes local task labels and dispatches unified GitHub transitions', async () => {
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

    testSyncAdapter.tasksByProvider.github = [ghTask1, ghTask2];
    useTaskStore.setState({
      tasks: [ghTask1, ghTask2],
      githubSyncSettings: {
        manageLabels: true,
        todoLabel: 'to-do',
        inProgressLabel: 'in-progress',
        doneLabel: 'done',
        doneAction: 'ask',
        postCommentsFallback: false,
        hasPromptedSetup: true,
      },
    });

    const { syncLabelsWithHomeBoard } = useTaskStore.getState();
    await syncLabelsWithHomeBoard();

    expect(testSyncAdapter.transitions).toContainEqual(
      expect.objectContaining({
        provider: 'github',
        containerId: 'org/widkanban',
        issueNumber: 1,
        targetLabel: 'in-progress',
        opposingLabel: 'to-do',
      })
    );
    expect(testSyncAdapter.transitions).toContainEqual(
      expect.objectContaining({
        provider: 'github',
        containerId: 'org/widkanban',
        issueNumber: 2,
        targetLabel: 'to-do',
        opposingLabel: 'in-progress',
      })
    );
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
        doneLabel: 'done',
        doneAction: 'ask',
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

      // When external task manager disables autostart, checkAutostartStatus returns false and unticks
      mockInvoke.mockResolvedValueOnce(false);
      const detectedStatus = await checkAutostartStatus();
      expect(detectedStatus).toBe(false);
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
        authStatus: { has_github: true, has_google: false, has_microsoft: false },
      });

      testSyncAdapter.tasksByProvider.github = [initialTask, newTask];
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'get_auth_status') return { has_github: true, has_google: false, has_microsoft: false };
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
      const staleGhTask: UnifiedTask = {
        id: 'gh_rate_1',
        title: 'Fresh task should stay skipped',
        source: 'github',
        status: 'todo',
        url: '',
        updatedAt: new Date().toISOString(),
        sourceMeta: {},
      };
      testSyncAdapter.tasksByProvider.github = [staleGhTask];

      useTaskStore.setState({
        authStatus: { has_github: true, has_google: false, has_microsoft: false },
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

      const { refreshTasksWithDiff } = useTaskStore.getState();
      await refreshTasksWithDiff();

      expect(useTaskStore.getState().tasks.some((t) => t.id === 'gh_rate_1')).toBe(false);
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
        microsoftToken: null,
        microsoftRefreshToken: null,
        microsoftClientId: null,
        microsoftIncludeEducation: null,
      });
    });

    it('startMicrosoftOAuthFlow succeeds and returns inspection report', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'start_microsoft_oauth_flow') {
          return {
            authStatus: {
              has_github: false,
              has_google: false,
              has_microsoft: true,
              microsoft_has_refresh_token: true,
              microsoft_client_id: 'ms-client-123',
              microsoft_include_education: true,
            },
            report: {
              canProceed: true,
              providers: [
                {
                  provider: 'microsoft',
                  isValid: true,
                  userName: 'Jane Doe',
                  userEmail: 'jane@contoso.com',
                  accountType: 'School / Work Organization Account',
                  permissions: [],
                  allRequiredGranted: true,
                },
              ],
            },
          };
        }
        if (cmd === 'get_api_health') return { github: { connected: false }, google: { connected: false }, microsoft: { connected: true } };
        return null;
      });

      const { startMicrosoftOAuthFlow } = useTaskStore.getState();
      const res = await startMicrosoftOAuthFlow({
        clientId: 'ms-client-123',
        includeEducation: true,
      });

      expect(res.success).toBe(true);
      expect(res.report?.canProceed).toBe(true);
      expect(res.report?.providers[0]?.accountType).toBe('School / Work Organization Account');
      expect(mockInvoke).toHaveBeenCalledWith('start_microsoft_oauth_flow', {
        clientId: 'ms-client-123',
        includeEducation: true,
      });
      expect(useTaskStore.getState().authStatus.has_microsoft).toBe(true);
      expect(useTaskStore.getState().authStatus.microsoft_has_refresh_token).toBe(true);
    });

    it('startMicrosoftOAuthFlow handles error gracefully', async () => {
      mockInvoke.mockImplementation(async (cmd) => {
        if (cmd === 'start_microsoft_oauth_flow') {
          throw new Error('User cancelled Microsoft login');
        }
        return null;
      });

      const { startMicrosoftOAuthFlow } = useTaskStore.getState();
      const res = await startMicrosoftOAuthFlow();

      expect(res.success).toBe(false);
      expect(res.error).toContain('User cancelled Microsoft login');
    });
  });

  describe('subtask & deadline integration through unified sync seam', () => {
    const sampleGoogleTask: UnifiedTask = {
      id: 'gt_parent_1',
      title: 'Parent Task',
      source: 'google_tasks',
      status: 'todo',
      url: 'https://tasks.google.com',
      updatedAt: new Date().toISOString(),
      sourceMeta: {
        listId: 'work_list',
        listTitle: 'Work',
        hasSubtasks: true,
        subtaskCount: 2,
        subtasks: [
          { id: 'gt_sub_1', title: 'Subtask 1', status: 'todo' },
          { id: 'gt_sub_2', title: 'Subtask 2', status: 'done' },
        ],
      },
    };

    beforeEach(() => {
      useTaskStore.setState({
        tasks: [sampleGoogleTask],
      });
    });

    it('toggleSubtask toggles status and reverts if syncAdapter rejects', async () => {
      const { toggleSubtask } = useTaskStore.getState();

      await toggleSubtask('gt_parent_1', 'gt_sub_1');
      expect(
        useTaskStore.getState().tasks[0].sourceMeta.subtasks!.find((s) => s.id === 'gt_sub_1')?.status
      ).toBe('done');
      expect(testSyncAdapter.subtaskMutations[0]).toEqual({
        provider: 'google_tasks',
        action: 'toggle',
        containerId: 'work_list',
        taskId: 'gt_parent_1',
        subtaskId: 'gt_sub_1',
        newStatus: 'done',
      });

      testSyncAdapter.nextError = new Error('Network error');
      await toggleSubtask('gt_parent_1', 'gt_sub_1');
      expect(
        useTaskStore.getState().tasks[0].sourceMeta.subtasks!.find((s) => s.id === 'gt_sub_1')?.status
      ).toBe('done');
    });

    it('createSubtask and deleteSubtask update counts and forward opaque IDs across seam', async () => {
      testSyncAdapter.nextCreatedSubtask = {
        id: 'gt_remote_sub_999',
        title: 'New Subtask',
        status: 'todo',
      };

      const { createSubtask, deleteSubtask } = useTaskStore.getState();
      const created = await createSubtask('gt_parent_1', 'New Subtask');

      expect(created?.id).toBe('gt_remote_sub_999');
      expect(useTaskStore.getState().tasks[0].sourceMeta.subtaskCount).toBe(3);

      await deleteSubtask('gt_parent_1', 'gt_sub_1');
      expect(useTaskStore.getState().tasks[0].sourceMeta.subtaskCount).toBe(2);
      expect(testSyncAdapter.subtaskMutations[1].subtaskId).toBe('gt_sub_1');
    });
  });

  describe('deadline tracking and priority filtering', () => {
    it('sets deadline filter and sort options in store', () => {
      const { setDeadlineFilter, setDeadlineSort } = useTaskStore.getState();

      setDeadlineFilter('overdue');
      expect(useTaskStore.getState().deadlineFilter).toBe('overdue');

      setDeadlineSort('soonest');
      expect(useTaskStore.getState().deadlineSort).toBe('soonest');
    });

    it('setTaskDeadline updates GitHub deadline, keeps description tag synced, and clears cleanly', async () => {
      const { addTask, setTaskDeadline } = useTaskStore.getState();

      addTask({
        title: 'Review authentication RFC',
        source: 'github',
        status: 'in_progress',
        description: 'Initial summary',
        url: 'https://github.com/org/widkanban/issues/42',
        sourceMeta: { repo: 'org/widkanban', issueNumber: 42, isPullRequest: true },
      });

      const task = useTaskStore.getState().tasks.find((t) => t.title === 'Review authentication RFC')!;
      const dueIso = '2026-10-25T18:00:00.000Z';

      const setRes = await setTaskDeadline(task.id, dueIso, 'review');
      expect(setRes.success).toBe(true);

      const updated = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(updated.sourceMeta?.dueDate).toBe(dueIso);
      expect(updated.sourceMeta?.deadlineType).toBe('review');
      expect(updated.description).toContain(`> ⏱️ **Widkanban Deadline**: ${dueIso}`);

      const clearRes = await setTaskDeadline(task.id, null);
      expect(clearRes.success).toBe(true);

      const cleared = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(cleared.sourceMeta?.dueDate).toBeUndefined();
      expect(cleared.description).toBe('Initial summary');
    });
  });

  describe('GitHub workflow, PR linking, and Done actions (Batch 2)', () => {
    it('opens GitHub done action modal when moved to Done with doneAction=ask', async () => {
      const { addTask, moveTask } = useTaskStore.getState();

      addTask({
        title: 'Fix edge case in parser',
        source: 'github',
        status: 'in_progress',
        url: 'https://github.com/org/widkanban/issues/60',
        sourceMeta: { repo: 'org/widkanban', issueNumber: 60, isPullRequest: false },
      });

      const task = useTaskStore.getState().tasks.find((t) => t.title === 'Fix edge case in parser')!;
      await moveTask(task.id, 'done');

      expect(useTaskStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('in_progress');
      expect(useTaskStore.getState().githubDoneModalTask?.id).toBe(task.id);
      expect(testSyncAdapter.transitions).toHaveLength(0);
    });

    it('executes close action remotely through syncAdapter when user confirms close', async () => {
      const { addTask, executeGitHubDoneAction } = useTaskStore.getState();

      addTask({
        title: 'Complete documentation',
        source: 'github',
        status: 'in_progress',
        url: 'https://github.com/org/widkanban/issues/61',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 61,
          isPullRequest: false,
          labels: [{ name: 'in-progress', color: 'd93f0b' }],
        },
      });

      const task = useTaskStore.getState().tasks.find((t) => t.title === 'Complete documentation')!;
      await executeGitHubDoneAction(task, 'close', true);

      expect(testSyncAdapter.transitions).toEqual([
        {
          provider: 'github',
          taskId: task.id,
          newStatus: 'done',
          containerId: 'org/widkanban',
          issueNumber: 61,
          targetLabel: null,
          opposingLabel: 'in-progress',
          postCommentFallback: false,
          remoteState: 'closed',
          stateReason: 'completed',
        },
      ]);
      expect(useTaskStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('done');
      expect(useTaskStore.getState().githubSyncSettings.doneAction).toBe('close');
      expect(useTaskStore.getState().githubDoneModalTask).toBeNull();
    });

    it('executes label action remotely through syncAdapter when user confirms label', async () => {
      const { addTask, executeGitHubDoneAction } = useTaskStore.getState();

      addTask({
        title: 'Tag issue as done only',
        source: 'github',
        status: 'in_progress',
        url: 'https://github.com/org/widkanban/issues/63',
        sourceMeta: {
          repo: 'org/widkanban',
          issueNumber: 63,
          isPullRequest: false,
          labels: [{ name: 'in-progress', color: 'd93f0b' }],
        },
      });

      const task = useTaskStore.getState().tasks.find((t) => t.title === 'Tag issue as done only')!;
      await executeGitHubDoneAction(task, 'label', false);

      expect(testSyncAdapter.transitions).toEqual([
        {
          provider: 'github',
          taskId: task.id,
          newStatus: 'done',
          containerId: 'org/widkanban',
          issueNumber: 63,
          targetLabel: 'done',
          opposingLabel: 'in-progress',
          postCommentFallback: false,
        },
      ]);
      const updated = useTaskStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(updated.status).toBe('done');
      expect(updated.sourceMeta?.labels?.map((l) => l.name)).toEqual(['done']);
      expect(useTaskStore.getState().githubSyncSettings.doneAction).toBe('ask');
    });

    it('reopens closed issue through syncAdapter when moving from Done back to In Progress', async () => {
      const { addTask, moveTask, setGithubSyncSettings } = useTaskStore.getState();

      setGithubSyncSettings({ doneAction: 'close', manageLabels: true });

      addTask({
        title: 'Reopened issue feature',
        source: 'github',
        status: 'done',
        url: 'https://github.com/org/widkanban/issues/62',
        sourceMeta: { repo: 'org/widkanban', issueNumber: 62, isPullRequest: false },
      });

      const task = useTaskStore.getState().tasks.find((t) => t.title === 'Reopened issue feature')!;
      await moveTask(task.id, 'in_progress');

      expect(testSyncAdapter.transitions).toEqual([
        {
          provider: 'github',
          taskId: task.id,
          newStatus: 'in_progress',
          containerId: 'org/widkanban',
          issueNumber: 62,
          targetLabel: 'in-progress',
          opposingLabel: 'done',
          postCommentFallback: false,
          remoteState: 'open',
          stateReason: 'reopened',
        },
      ]);
      expect(useTaskStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('in_progress');
    });
  });
});

