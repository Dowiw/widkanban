import { invoke } from '@tauri-apps/api/core';
import {
  DeadlineUpdateResult,
  GoogleTaskListSummary,
  MSToDoListSummary,
  OrganizationRoles,
  RemoteDeleteRequest,
  RepoSummary,
  SubtaskItem,
  SubtaskMutationRequest,
  TaskDeadlineRequest,
  TaskSource,
  TaskTransitionRequest,
  UnifiedTask,
} from '../types/task';

export const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Seam for executing task-provider synchronization against a backend or test stand-in.
 */
export interface TaskSyncAdapter {
  fetchProviderTasks(provider: TaskSource): Promise<UnifiedTask[]>;
  transitionTaskStatus(request: TaskTransitionRequest): Promise<void>;
  updateTaskDeadline(request: TaskDeadlineRequest): Promise<DeadlineUpdateResult>;
  deleteTaskRemote(request: RemoteDeleteRequest): Promise<void>;
  mutateSubtask(request: SubtaskMutationRequest): Promise<SubtaskItem | null>;
  fetchUserGitHubRepos(): Promise<RepoSummary[]>;
  fetchGoogleTaskLists(): Promise<GoogleTaskListSummary[]>;
  createGoogleTaskList(title: string): Promise<GoogleTaskListSummary>;
  fetchMicrosoftToDoLists(): Promise<MSToDoListSummary[]>;
  createMicrosoftToDoList(title: string): Promise<MSToDoListSummary>;
  getOrganizationRoles(): Promise<OrganizationRoles>;
}

/**
 * Production adapter backed by WidKanban's unified Tauri v2 IPC commands.
 */
export class TauriTaskSyncAdapter implements TaskSyncAdapter {
  async fetchProviderTasks(provider: TaskSource): Promise<UnifiedTask[]> {
    return await invoke<UnifiedTask[]>('fetch_provider_tasks', { provider });
  }

  async transitionTaskStatus(request: TaskTransitionRequest): Promise<void> {
    await invoke<void>('transition_task_status', { request });
  }

  async updateTaskDeadline(request: TaskDeadlineRequest): Promise<DeadlineUpdateResult> {
    return await invoke<DeadlineUpdateResult>('update_task_deadline', { request });
  }

  async deleteTaskRemote(request: RemoteDeleteRequest): Promise<void> {
    await invoke<void>('delete_task_remote', { request });
  }

  async mutateSubtask(request: SubtaskMutationRequest): Promise<SubtaskItem | null> {
    return await invoke<SubtaskItem | null>('mutate_task_subtask', { request });
  }

  async fetchUserGitHubRepos(): Promise<RepoSummary[]> {
    return await invoke<RepoSummary[]>('fetch_user_github_repos');
  }

  async fetchGoogleTaskLists(): Promise<GoogleTaskListSummary[]> {
    return await invoke<GoogleTaskListSummary[]>('fetch_google_task_lists');
  }

  async createGoogleTaskList(title: string): Promise<GoogleTaskListSummary> {
    return await invoke<GoogleTaskListSummary>('create_google_task_list', { title });
  }

  async fetchMicrosoftToDoLists(): Promise<MSToDoListSummary[]> {
    return await invoke<MSToDoListSummary[]>('fetch_microsoft_todo_lists');
  }

  async createMicrosoftToDoList(title: string): Promise<MSToDoListSummary> {
    return await invoke<MSToDoListSummary>('create_microsoft_todo_list', { title });
  }

  async getOrganizationRoles(): Promise<OrganizationRoles> {
    return await invoke<OrganizationRoles>('get_organization_roles');
  }
}

/**
 * Browser-preview adapter allowing optimistic local state changes when running
 * outside the native Tauri desktop runtime.
 */
export class PreviewTaskSyncAdapter implements TaskSyncAdapter {
  async fetchProviderTasks(): Promise<UnifiedTask[]> {
    return [];
  }

  async transitionTaskStatus(): Promise<void> {}

  async updateTaskDeadline(request: TaskDeadlineRequest): Promise<DeadlineUpdateResult> {
    return { dueDate: request.dueDate };
  }

  async deleteTaskRemote(): Promise<void> {}

  async mutateSubtask(request: SubtaskMutationRequest): Promise<SubtaskItem | null> {
    if (request.action === 'create') {
      return {
        id: `preview_sub_${Date.now()}`,
        title: request.title?.trim() || '',
        status: 'todo',
      };
    }
    return null;
  }

  async fetchUserGitHubRepos(): Promise<RepoSummary[]> {
    return [];
  }

  async fetchGoogleTaskLists(): Promise<GoogleTaskListSummary[]> {
    return [];
  }

  async createGoogleTaskList(title: string): Promise<GoogleTaskListSummary> {
    return { id: `preview_gt_list_${Date.now()}`, title: title.trim() };
  }

  async fetchMicrosoftToDoLists(): Promise<MSToDoListSummary[]> {
    return [];
  }

  async createMicrosoftToDoList(title: string): Promise<MSToDoListSummary> {
    return { id: `preview_ms_list_${Date.now()}`, title: title.trim(), isOwner: true };
  }

  async getOrganizationRoles(): Promise<OrganizationRoles> {
    return { teamsRole: 'student' };
  }
}

/**
 * In-memory adapter for tests: records all operations across the seam and
 * supports programmable results and failures without mocking global IPC modules.
 */
export class InMemoryTaskSyncAdapter implements TaskSyncAdapter {
  public tasksByProvider: Partial<Record<TaskSource, UnifiedTask[]>> = {};
  public transitions: TaskTransitionRequest[] = [];
  public deadlineUpdates: TaskDeadlineRequest[] = [];
  public remoteDeletions: RemoteDeleteRequest[] = [];
  public subtaskMutations: SubtaskMutationRequest[] = [];
  public githubRepos: RepoSummary[] = [];
  public googleLists: GoogleTaskListSummary[] = [];
  public microsoftLists: MSToDoListSummary[] = [];
  public createdGoogleLists: string[] = [];
  public createdMicrosoftLists: string[] = [];
  public organizationRoles: OrganizationRoles = { teamsRole: 'student' };

  public nextError: Error | null = null;
  public nextDeadlineResult: DeadlineUpdateResult | null = null;
  public nextCreatedSubtask: SubtaskItem | null = null;
  public nextCreatedGoogleList: GoogleTaskListSummary | null = null;
  public nextCreatedMicrosoftList: MSToDoListSummary | null = null;

  private maybeThrow() {
    if (this.nextError) {
      const err = this.nextError;
      this.nextError = null;
      throw err;
    }
  }

  async fetchProviderTasks(provider: TaskSource): Promise<UnifiedTask[]> {
    this.maybeThrow();
    return this.tasksByProvider[provider] ? [...this.tasksByProvider[provider]!] : [];
  }

  async transitionTaskStatus(request: TaskTransitionRequest): Promise<void> {
    this.transitions.push(request);
    this.maybeThrow();
  }

  async updateTaskDeadline(request: TaskDeadlineRequest): Promise<DeadlineUpdateResult> {
    this.deadlineUpdates.push(request);
    this.maybeThrow();
    if (this.nextDeadlineResult) {
      const result = this.nextDeadlineResult;
      this.nextDeadlineResult = null;
      return result;
    }
    return { dueDate: request.dueDate };
  }

  async deleteTaskRemote(request: RemoteDeleteRequest): Promise<void> {
    this.remoteDeletions.push(request);
    this.maybeThrow();
  }

  async mutateSubtask(request: SubtaskMutationRequest): Promise<SubtaskItem | null> {
    this.subtaskMutations.push(request);
    this.maybeThrow();
    if (request.action === 'create') {
      if (this.nextCreatedSubtask) {
        const sub = this.nextCreatedSubtask;
        this.nextCreatedSubtask = null;
        return sub;
      }
      return {
        id: `mem_sub_${this.subtaskMutations.length}`,
        title: request.title?.trim() || '',
        status: 'todo',
      };
    }
    return null;
  }

  async fetchUserGitHubRepos(): Promise<RepoSummary[]> {
    this.maybeThrow();
    return [...this.githubRepos];
  }

  async fetchGoogleTaskLists(): Promise<GoogleTaskListSummary[]> {
    this.maybeThrow();
    return [...this.googleLists];
  }

  async createGoogleTaskList(title: string): Promise<GoogleTaskListSummary> {
    this.createdGoogleLists.push(title);
    this.maybeThrow();
    if (this.nextCreatedGoogleList) {
      const list = this.nextCreatedGoogleList;
      this.nextCreatedGoogleList = null;
      return list;
    }
    return { id: `mem_gt_list_${this.createdGoogleLists.length}`, title };
  }

  async fetchMicrosoftToDoLists(): Promise<MSToDoListSummary[]> {
    this.maybeThrow();
    return [...this.microsoftLists];
  }

  async createMicrosoftToDoList(title: string): Promise<MSToDoListSummary> {
    this.createdMicrosoftLists.push(title);
    this.maybeThrow();
    if (this.nextCreatedMicrosoftList) {
      const list = this.nextCreatedMicrosoftList;
      this.nextCreatedMicrosoftList = null;
      return list;
    }
    return { id: `mem_ms_list_${this.createdMicrosoftLists.length}`, title, isOwner: true };
  }

  async getOrganizationRoles(): Promise<OrganizationRoles> {
    this.maybeThrow();
    return { ...this.organizationRoles };
  }
}

export const defaultTaskSyncAdapter = (): TaskSyncAdapter =>
  isTauriRuntime() ? new TauriTaskSyncAdapter() : new PreviewTaskSyncAdapter();
