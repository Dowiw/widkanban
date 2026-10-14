# WidKanban — Feature Checklist & Roadmap

This document tracks completed capabilities, active milestones, and planned features for **WidKanban**.

---

## Table of Contents

- [Completed Capabilities](#completed-capabilities)
  - [Frameless Desktop Widget & UI](#frameless-desktop-widget--ui)
  - [GitHub Integration & Issue Management](#github-integration--issue-management)
  - [Google Tasks Integration](#google-tasks-integration)
- [Upcoming & Planned Features](#upcoming--planned-features)
  - [Background Tokio Polling Loop](#background-tokio-polling-loop)
  - [Native Desktop Notifications](#native-desktop-notifications)
  - [Cross-Platform Installers](#cross-platform-installers)
  - [In-App OAuth Loopback Flow](#in-app-oauth-loopback-flow)
- [Future Ideas & Enhancements](#future-ideas--enhancements)
- [Related Documentation](#related-documentation)

---

## Completed Capabilities

### Frameless Desktop Widget & UI
- [x] **Frameless Glassmorphic Window**: Transparent backdrop (`widget-glass`), borderless window decorations, and always-on-top pin toggle.
- [x] **Native System Tray Menu**: Context menu integration for Show/Hide, Always on Top, and Quit actions.
- [x] **Interactive Drag & Drop**: `@dnd-kit` core + sortable integration with instant 60fps optimistic state updates in Zustand.
- [x] **Quick Add Task Modal**: Local task creation with status, priority, and markdown description support.
- [x] **Task Search & Filtering**: Instant search across titles, repos, notes, and provider badge filters (`All`, `GitHub`, `Google Tasks`).

### GitHub Integration & Issue Management
- [x] **Token Management**: Secure native storage of GitHub Personal Access Tokens (PAT) via Tauri IPC into OS app data (`credentials.json`).
- [x] **Issue & PR Querying**: Automated query of user-assigned open issues and review-requested pull requests (`GET /user/issues?state=open`).
- [x] **Rich Task Details**:
  - [x] Pull Request branch comparison: head ref, base ref, fork badges, and draft tags.
  - [x] Diff statistics: additions (`+`), deletions (`-`), and files changed.
  - [x] Author and assignee avatars with GitHub logins.
  - [x] Milestones with due date badges.
  - [x] Comment count counters and colored repository labels.
- [x] **Two-Way Status Synchronization**:
  - [x] Dragging between *To Do* and *In Progress* applies or removes `to-do` / `in-progress` labels on the remote repository.
  - [x] Automated repo label detection with first-connect onboarding configuration modal.
- [x] **Issue Deletion & Local Trash System**:
  - [x] Delete modal with choice between **Delete Locally Only** and **Delete on GitHub**.
  - [x] Remote closing via REST API (`PATCH /repos/{owner}/{repo}/issues/{number}`) with `state_reason: "not_planned"` and optional closing comments / duplicate issue reference.
  - [x] Remote permanent deletion via GitHub GraphQL API `deleteIssue` mutation (for repository admins).
  - [x] Header trash dropdown with restore actions and sync filter to prevent locally hidden tasks from reappearing unprompted.

### Google Tasks Integration
- [x] **OAuth 2.0 Credential Storage**: Support for Google OAuth tokens (`ya29....`) stored natively in Rust.
- [x] **Multi-List Synchronization**: Fetching all task lists and task items (`GET /tasks/v1/users/@me/lists`).
- [x] **Subtasks & Links Normalization**: Support for indented parent-child subtasks and related email / document links.
- [x] **Two-Way Status Write-Back**:
  - [x] Dragging Google Tasks cards to *Done* marks remote status as `completed` (`PATCH /tasks/v1/lists/{listId}/tasks/{taskId}`).
  - [x] Dragging back to *To Do* reverts status to `needsAction`.
- [x] **Ephemeral Testing Support**: Fast 60-second setup path via Google OAuth Playground for contributors without Google Cloud setup.

---

## Upcoming & Planned Features

### Background Tokio Polling Loop
- [ ] Periodic background sync engine (~3-minute cadence) running on async threads to refresh assigned issues and tasks automatically.

### Native Desktop Notifications
- [ ] System notifications when new issues or tasks are assigned to the user.

### Cross-Platform Installers
- [ ] **Windows**: Standalone `.msi` and `.exe` installer bundles.
- [ ] **Linux**: `.AppImage` and `.deb` distribution packages.
- [ ] **macOS**: Signed `.dmg` application packages.

### In-App OAuth Loopback Flow
- [ ] Built-in local HTTP callback server (`http://localhost:<port>/callback`) for seamless Google sign-in without needing the OAuth Playground.

---

## Future Ideas & Enhancements

- **GitLab & Jira Integrations**: Optional adapters following the same `UnifiedTask` normalization schema.
- **Custom Board Columns**: Allowing user-defined workflow columns beyond the default 3 columns.
- **Offline Mode & Queue**: Queuing write-back actions during offline network states and replaying on reconnect.

---

## Related Documentation

- [Project README](../README.md): High-level overview, key features, and quick start.
- [Contributor Guide & Manual](../CONTRIBUTORS.md): Development setup, testing with ephemeral keys, and PR checklist.
- [Credentials Setup Guide](credentials-setup.md): Guide for GitHub PAT and Google Tasks OAuth configuration.
- [Architecture & System Design](architecture.md): Security model, data schemas, and Tauri IPC bridge.
- [Developer Notes](notes.md): Environment dependencies, frameless window behavior, and MSVC setup.
