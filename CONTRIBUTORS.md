# WidKanban — Contributor Guide & Development Manual

Welcome to **WidKanban**! We are thrilled you are interested in contributing. Whether you are fixing bugs, implementing provider integrations, adding rich task details, or improving desktop ergonomics, this guide provides all the necessary technical context, development workflows, and coding standards.

---

## Table of Contents

- [1. Welcome & Mission](#1-welcome--mission)
- [2. Non-Negotiable Architectural Invariants](#2-non-negotiable-architectural-invariants)
  - [Zero Auth Secrets in Frontend Context](#zero-auth-secrets-in-frontend-context)
  - [Unified Data Normalization (`UnifiedTask`)](#unified-data-normalization-unifiedtask)
  - [Optimistic UI with Background Write-Back](#optimistic-ui-with-background-write-back)
  - [Frameless Desktop Widget UX & Drag Regions](#frameless-desktop-widget-ux--drag-regions)
- [3. Prerequisites & Development Environment Setup](#3-prerequisites--development-environment-setup)
  - [Node.js & Rust Toolchain](#nodejs--rust-toolchain)
  - [Windows: Visual C++ MSVC Linker Setup](#windows-visual-c-msvc-linker-setup)
  - [Linux / WSLg System Dependencies](#linux--wslg-system-dependencies)
- [4. Fast Testing with Ephemeral / Short-Lived Keys](#4-fast-testing-with-ephemeral--short-lived-keys)
  - [Google Tasks: 1-Hour Ephemeral Token (No GCP Project Needed)](#google-tasks-1-hour-ephemeral-token-no-gcp-project-needed)
  - [GitHub: Scoped Test Token on Sandbox Repos](#github-scoped-test-token-on-sandbox-repos)
  - [Cleaning Up Credentials After Testing](#cleaning-up-credentials-after-testing)
- [5. Local Development Workflows & Essential Commands](#5-local-development-workflows--essential-commands)
  - [Development Modes](#development-modes)
  - [Testing Commands](#testing-commands)
  - [Build & Packaging Commands](#build--packaging-commands)
- [6. Codebase Anatomy & Architecture Overview](#6-codebase-anatomy--architecture-overview)
  - [Directory Structure](#directory-structure)
  - [Key Frontend Components](#key-frontend-components)
  - [Native Rust Backend](#native-rust-backend)
- [7. Coding Standards & Conventions](#7-coding-standards--conventions)
  - [Frontend (React 19 & TypeScript)](#frontend-react-19--typescript)
  - [Backend (Rust & Tauri v2)](#backend-rust--tauri-v2)
  - [Git Commit Guidelines & Co-Author Trailers](#git-commit-guidelines--co-author-trailers)
- [8. Pull Request & Verification Checklist](#8-pull-request--verification-checklist)
- [9. Troubleshooting & Environment Quirks](#9-troubleshooting--environment-quirks)
- [10. Related Documentation](#10-related-documentation)

---

## 1. Welcome & Mission

WidKanban is a lightweight, frameless desktop Kanban widget built with [Tauri v2](https://v2.tauri.app/) and [React 19](https://react.dev/). It sits unobtrusively on the desktop layer, aggregating **GitHub Issues/PRs** and **Google Tasks** into a single 3-column board (*To Do*, *In Progress*, *Done*).

Our engineering goals:
1. **Frictionless Ergonomics**: A desktop widget must feel instant, native, and unobtrusive (~30–50 MB RAM, 60fps drag-and-drop).
2. **Defensive Security**: User authentication secrets must remain strictly in native OS storage and never touch browser JavaScript contexts.
3. **Optimistic Responsiveness**: Drag actions update immediately with background write-backs and graceful error recovery.

[↑ Back to Top](#table-of-contents)

---

## 2. Non-Negotiable Architectural Invariants

Whenever submitting a contribution, you **MUST** uphold these architectural rules:

### Zero Auth Secrets in Frontend Context
- GitHub Personal Access Tokens (PATs) and Google OAuth tokens **must never be stored in browser `localStorage`, `sessionStorage`, or frontend state**.
- All secrets are saved natively in the OS app data directory (`credentials.json`) managed exclusively by the Rust core.
- All external API network calls (`api.github.com`, `tasks.googleapis.com`) must be executed in Rust via Tauri IPC commands (`invoke()`), never via frontend `fetch()` to provider endpoints.

### Unified Data Normalization (`UnifiedTask`)
- External provider items must always be normalized into the `UnifiedTask` interface defined in [`src/types/task.ts`](src/types/task.ts).
- Frontend components operate exclusively against `UnifiedTask` models. Provider-specific variations (branch comparisons, diff stats, subtasks, notes) reside inside `sourceMeta`.

### Optimistic UI with Background Write-Back
- Dragging a card between columns mutates the local [Zustand store](src/store/useTaskStore.ts) immediately for 60fps visual responsiveness.
- A background Rust IPC call synchronizes the change with the remote API.
- If the remote call fails, the store reverts the task back to its previous status and informs the user.

### Frameless Desktop Widget UX & Drag Regions
- The window runs with `decorations: false`, transparent backdrop (`widget-glass`), and pins on top (`alwaysOnTop`).
- Draggable regions use the `data-tauri-drag-region` HTML attribute.
- All clickable elements (buttons, inputs, links) located inside a drag region must include `no-drag` or explicitly stop click propagation to avoid window dragging hijacking button clicks.
- Window sizing is compact (`380px x 680px` default). Keep UI elements vertically compact and mobile/widget-friendly.

[↑ Back to Top](#table-of-contents)

---

## 3. Prerequisites & Development Environment Setup

### Node.js & Rust Toolchain
- **Node.js**: >= 18.0.0
- **Rust Toolchain**: Stable Rust (Rust 2021 edition) with `rustc` and `cargo` installed via [rustup.rs](https://rustup.rs/).

### Windows: Visual C++ MSVC Linker Setup
WidKanban's native core uses `reqwest` and `tokio`, requiring the **MSVC C++ linker (`link.exe`)** on Windows (`x86_64-pc-windows-msvc`).

If you encounter `error: linker 'link.exe' not found`:
```powershell
# Install Visual C++ Build Tools via winget:
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
*Alternatively, open Visual Studio Installer and select **"Desktop development with C++"**.*  
See [Developer Notes: Windows MSVC Linker Guide](docs/notes.md#5-windows-msvc-linker-required-for-reqwest--tokio) for detailed instructions.

### Linux / WSLg System Dependencies
When developing on Ubuntu, Debian, or WSL2 with WSLg, install GTK3, WebKit2GTK, and libayatana:
```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libgdk-pixbuf2.0-dev \
  libwebkit2gtk-4.1-dev \
  libsoup-3.0-dev \
  libayatana-appindicator3-1 \
  libayatana-appindicator3-dev
```
See [Developer Notes: Linux Prerequisites](docs/notes.md#1-linux-environment-prerequisites) for troubleshooting display warnings.

[↑ Back to Top](#table-of-contents)

---

## 4. Fast Testing with Ephemeral / Short-Lived Keys

As a contributor, **you do not need to register a Google Cloud project or use personal production credentials** to test live API integrations.

### Google Tasks: 1-Hour Ephemeral Token (No GCP Project Needed)
1. Navigate to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Under **Step 1**, scroll down to **Tasks API v1** and check `https://www.googleapis.com/auth/tasks`.
3. Click **Authorize APIs** and authenticate with any test Google account.
4. Under **Step 2**, click **Exchange authorization code for tokens**.
5. Copy the generated **Access token** (starts with `ya29....`).
6. Paste it into the WidKanban Settings modal (`⚙`).
7. The token automatically expires after 60 minutes, ensuring zero residual credentials remain on your machine.

### GitHub: Scoped Test Token on Sandbox Repos
1. Go to [GitHub Developer Settings → Fine-grained tokens](https://github.com/settings/tokens?type=beta).
2. Set token expiration to **7 days**.
3. Under **Repository access**, restrict access to only a sandbox or personal test repository.
4. Set permissions:
   - **Issues**: `Read and write`
   - **Pull requests**: `Read-only`
   - **Metadata**: `Read-only`
   - **Administration** *(optional)*: `Read and write` (only if testing permanent hard-delete GraphQL mutations).
5. Copy the `github_pat_...` string and paste it into Settings.

### Cleaning Up Credentials After Testing
In the widget header, click **Settings (⚙)** and click **"Disconnect"** on the provider. This immediately purges the tokens from your local `credentials.json` file.

See the complete [Credentials Setup Guide](docs/credentials-setup.md) for further details.

[↑ Back to Top](#table-of-contents)

---

## 5. Local Development Workflows & Essential Commands

Always run these commands from the repository root:

### Development Modes

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite browser dev server on `http://localhost:1420` (fast frontend UI preview with mock tasks fallback). |
| `npm run tauri dev` | Boots the full native desktop widget with Rust backend and system tray enabled. |

### Testing Commands

| Command | Description |
| :--- | :--- |
| `npm test` | Runs the Vitest test suite in watch mode. |
| `npm test -- --run` | Runs all Vitest unit tests once (CI mode). |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Runs all native Rust backend unit tests. |

### Build & Packaging Commands

| Command | Description |
| :--- | :--- |
| `npm run build` | Runs TypeScript typechecker (`tsc`) and bundles frontend production assets. |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Verifies Rust compilation without producing binaries. |
| `npm run build:bin` | Compiles native release executable and packages OS installers into `./bin/`. |

[↑ Back to Top](#table-of-contents)

---

## 6. Codebase Anatomy & Architecture Overview

### Directory Structure

```text
widkanban/
├── src/                         # React 19 Frontend
│   ├── components/              # UI Components
│   │   ├── KanbanBoard.tsx      # @dnd-kit drag context, sensors, and column layout
│   │   ├── Column.tsx           # Droppable column container with task count
│   │   ├── TaskCard.tsx         # Draggable task card with provider badges & branch info
│   │   ├── Header.tsx           # Search bar, filters, trash dropdown, settings trigger
│   │   ├── AddTaskModal.tsx     # Quick local task creation modal
│   │   ├── SettingsModal.tsx    # Credential management & label setup trigger
│   │   ├── DeleteTaskModal.tsx  # Remote close vs. local trash selection modal
│   │   ├── LocallyDeletedDropdown.tsx # Header dropdown for inspecting/restoring local trash
│   │   └── GithubSetupModal.tsx # Onboarding prompt for repo issue labels
│   ├── mock/
│   │   └── mockTasks.ts         # Development mock tasks
│   ├── store/
│   │   ├── useTaskStore.ts      # Main Zustand store with optimistic actions & IPC
│   │   └── useTaskStore.test.ts # Vitest test suite for store operations
│   ├── types/
│   │   └── task.ts              # UnifiedTask, TaskSource, TaskStatus, and metadata types
│   ├── App.tsx                  # Widget root frame, modals, and tray event listeners
│   └── index.css                # Tailwind entry & custom glassmorphism styles
├── src-tauri/                   # Tauri v2 (Rust Core)
│   ├── src/
│   │   ├── lib.rs               # IPC command handlers, API clients, credential store, and tray
│   │   └── main.rs              # Application entrypoint
│   ├── capabilities/
│   │   └── default.json         # Tauri v2 window and shell permissions
│   ├── Cargo.toml               # Rust dependencies (reqwest, tokio, serde, tauri)
│   └── tauri.conf.json          # Window configuration (frameless, dimensions, permissions)
├── docs/                        # Deep-dive documentation
│   ├── architecture.md          # Architecture, schemas, security model
│   ├── credentials-setup.md     # Detailed PAT & OAuth instructions
│   ├── notes.md                 # Linux GTK/WebKit troubleshooting & MSVC notes
│   └── todos.md                 # Project milestones & roadmap checklist
├── bin/                         # Packaged native binaries (.msi, .deb, .AppImage)
├── README.md                    # Project overview & quick start
└── CONTRIBUTORS.md              # This guide
```

### Key Frontend Components
- **`src/store/useTaskStore.ts`**: Central state engine. Handles optimistic drag mutations, filter states, local trash tracking, and Tauri IPC invocations (`safeInvoke`, `safeInvokeWithResult`).
- **`src/types/task.ts`**: Source of truth for data schemas. Every task adheres to `UnifiedTask`.
- **`src/components/TaskCard.tsx`**: Renders task cards with visual indicators for GitHub PRs (head/base branches, draft tags, diff stats, author/assignee avatars) and Google Tasks (list badges, subtask indicators, due dates).

### Native Rust Backend
- **`src-tauri/src/lib.rs`**: Implements all IPC commands:
  - `save_credentials`, `get_auth_status`, `clear_credentials`
  - `fetch_github_tasks`, `setup_repo_labels`, `update_github_issue_labels`
  - `close_github_issue`, `delete_github_issue_permanently`
  - `fetch_google_tasks`, `update_google_task`
  - `toggle_always_on_top`, `show_window`, `hide_window`

[↑ Back to Top](#table-of-contents)

---

## 7. Coding Standards & Conventions

### Frontend (React 19 & TypeScript)
- **Functional Components**: Use arrow or standard function components with explicit TypeScript interfaces (`interface ComponentProps { ... }`).
- **Tailwind Utility Classes**: Use Tailwind utility classes for styling. Avoid arbitrary inline styles. Glassmorphism utilities (`bg-white/70`, `backdrop-blur-md`, `border-slate-200/80`) should be used consistently.
- **Lucide Icons**: Use icons with compact ergonomics: `size={14}` or `size={16}` for headers, badges, and action buttons.
- **State Separation**: Business logic and state mutations belong in [`src/store/useTaskStore.ts`](src/store/useTaskStore.ts). UI components should remain presentational and consume hooks.

### Backend (Rust & Tauri v2)
- **Error Handling**: Commands must return `Result<T, String>` instead of using `.unwrap()` or `.expect()` in runtime IPC paths.
- **Async Runtime**: Network operations must run asynchronously using `tokio` and `reqwest`.
- **Permissions**: Tauri v2 requires explicit capabilities. If introducing new window or plugin features, update [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json).

### Git Commit Guidelines & Co-Author Trailers
We adhere to conventional commit messages:
```text
feat: add Google Tasks subtask collapse toggle
fix: prevent window drag event on header dropdown click
docs: update architecture schema for PR branch details
test: add test coverage for local trash restoration
```

If collaborating with AI pair programmers, include standard co-author trailers in your commit message:
```text
Co-authored-by: Claude <claude@anthropic.com>
Co-authored-by: Antigravity <antigravity-bot@users.noreply.github.com>
```

[↑ Back to Top](#table-of-contents)

---

## 8. Pull Request & Verification Checklist

Before opening a pull request, run this verification checklist locally:

- [ ] **Unit Tests**: `npm test -- --run` passes with zero failures.
- [ ] **TypeScript Build**: `npm run build` completes cleanly with no TypeScript compiler errors.
- [ ] **Rust Verification** *(if editing `src-tauri`)*:
  - `cargo check --manifest-path src-tauri/Cargo.toml` compiles with zero warnings/errors.
  - `cargo test --manifest-path src-tauri/Cargo.toml` passes all unit tests.
- [ ] **Zero Frontend Secrets**: Verify no API tokens, PATs, or client secrets are committed or stored in frontend `localStorage`.
- [ ] **Frameless Ergonomics**: Ensure all clickable elements located in drag regions include `no-drag` or stop event propagation.
- [ ] **Documentation**: If adding features or changing schemas, update relevant docs in `docs/` and link them in `README.md`.

[↑ Back to Top](#table-of-contents)

---

## 9. Troubleshooting & Environment Quirks

### Linux / WSLg Display Warnings
When running on Linux or WSLg, you may see:
```text
MESA: error: ZINK: failed to choose pdev
Gtk-CRITICAL **: gtk_widget_get_scale_factor assertion failed
```
- **Cause**: Mesa hardware OpenGL probing and GTK DPI querying before the window is mapped.
- **Resolution**: Harmless. WebKit automatically falls back to software rendering (LLVMpipe). Does not block execution.

### Windows Linker Error
```text
error: linker `link.exe` not found
```
- **Resolution**: Install the MSVC build tools via winget or Visual Studio Installer as shown in [Prerequisites](#windows-visual-c-msvc-linker-setup).

### Click Events Not Registering in Header
- **Cause**: An interactive element (button or link) is nested inside a container with `data-tauri-drag-region`.
- **Resolution**: Add the `no-drag` class to the interactive element or add `onClick={(e) => e.stopPropagation()}`.

[↑ Back to Top](#table-of-contents)

---

## 10. Related Documentation

- [Project README](README.md): High-level overview, key features, and quick start.
- [Credentials Setup Guide](docs/credentials-setup.md): Complete guide for generating and managing API tokens.
- [Architecture & System Design](docs/architecture.md): Deep-dive into IPC bridge, data schemas, and security model.
- [Developer Notes](docs/notes.md): Environment dependencies, GTK notes, and compiler fixes.
- [Roadmap & TODOs](docs/todos.md): Milestone checklist and phase status.

---

*Thank you for contributing to WidKanban! Let's build the cleanest desktop kanban experience together.*
