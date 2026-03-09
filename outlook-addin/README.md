# TalentWharf — Outlook Add-in

One-click candidate capture from Outlook emails, with the same functionality as the Chrome extension.

## Beta user install (30 seconds)

1. Open [Outlook on the web](https://outlook.office.com)
2. Go to **Settings** → **Mail** → **Customize actions** → **Add apps** (or use the direct link below)
3. Click **Add a custom add-in** → **Add from URL**
4. Paste this manifest URL:
   ```
   https://gimenezhenrique28-a11y.github.io/Talent-Wharf/manifest.xml
   ```
5. Open any email → click **Add to Wharf** in the ribbon
6. Enter your `wharf_sk_...` API key in the Settings gear on first use

> **Note:** The add-in is deployed automatically from this repo via GitHub Actions whenever `outlook-addin/` changes on `main`.

---

## How it works

1. Open any email in Outlook
2. Click **Add to Wharf** in the ribbon
3. The task pane shows the sender's name, email address, and subject context
4. Click **Add to Wharf** to save them to your TalentWharf pipeline
5. Use the **Settings** gear to configure your API key (syncs across devices via Office Roaming Settings)

---

## Files

```
outlook-addin/
├── manifest.xml      # Office add-in manifest — points to GitHub Pages
├── taskpane.html     # Task pane UI
├── taskpane.js       # Office.js logic
├── taskpane.css      # Styles
├── commands.html     # Required function file (no-op)
└── assets/
    ├── icon-16.png
    ├── icon-32.png
    └── icon-80.png   # Add-in icons (provide your own PNGs)
```

## Deployment

The add-in is hosted on **GitHub Pages** and deployed automatically by `.github/workflows/deploy-outlook-addin.yml` on every push to `main` that touches `outlook-addin/`. No manual steps needed after merging.

Live URL: `https://gimenezhenrique28-a11y.github.io/Talent-Wharf/`

### One-time GitHub setup (repo settings, done once)

1. Go to **repo Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Push to `main` — the workflow handles the rest

---

## Org-wide deployment (Microsoft 365 admin)

To push to all users without any action on their part:

1. Go to [admin.microsoft.com](https://admin.microsoft.com) → **Settings** → **Integrated apps**
2. Click **Upload custom apps** → **Office Add-in**
3. Paste the manifest URL: `https://gimenezhenrique28-a11y.github.io/Talent-Wharf/manifest.xml`
4. Assign to users/groups and deploy

---

## Configuration

In the add-in task pane, open **Settings** (gear icon) to set:

| Setting | Description |
|---------|-------------|
| **API Key** | Your TalentWharf API key (`wharf_sk_...`) — found in the dashboard under Settings |
| **Endpoint URL** | Leave as default unless self-hosting |

Settings are saved via Office Roaming Settings and sync across all Outlook clients automatically.

---

## Compatibility

| Client | Support |
|--------|---------|
| Outlook on the Web | ✅ |
| New Outlook (Windows) | ✅ |
| Outlook 2016+ (Classic, Windows) | ✅ |
| Outlook for Mac | ✅ |
| Outlook Mobile (iOS/Android) | ⚠️ Limited task pane support |

Requires Office.js Mailbox requirement set **1.3** or higher.
