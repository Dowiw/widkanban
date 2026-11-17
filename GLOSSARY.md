# WidKanban

Domain vocabulary for WidKanban's cross-provider desktop Kanban widget.

## Language

**Unified Task**:
A normalized work item rendered as a single card on the Kanban board regardless of origin.
_Avoid_: Item, ticket, issue-card, card-model.

**Provider**:
An external task system integrated into WidKanban (`github`, `google_tasks`, `microsoft_teams`).
_Avoid_: Source, backend, integration, service.

**Container**:
A provider-owned grouping that holds tasks, such as a repository or a task list.
_Avoid_: Bucket, folder, project, workspace.

**Subtask**:
A nested checklist step belonging to a parent Unified Task with status `todo` or `done`.
_Avoid_: Checklist item, child task.

**Deadline**:
A calendar-normalized target completion date or timestamp used for urgency display, filtering, and sorting.
_Avoid_: Due date, due time.

**Board Transition**:
Moving a Unified Task across workflow columns (`todo`, `in_progress`, `done`) with matching remote synchronization.
_Avoid_: Status change, drag event, column swap.

**Local Trash**:
Soft-hidden tasks retained locally so recurring provider syncs do not re-surface dismissed work.
_Avoid_: Archive, recycle bin, hidden list.

**Capabilities**:
Normalized action permissions on a Unified Task (`canEditDeadline`, `canManageSubtasks`, `supportedRemoteDeleteModes`) indicating what mutations are valid.
_Avoid_: Feature flags, metadata bag, permission checks.
