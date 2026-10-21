# WidKanban — Credentials Reference & Storage Model

This document outlines the credential architecture, local storage paths, security invariants, and developer `.env` workflows for WidKanban.

> [!NOTE]
> WidKanban **never** stores secrets in browser `localStorage`, `sessionStorage`, or frontend state. All tokens reside strictly in the native Rust backend and are persisted locally in `credentials.json` with restricted file permissions (`600`).

---

## Dedicated Provider Setup Guides

For complete, visual step-by-step setup instructions with screenshot walkthroughs:

| Provider | Guide | Highlights |
| :--- | :--- | :--- |
| **GitHub** | **[GitHub Setup Guide](github-setup.md)** | Generating classic & fine-grained PATs, scope selection (`repo`, `read:user`), and rate limit monitoring. |
| **Google Tasks** | **[Google Tasks Setup Guide](google-setup.md)** | Google Cloud project setup, Test Users configuration, Desktop OAuth credentials, and 1-click **Sign in with Google** with silent auto-refresh. |

---

## Summary of Required Credentials

| Provider | Credential Type | Lifespan / Mode | Required For |
|---|---|---|---|
| **GitHub** | Personal Access Token (PAT) | 7–90 days (configurable) | Fetching assigned issues & PRs, updating status via labels, closing issues |
| **Google Tasks** | OAuth 2.0 Client & Refresh Token | Long-lived / silent auto-refresh | Fetching task lists, items, and syncing task completion status |
| **Google Tasks (Fallback)** | OAuth 2.0 Access Token (`ya29.…`) | 1 hour (ephemeral) | Quick manual testing via OAuth Playground without Cloud Console setup |

---

## Developer Quick-Start: Fast Testing via `.env`

If you are a contributor developing or testing locally (`npm run tauri dev`), you do not need to enter credentials in the UI on every launch:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your developer test tokens:
   ```env
   # GitHub Personal Access Token
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

   # Google Tasks OAuth Desktop App Client
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

   # Or temporary 1-hour access token from OAuth Playground
   GOOGLE_TASKS_TOKEN=ya29.a0A...
   ```
3. Rust loads these automatically on startup via `dotenvy`. In `SettingsModal`, the badge `.env (Dev Mode)` will confirm active environment credentials.
4. Environment tokens remain purely in-memory in the Rust process and are never written to `credentials.json` or committed to git.

---

## Credential Hierarchy & Precedence

To maintain predictable behavior and avoid confusing badge states, WidKanban enforces a strict 3-tier hierarchy:

1. **Tier 1: Native In-App Credentials (`credentials.json`) — Highest Precedence**
   - Whenever you enter a token in the app settings or complete **Sign in with Google**, your credentials are saved locally in `credentials.json`.
   - **Active credentials in `credentials.json` always override any `.env` entries.**
   - The `.env (Dev Mode)` and `.env` badges are **automatically removed** from the UI once credentials are saved in the app, giving you clear visual confirmation that your own stored keys are in active use.

2. **Tier 2: Explicit Disconnection Guard**
   - Clicking the **Trash (Disconnect) icon** in Settings marks the provider as explicitly disconnected.
   - WidKanban will **not** fall back to `.env` variables after an explicit disconnect, respecting your decision until you re-authenticate or enter a new token in the app.

3. **Tier 3: Developer Environment Variables (`.env`) — Initial Fallback Only**
   - Used **only** when no active token exists in `credentials.json` and the provider has not been disconnected.
   - When active, the purple `.env (Dev Mode)` badge is displayed in Settings.

---

## Where Credentials Are Stored

When credentials are saved via the in-app settings UI or captured through the Google OAuth loopback flow, WidKanban saves them in the local native OS app data directory:

| Platform | Path | Permissions |
|---|---|---|
| **Windows** | `%APPDATA%\com.widkanban.desktop\credentials.json` | Protected by Windows user profile ACL |
| **macOS** | `~/Library/Application Support/com.widkanban.desktop/credentials.json` | `600` (Owner read/write only) |
| **Linux** | `~/.local/share/com.widkanban.desktop/credentials.json` | `600` (Owner read/write only) |

---

## Security Model & Invariants

1. **Native Rust Isolation**:
   All HTTP requests to GitHub and Google are executed exclusively by the Rust backend using `reqwest` with native TLS. The frontend webview never has direct access to API tokens.
2. **Zero Auth Secrets in Frontend State**:
   Tokens are never returned in full to the webview. The `get_auth_status` command only returns boolean presence flags (`has_github: true`, `has_google: true`, `google_has_refresh_token: true`).
3. **Restricted File Permissions**:
   On Unix systems, permissions are explicitly enforced using `chmod 600`.
4. **Git Isolation**:
   All token files (`credentials.json`, `client_secret*.json`, `.env`, `.env.*`) are strictly ignored in [`.gitignore`](../.gitignore).

---

## Revoking Credentials

### GitHub
- In WidKanban Settings, click the **Trash icon** next to GitHub to delete the token from local storage.
- To revoke the token entirely on GitHub's servers, delete it from [GitHub Personal Access Tokens](https://github.com/settings/tokens).

### Google Tasks
- In WidKanban Settings, click the **Trash icon** next to Google Tasks.
- To revoke WidKanban's OAuth grant entirely, visit [Google Account Permissions](https://myaccount.google.com/permissions) and remove WidKanban.

---

## Related Documentation

- 🐙 **[GitHub Setup Guide](github-setup.md)**: Visual screenshot walkthrough for GitHub PAT generation.
- 🔵 **[Google Tasks Setup Guide](google-setup.md)**: Visual screenshot walkthrough for Google Cloud OAuth loopback setup.
- 🤝 **[Contributor Guide](../CONTRIBUTORS.md)**: Development workflows, testing guidelines, and PR checklists.
- 🏛️ **[Architecture & System Design](architecture.md)**: Security architecture and Tauri IPC bridge.
- 🛠️ **[Developer Notes](notes.md)**: Environment setup, frameless window behavior, and MSVC notes.
