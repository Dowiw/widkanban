# WidKanban — Google Tasks OAuth Setup Guide

This guide walks you through setting up a **Google Cloud OAuth 2.0 Client** to enable native 1-click **"Sign in with Google"** and **silent background token refresh** in WidKanban.

> [!NOTE]
> WidKanban uses a native local loopback server (`http://127.0.0.1:<PORT>`) to capture your Google authorization response directly. Tokens are stored exclusively in native OS storage (`credentials.json`) and never exposed to browser context.

---

## Table of Contents

- [Why OAuth 2.0 & Desktop Client?](#why-oauth-20--desktop-client)
- [Part 1: Create Project & Enable Google Tasks API](#part-1-create-project--enable-google-tasks-api)
- [Part 2: Configure OAuth Consent Screen & Test Users (Crucial)](#part-2-configure-oauth-consent-screen--test-users-crucial)
- [Part 3: Create Desktop OAuth Client Credentials](#part-3-create-desktop-oauth-client-credentials)
- [Part 4: 1-Click "Sign in with Google" in WidKanban](#part-4-1-click-sign-in-with-google-in-widkanban)
- [Part 5: Silent Auto-Refresh & Quota Monitoring](#part-5-silent-auto-refresh--quota-monitoring)
- [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Why OAuth 2.0 & Desktop Client?

- **No Expiring Tokens**: Standard Google access tokens (`ya29...`) expire after exactly 60 minutes. WidKanban's native loopback flow captures a permanent `refresh_token` (`1//...`), allowing WidKanban to renew tokens silently in the background forever without prompting you again.
- **Why "Desktop app" is Required**: Google Cloud strictly prohibits dynamic localhost ports for "Web application" clients, but explicitly permits loopback IP redirects (`http://127.0.0.1:<PORT>`) on any port for **Desktop apps**.

---

## Part 1: Create Project & Enable Google Tasks API

### Step 1: Open Google Cloud Console
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with the Google account whose tasks you want to synchronize.
3. In the top project dropdown, select an existing project or click **New Project** (e.g., name it `WidKanban-Desktop`).

<!-- SCREENSHOT PLACEHOLDER: Google Cloud Project Selection -->
![Step 1: Selecting or creating a Google Cloud project](images/google/01-project-selection.png)

---

### Step 2: Enable the Google Tasks API
1. In the left navigation menu, go to **APIs & Services** → **Enabled APIs & Services**.
2. Click **+ ENABLE APIS AND SERVICES** at the top.
3. Search for **Google Tasks API** and click on it.
4. Click the blue **Enable** button.

<!-- SCREENSHOT PLACEHOLDER: Enabling Google Tasks API -->
![Step 2: Enabling Google Tasks API](images/google/02-enable-tasks-api.png)

---

## Part 2: Configure OAuth Consent Screen & Test Users (Crucial)

### Step 3: Configure Consent Screen
1. In the left menu, select **APIs & Services** → **OAuth consent screen** (or **Google Auth Platform** → **Branding**).
2. Set **User Type** to **External** and click **Create**.
3. Fill in the basic app details:
   - **App name**: `WidKanban`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.

<!-- SCREENSHOT PLACEHOLDER: OAuth Consent Screen Setup -->
![Step 3: Configuring app branding and contact email](images/google/03-consent-screen-setup.png)

---

### Step 4: Add Yourself as a Test User (Prevents Error 403)

> [!IMPORTANT]
> If your project's publishing status is **"Testing"**, Google will block any login attempt with **`Error 403: access_denied`** unless your email address is registered as an authorized test user!

1. In the left navigation, click **Audience** (or advance to the **Test users** step).
2. Under **Test users**, click **+ Add users**.
3. Enter your Google account email address (the exact email you will sign in with).
4. Click **Save**.
5. Confirm your email appears in the test users table.

<!-- SCREENSHOT PLACEHOLDER: Adding Test User in Audience -->
![Step 4: Adding your email under Test Users in Audience](images/google/04-add-test-user.png)

---

## Part 3: Create Desktop OAuth Client Credentials

### Step 5: Create OAuth Client ID
1. In the left navigation, go to **Credentials** (or **Clients**).
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.

<!-- SCREENSHOT PLACEHOLDER: Create Credentials Dropdown -->
![Step 5: Create Credentials dropdown](images/google/05-create-credentials.png)

---

### Step 6: Select "Desktop app" Application Type

> [!WARNING]
> Do NOT select "Web application"! You must select **Desktop app** so Google allows dynamic loopback port redirects (`http://127.0.0.1:<PORT>`) without redirect URI mismatch errors.

1. Under **Application type**, choose **Desktop app**.
2. **Name**: `WidKanban Client` (or any descriptive name).
3. Click **Create**.

<!-- SCREENSHOT PLACEHOLDER: Desktop App Selection -->
![Step 6: Choosing Desktop app application type](images/google/06-select-desktop-app.png)

---

### Step 7: Copy Client ID and Client Secret
1. A dialog will appear displaying **Your Client ID** and **Your Client Secret**.
2. Both values are **mandatory**:
   - Copy the **Client ID** (`xxxx.apps.googleusercontent.com`).
   - Copy the **Client Secret** (`GOCSPX-...`).
3. *(Optional)* Click **DOWNLOAD JSON** to keep a local backup (e.g. `client_secret_...json`).

<!-- SCREENSHOT PLACEHOLDER: Client ID and Client Secret Dialog -->
![Step 7: Copying Client ID and Client Secret](images/google/07-copy-credentials.png)

---

## Part 4: 1-Click "Sign in with Google" in WidKanban

### Step 8: Enter Credentials in WidKanban
1. Open WidKanban and click **Settings (gear icon)** → **Integrations** tab.
2. Under **Google Tasks**, click **OAuth App Settings & Setup Guide** to expand the credentials drawer.
3. Paste your **Client ID** and **Client Secret**.
4. Click **Save Credentials**.

<!-- SCREENSHOT PLACEHOLDER: WidKanban Google OAuth Settings Drawer -->
![Step 8: Entering Client ID and Client Secret in WidKanban](images/google/08-widkanban-oauth-settings.png)

---

### Step 9: Click "Sign in with Google"
1. Click the primary **Sign in with Google (Recommended)** button.
2. WidKanban will display: *"Waiting for Google sign-in in browser..."*.
3. Your default web browser will automatically open with Google's consent screen.

<!-- SCREENSHOT PLACEHOLDER: Sign in with Google Button & Waiting State -->
![Step 9: Sign in with Google waiting state](images/google/09-sign-in-button.png)

---

### Step 10: Complete Authorization in Browser
1. Select your Google account.
2. If prompted with *"Google hasn't verified this app"*:
   - Click **Advanced** (or *Continue*).
   - Click **Go to WidKanban (unsafe)**.
3. Review permissions (*"Create, edit, organize, and delete all your tasks"*).
4. Click **Continue / Allow**.

<!-- SCREENSHOT PLACEHOLDER: Google Permissions Screen -->
![Step 10: Google permissions consent screen](images/google/10-google-consent.png)

---

### Step 11: Success Confirmation
1. The browser tab will immediately load the confirmation page:
   > **WidKanban**  
   > **Authentication Successful!**  
   > *Your Google account is now connected with offline auto-refresh enabled. You can safely close this browser window and return to WidKanban.*
2. Close the browser tab and return to WidKanban.
3. WidKanban will now show <span style="color:#10b981;font-weight:600;">Connected (Auto-Refresh)</span> and your Google Tasks lists will appear on your board!

<!-- SCREENSHOT PLACEHOLDER: Browser Success Page & WidKanban Connected Badge -->
![Step 11: Browser confirmation and WidKanban connected badge](images/google/11-auth-success.png)

---

## Part 5: Silent Auto-Refresh & Quota Monitoring

1. Open WidKanban Settings and switch to the **Auto-Sync & Quota** tab.
2. In the **Google Tasks API & OAuth** card, verify:
   - **Status**: `Active (Auto-Refresh)`
   - **Sync Mode**: `Auto-Refresh (Persistent)`
   - **Access Token**: Countdown display showing the current 1-hour access token.
   - **Silent Auto-Refresh Notice**: Confirms that WidKanban will automatically renew expired access tokens using your stored refresh token before background sync runs.

<!-- SCREENSHOT PLACEHOLDER: Google Tasks Card in Auto-Sync Tab -->
![Google Tasks Auto-Refresh & Quota Health Card](images/google/12-google-health-card.png)

---

## Troubleshooting & FAQ

### 1. `Error 403: access_denied`
- **Cause**: Your Google Cloud project is in "Testing" mode and your Google email is not listed in the Test Users table.
- **Fix**: Go to Google Cloud Console → **Audience** (or OAuth consent screen) → **Test users** → Click **+ Add users** → enter your email and click **Save**.

### 2. `Error 400: redirect_uri_mismatch`
- **Cause**: You selected "Web application" instead of "Desktop app" when creating your OAuth Client ID.
- **Fix**: In Google Cloud Console → **Credentials**, create a new OAuth Client ID with Application type set to **Desktop app**.

### 3. `client_secret is missing`
- **Cause**: Google strictly requires the Client Secret when exchanging the authorization code.
- **Fix**: Open WidKanban Settings → **OAuth App Settings & Setup Guide**, paste your `Client Secret` (`GOCSPX-...`), and click **Save Credentials**.

### 4. Can I use environment variables instead of the UI?
- **Yes!** You can add them to your [`.env`](file:///e:/projects/widkanban/.env) file:
  ```env
  WIDKANBAN_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
  WIDKANBAN_GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
  ```
  WidKanban will automatically load them on startup.

### 5. Fallback: Google OAuth Playground (1-hour temporary testing)
- If you don't want to create a Google Cloud project, expand **Manual Access Token (Fallback)** in WidKanban Settings and paste a short-lived token from [OAuth Playground](https://developers.google.com/oauthplayground) with scope `https://www.googleapis.com/auth/tasks`.
