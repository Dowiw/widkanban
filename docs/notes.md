# WidKanban Developer Notes & Troubleshooting

This document contains key implementation details, Linux environment prerequisites, frameless window behavior notes, and diagnostic guidance.

---

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
