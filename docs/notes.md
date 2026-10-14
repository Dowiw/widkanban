# WidKanban Developer Notes & Troubleshooting

This document contains key implementation details, Linux environment prerequisites, frameless window behavior notes, and diagnostic guidance.

---

## Table of Contents

- [1. Linux Environment Prerequisites](#1-linux-environment-prerequisites)
- [2. Frameless Window & Drag Region Behavior](#2-frameless-window--drag-region-behavior)
  - [Transparent & Frameless Setup](#transparent--frameless-setup-tauriconfjson)
  - [Dragging the Window](#dragging-the-window)
- [3. Understanding Common Console Warnings](#3-understanding-common-console-warnings)
  - [libEGL Warning / MESA LLVMpipe Fallback](#libegl-warning--mesa-error-zink-failed-to-choose-pdev)
  - [GTK Scale Factor Debug Log](#gtk-critical--gtk_widget_get_scale_factor-assertion-failed)
- [4. Performance & Memory Profile](#4-performance--memory-profile)
- [5. Windows: MSVC Linker Required for reqwest + tokio](#5-windows-msvc-linker-required-for-reqwest--tokio)
- [Related Documentation](#related-documentation)

---

<a id="1-linux-environment-prerequisites"></a>
## 1. Linux Environment Prerequisites

When building or running WidKanban on Linux (Ubuntu, Debian, or WSL2 with WSLg), the following system packages must be installed for GTK3, WebKit2GTK, and system tray support:

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

---

## 2. Frameless Window & Drag Region Behavior

### Transparent & Frameless Setup (`tauri.conf.json`)
```json
{
  "app": {
    "windows": [
      {
        "title": "WidKanban",
        "width": 380,
        "height": 680,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "shadow": false,
        "skipTaskbar": true
      }
    ]
  }
}
```

### Dragging the Window
- In frameless mode, window dragging is enabled on HTML elements by adding the attribute:
  ```html
  <div data-tauri-drag-region class="cursor-grab font-bold">
    WidKanban Drag Bar
  </div>
  ```
- Any interactive child element inside the drag bar (buttons, inputs) must include the `no-drag` CSS utility class or `stopPropagation()` handler to prevent dragging when clicked.

---

## 3. Understanding Common Console Warnings

### `libEGL warning` / `MESA: error: ZINK: failed to choose pdev`
- **Cause**: On WSL/virtualized display environments, Mesa checks for hardware OpenGL extensions.
- **Resolution**: Harmless. WebKit automatically falls back to software rendering (LLVMpipe).
- **Suppression (Optional)**: Set `WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev`.

### `Gtk-CRITICAL **: gtk_widget_get_scale_factor assertion failed`
- **Cause**: In frameless mode, GTK queries display DPI scale factors before the window is fully mapped on screen.
- **Resolution**: Harmless debug log emitted by GTK internal initialization routines.

---

## 4. Performance & Memory Profile

- **RAM Footprint**: ~30 MB to 50 MB RAM in idle desktop widget state.
- **CPU Footprint**: ~0% CPU at idle; active only during drag interaction or 3-minute background poll.

---

<a id="5-windows-msvc-linker-required-for-reqwest--tokio"></a>
<a id="windows-msvc-linker"></a>
## 5. Windows: MSVC Linker Required for `reqwest` + `tokio`

Following the Google Tasks integration, `Cargo.toml` now depends on `reqwest` and `tokio`. These crates include build scripts that require the **MSVC C++ linker (`link.exe`)** to compile on Windows (`x86_64-pc-windows-msvc` toolchain).

**Symptom:**
```
error: linker `link.exe` not found
note: please ensure that Visual Studio 2017 or later, or Build Tools for Visual Studio were installed with the Visual C++ option
```

**Fix — Install Visual C++ Build Tools:**

Option A — via Visual Studio Installer (if VS is already installed):
1. Open **Visual Studio Installer**.
2. Click **Modify** on your VS 2022 installation.
3. Under **Workloads**, select **"Desktop development with C++"**.
4. Click **Modify** to install.

Option B — Standalone Build Tools (no full VS needed):
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

After installation, open a new terminal so `link.exe` is on `PATH`, then re-run:
```powershell
cargo check --manifest-path src-tauri/Cargo.toml
```

---

## Related Documentation

- [Project README](../README.md): High-level overview, key features, and quick start.
- [Contributor Guide & Manual](../CONTRIBUTORS.md): Development setup, testing with ephemeral keys, and PR checklist.
- [Credentials Setup Guide](credentials-setup.md): Guide for GitHub PAT and Google Tasks OAuth configuration.
- [Architecture & System Design](architecture.md): Security model, data schemas, and Tauri IPC bridge.
- [Roadmap & Feature Checklist](todos.md): Feature checklist and development roadmap.

