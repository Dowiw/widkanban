# WidKanban

A lightweight, unobtrusive, frameless desktop Kanban widget built with **Tauri v2 (Rust)** and **React 19 + Vite + Tailwind CSS + Zustand + @dnd-kit**.

WidKanban aggregates both **GitHub Issues/PRs** and **Google Tasks** into a single, unified 3-column Kanban view (*To Do*, *In Progress*, *Done*) sitting directly on your desktop layer.

So, if you ever want to look at your unified kanban, do it widkanban!

---

## Key Features

- **Desktop Widget Design**: Frameless window (`decorations: false`), transparent backdrop, floating pin mode (`alwaysOnTop`), and hidden from taskbar.
- **System Tray Controls**: Quick access via native tray icon (**Show/Hide Widget**, **Toggle Always on Top**, **Quit**).
- **Unified Provider Aggregator**: Unified view combining assigned GitHub Issues and Google Tasks.
- **Drag-and-Drop Kanban**: Smooth, accessible drag-and-drop powered by `@dnd-kit` with instant optimistic UI updates.
- **Secure Architecture**: OAuth tokens & PATs stored natively in Rust OS Keychain/Store layer—never exposed to frontend JS.
- **Ultra Lightweight**: Low memory footprint (~30–50 MB RAM) powered by Tauri v2.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Desktop Framework** | [Tauri v2](https://v2.tauri.app/) (Rust) |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`) |
| **Styling** | Tailwind CSS + Lucide Icons + Glassmorphism |

---

## Quick Start & Local Development

### Prerequisites

#### Node.js & Rust
- Node.js >= 18
- Rust toolchain (`cargo`, `rustc`)

#### Linux System Dependencies (Ubuntu / Debian / WSL)
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

### Installation

1. Clone the repository and install npm packages:
   ```bash
   git clone https://github.com/org/widkanban.git
   cd widkanban
   npm install
   ```

2. Run in browser preview mode (Vite):
   ```bash
   npm run dev
   # Opens http://localhost:1420
   ```

3. Run in native desktop widget mode (Tauri v2):
   ```bash
   npm run tauri dev
   ```

---

## Documentation

Comprehensive project documentation is available in the [`docs/`](./docs/) directory:

- [Architecture Specification](./docs/architecture.md): Data schema, security model, and Rust IPC bridge.
- [Developer Notes](./docs/notes.md): System dependencies, frameless window behavior, and troubleshooting.
- [Roadmap & TODOs](./docs/todos.md): Milestone progress and feature breakdown for upcoming phases.
