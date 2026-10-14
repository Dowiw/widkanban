# WidKanban — Credentials Setup Guide

This guide explains exactly what credentials WidKanban needs, why they are required, and how to obtain them for each provider.

> [!NOTE]
> WidKanban **never** stores tokens in your browser or frontend state. All credentials are saved in a local `credentials.json` file inside the app's data directory, with `600` (owner-read-only) file permissions on Unix/macOS. They are never transmitted anywhere except directly to the respective provider's API.

---

## Summary of Required Credentials

| Provider | Credential Type | Required For |
|---|---|---|
| **GitHub** | Personal Access Token (PAT) — classic or fine-grained | Fetching assigned issues & PRs, updating status via labels, closing issues |
| **Google Tasks** | Google API OAuth 2.0 token *(Phase 3, not yet implemented)* | Fetching task lists, syncing task completion status |

---

## 1. GitHub — Personal Access Token (PAT)

WidKanban uses a GitHub **Personal Access Token** to authenticate with the GitHub REST API on your behalf. You create this token once in your GitHub account settings and paste it into the WidKanban settings modal.

### Required Scopes

You only need to grant the minimum scopes necessary:

| Scope | Why it's needed |
|---|---|
| `repo` | Read issues/PRs from **private** repositories you own or are a member of |
| `public_repo` | Read issues/PRs from **public** repositories (subset of `repo`) |
| `read:user` | Identify which issues/PRs are assigned to you (`GET /user/issues`) |

> [!TIP]
> If you only work with public repositories, you can select only `public_repo` and `read:user` to minimise the token's blast radius.

### How to Create a Classic PAT

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
   - Direct URL: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**.
3. Give it a descriptive **Note** (e.g., `WidKanban desktop widget`).
4. Set an **Expiration** — recommended 90 days, or "No expiration" if you prefer not to rotate it.
5. Under **Select scopes**, tick:
   - `repo` (or just `public_repo` if you only use public repos)
   - `read:user`
6. Click **"Generate token"** at the bottom of the page.
7. **Copy the token immediately** — GitHub will only show it once. It looks like `ghp_xxxxxxxxxxxxxxxxxxxx`.

### How to Create a Fine-Grained PAT (recommended)

Fine-grained PATs give you repository-level control and are more secure:

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   - Direct URL: https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**.
3. Set a **Token name** (e.g., `WidKanban`), **Expiration**, and **Resource owner** (your account or an org).
4. Under **Repository access**, choose "All repositories" or select specific ones.
5. Under **Permissions → Repository permissions**, set:
   - **Issues**: `Read and write` (needed to apply labels and close issues)
   - **Pull requests**: `Read-only`
   - **Metadata**: `Read-only` (auto-selected)
6. Under **Permissions → Account permissions**, set:
   - **User email addresses**: not needed — leave as `No access`
7. Click **"Generate token"** and copy the result. Fine-grained tokens look like `github_pat_xxxxxxxxxxxx`.

### Entering the Token in WidKanban

1. Open WidKanban.
2. Click the **Settings (⚙)** icon in the header.
3. Paste your token into the **GitHub Personal Access Token** field.
4. Click **Save**. WidKanban will verify the token and begin syncing your assigned issues.

---

## 2. Google Tasks — OAuth 2.0 (Coming in Phase 3)

> [!IMPORTANT]
> Google Tasks integration is **not yet available**. It is planned for Phase 3 of the roadmap. The instructions below describe what will be required when it ships.

Google Tasks uses **OAuth 2.0** instead of a simple static token. WidKanban will handle the full OAuth flow natively in the Rust backend — you won't need to manually copy any token.

### What you will need to do (when Phase 3 ships)

You have two options depending on your use case:

#### Option A — Use the built-in WidKanban OAuth client *(easiest)*
WidKanban will ship with a pre-registered OAuth 2.0 client ID. You simply:
1. Click **"Connect Google Tasks"** in the Settings modal.
2. A browser window will open asking you to sign in and grant access to your Google Tasks.
3. After authorisation, Google redirects back to WidKanban automatically.

#### Option B — Bring your own Google Cloud project *(advanced / self-hosted)*
If you want full control over the OAuth client (e.g., for a self-hosted build):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. In the left menu go to **APIs & Services → Library** and enable the **"Tasks API"**.
4. Go to **APIs & Services → Credentials** and click **"Create Credentials → OAuth 2.0 Client ID"**.
5. Set Application type to **"Desktop app"**.
6. Give it a name (e.g., `WidKanban`) and click **Create**.
7. Download the `client_secret_*.json` file.
8. Place it in the WidKanban config directory and set the path in settings.

### Required OAuth Scopes (Google)

| Scope | Why it's needed |
|---|---|
| `https://www.googleapis.com/auth/tasks` | Read and update your Google Tasks (including marking tasks complete) |

---

## Where Credentials Are Stored

WidKanban stores credentials locally in a JSON file:

| Platform | Path |
|---|---|
| **Windows** | `%APPDATA%\com.widkanban.app\credentials.json` |
| **macOS** | `~/Library/Application Support/com.widkanban.app/credentials.json` |
| **Linux** | `~/.local/share/com.widkanban.app/credentials.json` |

On Unix/macOS the file permissions are set to `600` (only your user account can read it). You can delete this file at any time to revoke all stored credentials — WidKanban will fall back to the mock task dataset on next launch.

---

## Revoking Credentials

### GitHub
- In WidKanban Settings, click **"Disconnect GitHub"** to clear the stored token.
- You should also delete the PAT from GitHub at https://github.com/settings/tokens to fully revoke API access.

### Google Tasks *(Phase 3)*
- In WidKanban Settings, click **"Disconnect Google Tasks"**.
- To fully revoke, visit https://myaccount.google.com/permissions and remove WidKanban from the list of connected apps.
