# TalentWharf — Outlook Add-in

One-click candidate capture from Outlook emails, with the same functionality as the Chrome extension.

## How it works

1. Open any email in Outlook
2. Click **Add to Wharf** in the ribbon
3. The task pane shows the sender's name, email address, and subject context
4. Click **Add to Wharf** to save them to your TalentWharf pipeline
5. Use the **Settings** gear to configure your API key (syncs across devices via Office Roaming Settings)

## Files

```
outlook-addin/
├── manifest.xml      # Office add-in manifest — register with Outlook
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

The add-in files must be served over **HTTPS**. Options:

- **Vercel / Netlify / GitHub Pages** — drag the `outlook-addin/` folder or deploy via CLI
- **Azure Static Web Apps** — natural fit for Office add-ins
- **Any static file host** — as long as it serves over HTTPS with correct CORS headers

Once hosted, replace every `https://REPLACE_WITH_YOUR_HOST` placeholder in `manifest.xml` with your actual URL (e.g. `https://addin.yourcompany.com`).

## Installing the add-in

### Outlook on the Web / New Outlook (personal testing)
1. Open Outlook on the web → Settings → **Integrated apps** → **Upload custom app**
2. Upload `manifest.xml`

### Microsoft 365 Admin Center (org-wide deployment)
1. Go to **admin.microsoft.com** → **Settings** → **Integrated apps**
2. Upload `manifest.xml` and assign to users

### Outlook Desktop (sideloading for development)
1. In Outlook desktop: **File** → **Options** → **Trust Center** → **Trust Center Settings** → **Trusted Add-in Catalogs**
2. Add a network share path containing `manifest.xml`
3. Or use the [Office Add-in Sideloader](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-office-add-ins-for-testing)

## Local development

Serve the files locally over HTTPS (required by Outlook):

```bash
# Install dev cert tool once
npm install -g office-addin-dev-certs

# Generate local HTTPS cert
npx office-addin-dev-certs install

# Serve (use any static HTTPS server, e.g. http-server with --ssl)
npx http-server . --ssl --cert ~/.office-addin-dev-certs/localhost.crt --key ~/.office-addin-dev-certs/localhost.key -p 3000
```

Then update `manifest.xml` to use `https://localhost:3000` and sideload it.

## Configuration

In the add-in task pane, open **Settings** (gear icon) to set:

| Setting | Description |
|---------|-------------|
| **API Key** | Your TalentWharf API key (`wharf_sk_...`) — found in the dashboard under Settings |
| **Endpoint URL** | Leave as default unless self-hosting: `https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/extension-capture` |

Settings are saved via Office Roaming Settings and sync across all Outlook clients.

## Compatibility

| Client | Support |
|--------|---------|
| Outlook on the Web | ✅ |
| New Outlook (Windows) | ✅ |
| Outlook 2016+ (Classic, Windows) | ✅ |
| Outlook for Mac | ✅ |
| Outlook Mobile (iOS/Android) | ⚠️ Task pane add-ins have limited mobile support |

Requires Office.js Mailbox requirement set **1.3** or higher.
