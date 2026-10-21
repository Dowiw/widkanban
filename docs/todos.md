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

### Background Tokio Polling Loop & Auto-Sync Engine ([#10](https://github.com/Dowiw/widkanban/issues/10))
- [ ] User onboarding consent prompt upon connecting accounts: "Enable automatic background sync?".
- [ ] Periodic background polling loop (configurable in Settings: 1m, 3m, 5m, 15m, or manual).
- [ ] Remote change detection with in-app banner and native OS desktop notifications (`tauri-plugin-notification`).

### GitHub Flavored Markdown (GFM) Parsing ([#7](https://github.com/Dowiw/widkanban/issues/7))
- [ ] Standard GFM rendering for task descriptions and issue bodies (`react-markdown` + `remark-gfm`).
- [ ] Support headings, lists, code blocks, tables, blockquotes, and task checklists (`- [ ]`, `- [x]`).
- [ ] Safe external link delegation opening in the user's default browser via `@tauri-apps/plugin-opener`.
- [ ] HTML sanitization via `rehype-sanitize` to protect frameless desktop webview.

### Universal Font Family Synchronization ([#8](https://github.com/Dowiw/widkanban/issues/8))
- [ ] Ensure user-selected font family (`Outfit`, `GNU Unifont`, `System UI`, `Coding Mono`) cascades across all UI text (headers, app title, task descriptions, IDs, badges, modals).
- [ ] Remove hardcoded font overrides in `TaskCard.tsx` (`font-sans`), `Header.tsx` (`font-unifont`), and metadata tags.
- [ ] Preserve fixed-pitch monospace strictly for code snippets, commit SHAs, and diff counters (`+` / `-`).

### Production Add Task Workflow ([#9](https://github.com/Dowiw/widkanban/issues/9))
- [ ] Remove all "Mock" developer labels and placeholders from Add Task modal and UI tooltips.
- [ ] Support production fields: Title, Provider (GitHub / Google Tasks), Status column, target repo/list, and description notes.
- [ ] Form validation and clean client ID generation conforming to `UnifiedTask` schema.

### Smart Container Discovery & Organization Permissions ([#25](https://github.com/Dowiw/widkanban/issues/25))
- [ ] Searchable repository dropdown for GitHub (owned repos + assigned issue/PR repos).
- [ ] Dropdown for all Google Tasks and Microsoft To Do lists with inline `+ Create New List` feature.
- [ ] Role detection for Teams assignments and Blackboard Learn: show `Disabled by organization` for student roles.
- [ ] Pre-fetch and background caching of available containers for instant modal opening.


### API Rate Limit & Token Expiration Tracking ([#11](https://github.com/Dowiw/widkanban/issues/11))
- [ ] GitHub PAT rate limit header tracking (`x-ratelimit-*`) and expiration date tracking (`github-authentication-token-expiration`).
- [ ] Google Tasks OAuth token lifetime inspection via tokeninfo (`expires_in`).
- [ ] Expandable "API Quota & Token Health" drawer inside each provider card in Settings modal.
- [ ] Header warning indicator when rate limits drop below 10% or tokens are near expiration (< 24h).

### GitHub Issue & PR Deadlines via 'Widkanban:' Tag ([#18](https://github.com/Dowiw/widkanban/issues/18))
- [ ] Parse `Widkanban: deadline` tags from issue and PR description bodies into `sourceMeta.dueDate`.
- [ ] Interactive date/time picker writing back to GitHub description bodies with visible markdown and machine HTML comment.

### Configurable GitHub Done Action ([#19](https://github.com/Dowiw/widkanban/issues/19))
- [ ] Choice between closing remote issue as `completed`, applying `done` label only, or local-only completion.
- [ ] Action prompt with "Remember my choice" checkbox and persistent Settings configuration.

### GitHub PR-to-Issue Linking & Board De-cluttering ([#20](https://github.com/Dowiw/widkanban/issues/20))
- [ ] Auto-detect `closes #X` / `fixes #X` links and merge PRs into primary issue cards.
- [ ] Rich PR badges with branch information, diff counters, and expandable PR description drawer.

### Multi-Column Board Configuration & Action Triggers ([#21](https://github.com/Dowiw/widkanban/issues/21))
- [ ] Visual Column Manager in Settings to add, rename, color, and reorder workflow columns.
- [ ] Configurable integration action triggers per column (GitHub labels/state, PR review state, Google/Microsoft statuses).
- [ ] Reverse routing rules mapping incoming external tasks into custom columns.

### Filter and Sort by Deadline ([#22](https://github.com/Dowiw/widkanban/issues/22))
- [ ] Header dropdown controls for deadline presets (`Overdue`, `Today`, `This Week`, `Earliest First`).
- [ ] Dynamic color-coded urgency badges on cards (red for overdue, amber for <24h).

### Interactive Google Tasks Subtasks ([#23](https://github.com/Dowiw/widkanban/issues/23))
- [x] In-card checkbox completion with immediate 60fps local update and Google Tasks API write-back.
- [x] In-card subtask creation (`POST ...?parent=...`) and hover deletion.

### Blackboard Learn LMS Integration ([#24](https://github.com/Dowiw/widkanban/issues/24))
- [ ] Ingest Blackboard assignments, assessments, and calendar due dates (`GET /learn/api/public/v1/...`).
- [ ] Settings connection card for institution domain and personal token.
- [ ] Dedicated Blackboard filter tab and direct assignment submission links.

### Native Desktop Notifications
- [ ] System notifications when new issues or tasks are assigned to the user.

### Cross-Platform Installers
- [ ] **Windows**: Standalone `.msi` and `.exe` installer bundles.
- [ ] **Linux**: `.AppImage` and `.deb` distribution packages.
- [ ] **macOS**: Signed `.dmg` application packages.

### In-App OAuth Loopback Flow
- [ ] Built-in local HTTP callback server (`http://localhost:<port>/callback`) for seamless Google sign-in without needing the OAuth Playground.

### Cross-Platform OS Autostart & Persistence ([#4](https://github.com/Dowiw/widkanban/issues/4))
- [ ] Cross-platform launch at startup (`tauri-plugin-autostart`) for Windows (Registry), macOS (LaunchAgent), and Linux (XDG Autostart).
- [ ] User onboarding prompt asking for consent to start on boot (`[Launch on Startup]` / `[Not Now]`).
- [ ] Settings switches for "Launch on Startup" and optional "Start Minimized to System Tray".
- [ ] Remember and restore last dragged window placement and size on boot.

### Developer Credential Overrides via `.env` ([#6](https://github.com/Dowiw/widkanban/issues/6))
- [x] Allow developers to pass API tokens (`GITHUB_TOKEN`, `GOOGLE_TASKS_TOKEN`) via local `.env` / `.env.local` for rapid local testing in dev mode.
- [x] Add `.env.example` template with dummy keys and update contributor onboarding guides.

---

## Future Ideas & Enhancements

- **GitLab & Jira Integrations**: Optional adapters following the same `UnifiedTask` normalization schema.
- **Offline Mode & Queue**: Queuing write-back actions during offline network states and replaying on reconnect.

---

## Related Documentation

- [Project README](../README.md): High-level overview, key features, and quick start.
- [Contributor Guide & Manual](../CONTRIBUTORS.md): Development setup, testing with ephemeral keys, and PR checklist.
- [Credentials Setup Guide](credentials-setup.md): Guide for GitHub PAT and Google Tasks OAuth configuration.
- [Architecture & System Design](architecture.md): Security model, data schemas, and Tauri IPC bridge.
- [Developer Notes](notes.md): Environment dependencies, frameless window behavior, and MSVC setup.
