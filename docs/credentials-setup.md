# WidKanban — Credentials Setup Guide

This guide explains exactly what credentials WidKanban needs, why they are required, and how to obtain them for each provider.

> [!NOTE]
> WidKanban **never** stores tokens in your browser or frontend state. All credentials are saved in a local `credentials.json` file inside the app's data directory, with `600` (owner-read-only) file permissions on Unix/macOS. They are never transmitted anywhere except directly to the respective provider's API.

---

## Table of Contents

- [Summary of Required Credentials](#summary-of-required-credentials)
- [Contributor Quick-Start: Fast Testing with Short-Lived Keys](#contributor-quick-start-fast-testing-with-short-lived-keys)
  - [1. Google Tasks (1-hour Ephemeral Token)](#1-google-tasks-1-hour-ephemeral-token--no-cloud-setup-required)
  - [2. GitHub (Short-Lived & Scoped Test Token)](#2-github-short-lived--scoped-test-token)
  - [3. Cleaning Up After Testing](#3-cleaning-up-after-testing)
- [1. GitHub — Personal Access Token (PAT)](#1-github--personal-access-token-pat)
  - [Required Scopes](#required-scopes)
  - [How to Create a Classic PAT](#how-to-create-a-classic-pat)
  - [How to Create a Fine-Grained PAT (Recommended)](#how-to-create-a-fine-grained-pat-recommended)
  - [Entering the GitHub Token in WidKanban](#entering-the-github-token-in-widkanban)
- [2. Google Tasks — OAuth 2.0 Access Token](#2-google-tasks--oauth-20-access-token)
  - [Required OAuth Scope](#required-oauth-scope)
  - [Option A — Google OAuth Playground (Recommended for Contributors)](#option-a--google-oauth-playground-recommended-for-contributors--testing)
  - [Option B — Register Your Own Google Cloud OAuth Client](#option-b--register-your-own-google-cloud-oauth-client-for-production--long-term-use)
  - [Entering the Google Tasks Token in WidKanban](#entering-the-google-tasks-token-in-widkanban)
- [Where Credentials Are Stored](#where-credentials-are-stored)
- [Revoking Credentials](#revoking-credentials)
- [Related Documentation](#related-documentation)

---

## Summary of Required Credentials

| Provider | Credential Type | Lifespan / Mode | Required For |
|---|---|---|---|
| **GitHub** | Personal Access Token (PAT) | 7–90 days (configurable) | Fetching assigned issues & PRs, updating status via labels, closing issues |
| **Google Tasks** | OAuth 2.0 Access Token (`ya29.…`) | 1 hour (ephemeral) or refreshed | Fetching task lists and items, syncing task completion status |

---

<a id="contributor-quick-start"></a>
<a id="contributor-quick-start-fast-testing-with-short-lived-keys"></a>
## Contributor Quick-Start: Fast Testing with Short-Lived Keys

If you are a **contributor or developer** testing features, bug fixes, or PRs, **you do not need to set up a production Google Cloud project or create permanent credentials**:

### 1. Google Tasks (1-hour Ephemeral Token — No Cloud Setup Required)
- You can obtain a working token in under 60 seconds without creating any Google Cloud Console projects, OAuth consent screens, or client IDs.
- Follow **[Option A: Google OAuth Playground](#option-a--google-oauth-playground-recommended-for-contributors--testing)** below.
- This produces a temporary access token (`ya29.…`) that **automatically expires after 1 hour**.
- It is ideal for local testing, debugging sync logic, and running manual acceptance tests without leaving long-lived credentials on your development machine.

### 2. GitHub (Short-Lived & Scoped Test Token)
- For testing GitHub integration, generate a fine-grained PAT with a **7-day expiration** and access restricted only to a test/sandbox repository.
- Follow **[Fine-Grained PAT instructions](#how-to-create-a-fine-grained-pat-recommended)** below.

### 3. Cleaning Up After Testing
- In the widget header, click **Settings (⚙)** and click **"Disconnect"** on the provider.
- This immediately deletes the token from your local `credentials.json` file.

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
   - **Issues**: `Read and write` (needed to apply labels, comment, and close issues)
   - **Pull requests**: `Read-only`
   - **Metadata**: `Read-only` (auto-selected)
   - **Administration** *(optional)*: `Read and write` (only required if you want the ability to permanently hard-delete issues via GraphQL; closing as "not planned" only needs Issues `Read and write`)
6. Under **Permissions → Account permissions**, set:
   - **User email addresses**: not needed — leave as `No access`
7. Click **"Generate token"** and copy the result. Fine-grained tokens look like `github_pat_xxxxxxxxxxxx`.

### Entering the GitHub Token in WidKanban

1. Open WidKanban.
2. Click the **Settings (⚙)** icon in the header.
3. Paste your token into the **GitHub Personal Access Token** field.
4. Click **Save**. WidKanban will verify the token and begin syncing your assigned issues.

---

## 2. Google Tasks — OAuth 2.0 Access Token

WidKanban connects to the Google Tasks REST API using an **OAuth 2.0 access token** (a short-lived credential that looks like `ya29.a0A…`). You generate this token once using the Google OAuth Playground and paste it into the WidKanban Settings modal.

> [!NOTE]
> Access tokens from the OAuth Playground expire after **1 hour** by default. For a long-lived setup, tick **"Auto-refresh the token before it expires"** in the OAuth Playground settings, or use a proper OAuth client registered in Google Cloud Console (see Option B below).

### Required OAuth Scope

| Scope | Why it's needed |
|---|---|
| `https://www.googleapis.com/auth/tasks` | Full read/write access to your Google Tasks (required to mark tasks complete and update status) |

### Option A — Google OAuth Playground *(Recommended for Contributors & Testing)*

1. Open the [Google OAuth Playground](https://developers.google.com/oauthplayground).
2. In the **Step 1** panel on the left, find **"Tasks API v1"** and select:
   - `https://www.googleapis.com/auth/tasks`
3. Click **"Authorize APIs"** — a Google sign-in popup will appear.
4. Sign in with the Google account whose tasks you want to sync and grant access.
5. You will be returned to the Playground at **Step 2**. Click **"Exchange authorization code for tokens"**.
6. In the **Step 2** response panel you will see the **Access token** field. It starts with `ya29.`. Copy it.
7. Paste it into the **Google Tasks OAuth Token** field in WidKanban Settings and click **Save**.

> [!TIP]
> To get a longer-lived token, click the ⚙ gear icon in the OAuth Playground, tick **"Use your own OAuth credentials"**, enter your Google Cloud OAuth client ID and secret (see Option B), and tick **"Auto-refresh the token before it expires"**.

### Option B — Register your own Google Cloud OAuth client *(for production / long-term use)*

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library** and enable the **"Tasks API"**.
4. Navigate to **APIs & Services → OAuth consent screen**:
   - Set User Type to **External** (for personal accounts) or **Internal** (for Workspace org).
   - Add your Google account as a test user if your app is still in "Testing" publishing status.
5. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Desktop app**
   - Name: `WidKanban`
6. Copy the **Client ID** and **Client Secret**.
7. Use these in the OAuth Playground (⚙ → "Use your own OAuth credentials") as described in Option A to generate a token with auto-refresh.

### Entering the Google Tasks Token in WidKanban

1. Open WidKanban.
2. Click the **Settings (⚙)** icon in the header.
3. Paste your `ya29.…` token into the **Google Tasks OAuth Token** field.
4. Click **Save**. WidKanban will immediately fetch your tasks across all task lists.
5. Use the **↻ sync button** next to "Connected" to refresh tasks manually at any time.

---

## Where Credentials Are Stored

WidKanban stores credentials locally in a JSON file:

| Platform | Path |
|---|---|
| **Windows** | `%APPDATA%\com.widkanban.desktop\credentials.json` |
| **macOS** | `~/Library/Application Support/com.widkanban.desktop/credentials.json` |
| **Linux** | `~/.local/share/com.widkanban.desktop/credentials.json` |

On Unix/macOS the file permissions are set to `600` (only your user account can read it). You can delete this file at any time to revoke all stored credentials — WidKanban will fall back to the mock task dataset on next launch.

---

## Revoking Credentials

### GitHub
- In WidKanban Settings, click **"Disconnect GitHub"** to clear the stored token.
- You should also delete the PAT from GitHub at https://github.com/settings/tokens to fully revoke API access.

### Google Tasks
- In WidKanban Settings, click **"Disconnect Google Tasks"**.
- To fully revoke, visit https://myaccount.google.com/permissions and remove WidKanban from the list of connected apps.

---

## Related Documentation

- [Project README](../README.md): High-level overview, key features, and quick start.
- [Contributor Guide & Manual](../CONTRIBUTORS.md): Development setup, testing with ephemeral keys, and PR checklist.
- [Architecture & System Design](architecture.md): Security model, data schemas, and Tauri IPC bridge.
- [Developer Notes](notes.md): Environment dependencies, frameless window behavior, and MSVC setup.
- [Roadmap & TODOs](todos.md): Milestone progress and feature breakdown for upcoming phases.
