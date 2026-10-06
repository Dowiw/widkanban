# WidKanban — Agent Guidelines & Project Operating Manual

Welcome to **WidKanban**! This document serves as the primary operational and architectural guide for AI coding agents contributing to this codebase. It outlines core design principles, non-negotiable architectural invariants, development workflows, testing rules, and roadmap priorities.

---

## 1. Project Overview & Mission

**WidKanban** is a lightweight, frameless, unobtrusive desktop Kanban widget designed to sit on the desktop layer. It aggregates **GitHub Issues/PRs** and **Google Tasks** into a single, unified 3-column Kanban board (*To Do*, *In Progress*, *Done*).

### Tech Stack
- **Desktop Framework**: [Tauri v2](https://v2.tauri.app/) (Rust 2021)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Test Runner**: Vitest + React Testing Library

---

## 2. Non-Negotiable Architectural Invariants

Whenever implementing features, agents **MUST** uphold these core invariants:

1. **Zero Auth Secrets in Frontend Context**:
   - GitHub Personal Access Tokens (PATs) and Google OAuth tokens **must never be stored in browser `localStorage`, `sessionStorage`, or frontend state**.
   - All tokens must reside in the native Rust backend (OS Keychain / `tauri-plugin-store`).
   - All network calls to external provider APIs (GitHub, Google) must be executed by Rust via Tauri IPC commands (`invoke()`), never via frontend `fetch()` to provider endpoints.

2. **Unified Data Normalization**:
   - All tasks across all providers must be strictly mapped into the `UnifiedTask` interface defined in [`src/types/task.ts`](file:///home/dowiw/project_repos/widkanban/src/types/task.ts).
   - Frontend components must operate exclusively against `UnifiedTask` models, keeping provider-specific variations abstracted inside `sourceMeta`.

3. **Optimistic UI with Background Write-Back**:
   - Dragging a card between columns updates the local Zustand store immediately for 60fps responsiveness.
   - A background Rust IPC call is dispatched to synchronize changes with external APIs.
   - If an API write-back fails, revert the change in the Zustand store and notify the user.

4. **Frameless Desktop Widget UX**:
   - The window has `decorations: false`, transparent backdrop (`widget-glass`), and pins on top (`alwaysOnTop`).
   - Draggable regions use the `data-tauri-drag-region` HTML attribute.
   - All clickable elements (buttons, inputs, links) located inside a drag region must include `no-drag` or explicitly handle click propagation to avoid hijacking clicks as window drag events.

---

## 3. Repository Layout

```text
widkanban/
├── src/                         # React 19 Frontend
│   ├── components/              # UI Components
│   │   ├── KanbanBoard.tsx      # DnD Context & Column Layout
│   │   ├── Column.tsx           # Column container & drop target
│   │   ├── TaskCard.tsx         # Draggable task card with provider badges
│   │   ├── Header.tsx           # Search, provider filters, window controls
│   │   └── AddTaskModal.tsx     # Quick task creation modal
│   ├── mock/
│   │   └── mockTasks.ts         # Sample tasks for dev preview & testing
│   ├── store/
│   │   ├── useTaskStore.ts      # Main Zustand task & filter store
│   │   └── useTaskStore.test.ts # Vitest suite for state operations
│   ├── types/
│   │   └── task.ts              # UnifiedTask, TaskSource, TaskStatus
│   ├── App.tsx                  # Root app frame & layout
│   └── index.css                # Tailwind entry & custom glassmorphism styles
├── src-tauri/                   # Tauri v2 (Rust Core)
│   ├── src/
│   │   ├── lib.rs               # IPC command handlers & System Tray builder
│   │   └── main.rs              # Tauri application entrypoint
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Window configuration & Tauri permissions
├── docs/                        # Detailed documentation
│   ├── architecture.md          # Architecture, schemas, security model
│   ├── notes.md                 # Developer notes, Linux GTK/WebKit troubleshooting
│   └── todos.md                 # Project milestones & roadmap checklist
├── package.json                 # Node dependencies & npm scripts
└── AGENTS.md                    # This operating guide
```

---

## 4. Key Development Commands

Always run these commands from the repository root (`/home/dowiw/project_repos/widkanban`):

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Run Unit Tests** | `npm test` | Runs Vitest unit tests |
| **Type Check & Build** | `npm run build` | Verifies TypeScript types and compiles Vite bundle |
| **Browser Dev Server** | `npm run dev` | Rapid webview preview (`http://localhost:1420`) |
| **Desktop Widget Dev** | `npm run tauri dev` | Launches native Tauri v2 desktop application |
| **Rust Typecheck** | `cargo check --manifest-path src-tauri/Cargo.toml` | Verifies Rust code compilation without full link |

---

## 5. Development Roadmap & Current Focus

### Phase 1: Scaffolding & UI Prototype ✅ *(Completed)*
- Frameless glassmorphic window, system tray menu (*Show/Hide*, *Pin*, *Quit*).
- Zustand store with `@dnd-kit` drag-and-drop support.
- Provider badges, search filtering, and Add Task modal.

### Phase 2: GitHub API Integration 🎯 *(Current Priority)*
- [ ] **Token Management**: Settings modal to input GitHub PAT; Rust backend stores PAT securely.
- [ ] **Issue Fetching**: Rust command `fetch_github_tasks` to query assigned issues (`GET /user/issues?state=open`).
- [ ] **Write-Back**:
  - Dragging to *Done* closes the issue (`PATCH /repos/{owner}/{repo}/issues/{number}`).
  - Dragging to *In Progress* applies the `in-progress` label.
- [ ] **PR Support**: Query open pull requests assigned for review.

### Phase 3: Google Tasks Integration 🔜
- [ ] OAuth 2.0 loopback flow in Rust (`http://localhost:<port>/callback`).
- [ ] Fetching task lists and items (`GET /tasks/v1/users/@me/lists`).
- [ ] Two-way status sync (`completed` status when moved to *Done*).

### Phase 4: Background Sync Engine & Distribution 🔜
- [ ] Background Tokio polling loop (~3-minute cadence).
- [ ] Tauri event emission (`tasks-updated`) to webview.
- [ ] Desktop notifications on new assignments.
- [ ] Packaging (AppImage, `.deb`, Windows `.msi`).

---

## 6. Coding Standards & Agent Best Practices

### Frontend (React & TypeScript)
- Use functional components with explicit TypeScript interfaces.
- Avoid passing raw inline styles; leverage Tailwind utility classes and CSS variables.
- Keep components focused and decoupled:
  - Complex state transformations belong in [`src/store/useTaskStore.ts`](file:///home/dowiw/project_repos/widkanban/src/store/useTaskStore.ts).
  - Normalization logic belongs in dedicated adapters/mappers.
- Use Lucide icons consistently with `size={14}` or `size={16}` for compact widget ergonomics.

### Backend (Rust / Tauri v2)
- Handle errors gracefully: return `Result<T, String>` from Tauri commands instead of `unwrap()` / `panic!()`.
- Keep asynchronous work on Tokio threads.
- Adhere to Tauri v2 plugin and permission models (configure required plugins in `tauri.conf.json` and `capabilities/`).

### Testing & Verification Requirements
- Every new state mutation or helper function must have corresponding unit tests in Vitest.
- Before concluding any task, verify that:
  1. `npm test` passes with zero errors.
  2. `npm run build` completes cleanly without TypeScript errors.
  3. `cargo check --manifest-path src-tauri/Cargo.toml` compiles cleanly if Rust files were modified.

---

## 7. Known Environment Quirks

- **Linux / WSLg Display Warnings**:
  Warnings like `MESA: error: ZINK: failed to choose pdev` or `Gtk-CRITICAL **: gtk_widget_get_scale_factor` are benign warnings emitted by WebKit2GTK / GTK3 fallback paths in virtualized environments. They do not block execution.
- **Frameless Window Sizing**:
  WidKanban is fixed as a compact widget (`380px x 680px` by default). Do not design wide table layouts; keep all UI vertical-friendly and compact.
