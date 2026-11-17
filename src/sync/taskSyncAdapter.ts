import { invoke } from '@tauri-apps/api/core';
import {
  DeadlineUpdateResult,
  RemoteDeleteRequest,
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

  public nextError: Error | null = null;
  public nextDeadlineResult: DeadlineUpdateResult | null = null;
  public nextCreatedSubtask: SubtaskItem | null = null;

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
}

export const defaultTaskSyncAdapter = (): TaskSyncAdapter =>
  isTauriRuntime() ? new TauriTaskSyncAdapter() : new PreviewTaskSyncAdapter();
