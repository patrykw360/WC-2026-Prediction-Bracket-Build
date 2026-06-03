# WC 2026 Predictions — Site Files

The site is now split into separate files so errors are easy to locate and you only edit one file for setup.

## Files

| File | What it is | Do you edit it? |
|------|-----------|-----------------|
| `index.html` | Page structure. Links the other files. | No |
| `styles.css` | All styling. | Only to change appearance |
| `config.js` | **Your Supabase keys.** | ✅ **YES — edit this** |
| `data.js` | All 104 matches (IDs match your database). | Only if schedule changes |
| `app.js` | All app logic (predictions, saving, leaderboard, groups, admin). | No |

## Setup (the only step)

1. Open **`config.js`** in any text editor
2. Replace the two placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // ← your Project URL
   const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';   // ← your anon public key
   ```
   Find both in Supabase → **Settings → API**.
3. Save.

That's it. If you forget this step, the site now shows a clear "Setup needed" message instead of a cryptic console error.

## Deploying to GitHub Pages

Upload **all five files** to the root of your repo (same folder), keeping their names:

```
patrykw360.github.io/
├── index.html
├── styles.css
├── config.js      ← with your keys filled in
├── data.js
└── app.js
```

Commit and push. GitHub Pages serves them together automatically — no build step.

> **Important:** all five files must be in the same folder. `index.html` loads the others by relative path (`styles.css`, `config.js`, etc.).

## How loading works

`index.html` loads scripts in this order, which matters:

1. **Supabase library** (from CDN) — defines the `supabase` global
2. **config.js** — creates the `sb` client from your keys
3. **data.js** — defines the match data
4. **app.js** — runs the app, using `sb` and the match data

If you ever see an "uncaught" error in the browser console (press **F12** → Console), the file name and line number now point to exactly which file to look in.

## Troubleshooting

**"Setup needed" message appears**
→ You haven't filled in `config.js` yet. Edit it and re-upload.

**"Could not connect to Supabase"**
→ The URL or key in `config.js` is wrong. Re-copy them from Supabase Settings → API.

**Blank page, console says "supabase is not defined"**
→ The CDN didn't load (network blip, or you're offline). Refresh.

**Console error mentions app.js + a line number**
→ Open app.js, go to that line. Tell me the error text and line and I'll fix it.
