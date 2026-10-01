# A2 — Free Link Bypasser + Discord Bot

A **free, self-hosted** link-bypass engine with a **Discord bot** (single `/bypass` command) and an optional web app. No paid API key required.

```
Discord:  /bypass <url>  ->  your bot  ->  free bypass engine  ->  embed with the unlocked link
Web:      Browser        ->  your backend -> free bypass engine ->  result
```

The engine runs entirely on your machine/server. It does **not** call any paid service.

> 🇮🇩 **Panduan step-by-step (Bahasa Indonesia) ada di [`PANDUAN.md`](PANDUAN.md)** — khusus **HP Android tanpa CLI**: upload ke GitHub lewat browser → deploy di **Render** → isi **Environment Variables**. Termasuk jawaban jujur soal bypass key Delta.
>
> ⚙️ **One service does everything:** `npm run bot` (the Render **Start Command**) runs the Discord bot **and** the website in a single process — it binds an HTTP port + `/api/health`, so it works on Render's **free Web Service** and stays alive. The `/bypass` command is **auto-registered** on startup. `npm start` does the same thing.

---

## What it can bypass (free, no captcha)

| Service | Domains | Method |
| --- | --- | --- |
| **LootLabs / Loot-Link / Loot-Dest** | `loot-reward.com`, `loot-link.com`, `lootlabs.gg`, `lootlinks.com`, `lootdest.com`, … | Decodes the base64 `cc` payload |
| **Linkvertise** | `linkvertise.com`, `direct-link.net`, `link-target.net`, `link-center.net`, `link-hub.net`, … | GraphQL `linkByIdentifier` lookup |
| **AdF.ly / AdFoc.us** | `adf.ly`, `adfoc.us`, `fbcity.net`, `j.gs`, `q.gs` | `ysmm` XOR decode |
| **ouo.io / ouo.press** | `ouo.io`, `ouo.press` | meta-refresh / JS redirect extract |
| **1000+ generic shorteners** | tinyurl, is.gd, bit.ly, rebrand.ly, … | HTTP + HTML redirect following |

## What CANNOT be bypassed for free

These are **captcha / social-task gated** — a free script genuinely cannot solve them:

- **Work.ink / Workink**
- **Sub2Unlock / Sub4Unlock / SubFinal**
- **Rekonise**
- **Lockr.social**
- **Premium-only Linkvertise links** (1-hour wait / premium task)
- Anything behind **Cloudflare Turnstile / reCAPTCHA**

> Honesty note: "bypass everything for free" is not real. The services above require a
> human to solve a captcha or complete a social task. The paid `izen.lol` API exists
> precisely because it farms those captchas. This project handles everything that is
> *actually* solvable without one.

---

## Why NOT a headless browser ("bot masuk ke website")

The original idea was Puppeteer + Chromium driving the bypass site's web form. It fails:

1. **Captcha.** The web forms are protected by Cloudflare **Turnstile** — a headless browser cannot solve it.
2. **Cloudflare bot protection.** Automated Chromium gets challenged or blocked.
3. **Serverless limits.** `puppeteer-core` + `@sparticuz/chromium` is 50–100 MB+ and needs a writable `/tmp`; it blows past free-tier limits.

So instead of a browser, this project talks **directly to each service's own (public) endpoints** — which is faster, lighter, and 100% free.

---

## Files

```
a2/
  index.html            Web frontend (single self-contained file)
  server.js             Entry: website + API + bot        (npm start)
  render.yaml           Render Blueprint (optional)
  api/bypass.js         Vercel serverless function (optional)
  lib/
    freebypass.js       *** The free bypass engine (no key needed) ***
    bypass.js           Unified entry (free first, optional izen.lol fallback)
    app.js              Express app factory (shared by server.js & bot/index.js)
  bot/
    index.js            Entry: bot + web server            (npm run bot) ← Render Start Command
    bot.js              Bot logic + /bypass + 📋 Copy button + auto-register
    deploy-commands.js  Manual command registration (optional)
    invite.js           Prints the OAuth2 invite URL (min permissions)
    avatar.png          Ready-made "A2" logo (512x512)
  PANDUAN.md            Step-by-step guide (Bahasa Indonesia, no-CLI)
  package.json
  package-lock.json
  vercel.json
  .env.example
  .gitignore
  README.md
```

---

## Quick start — Discord bot

### 1. Install
```bash
cd a2
npm install
cp .env.example .env
```

### 2. Create the Discord application
1. Go to https://discord.com/developers/applications → **New Application**.
2. **Bot** tab → **Reset Token** → copy into `DISCORD_TOKEN`.
3. **General Information** → copy **Application ID** into `DISCORD_CLIENT_ID`.
4. (Optional) set a **custom avatar** in the Bot tab, or via `BOT_AVATAR_URL` in `.env`. A ready-made logo is included at `bot/avatar.png` — upload it in the Discord Developer Portal → Bot → **App Icon**.

### 3. Register the command
**On Render you do NOT need this step** — the bot auto-registers `/bypass` on startup.
For local use you can still run it manually:
```bash
npm run bot:deploy
```
Tip: put your server ID in `DISCORD_GUILD_ID` first → the command appears **instantly** in that server. Without it, it registers globally (up to ~1 hour).

### 4. Invite the bot
```bash
npm run bot:invite
```
Open the printed URL. It requests only the minimum: **View Channels, Send Messages, Embed Links** (`permissions=19456`) with scopes `bot applications.commands`.

Ready-made invite URL for this app (Client ID `1537994622972723240`):
```
https://discord.com/api/oauth2/authorize?client_id=1537994622972723240&permissions=19456&scope=bot%20applications.commands
```

### 5. Run
```bash
npm run bot     # bot + web server  (this is the Render Start Command)
npm start       # website + bot together
```
In Discord: `/bypass url:https://loot-link.com/s?...` → the bot replies with an embed containing the unlocked link **and a 📋 Copy button**.

### 6. The 📋 Copy button (honest behaviour)
Discord bots **cannot** write to a user's device clipboard — Discord provides no such API.
So the button is a **Discord-native copy helper**: pressing it sends an **ephemeral**
(only-you) message with the result in a **code block**, which you **long-press → Copy** on
Discord mobile. The copied text is **exactly** the displayed result. No fake "Copied!" claim.

---

## Quick start — web app (optional)

```bash
npm start            # http://localhost:3000
```
The frontend POSTs to `/api/bypass`, which uses the same free engine. No key required.

---

## Optional paid fallback (izen.lol)

The free engine already covers LootLabs, Linkvertise, AdF.ly, ouo.io and 1000+ shorteners.
If you *also* want to solve the captcha-gated links (Work.ink, Sub2Unlock, premium-only…),
buy a key at https://izen.lol and set it:

```env
IZEN_API_KEY=your_key
```

`lib/bypass.js` then runs **free-first, izen-fallback**: it tries the free engine, and only
if that fails does it call the paid API. Leave the key blank to stay 100% free.

---

## Deploy

### Render (recommended — runs the bot AND the website in ONE free Web Service)
The included `render.yaml` configures everything automatically.

1. Upload the repo to GitHub (no CLI needed — you can use the GitHub website).
2. https://dashboard.render.com → **New +** → **Blueprint** → pick the repo → **Apply**.
   (Or **New + → Web Service** manually: Build **`npm install`**, Start **`npm run bot`**,
   Instance **Free**, Health Check Path `/api/health`.)
3. In **Environment**, add:
   - `DISCORD_TOKEN` (**required**)
   - `DISCORD_CLIENT_ID` (**required**)
   - `DISCORD_GUILD_ID` (optional — recommended → instant command registration)
   - `BOT_AVATAR_URL` (optional)
   - `IZEN_API_KEY` / `IZEN_API_BASE` (optional — paid fallback; leave blank to stay free)
   - `PORT` — **not needed** (Render provides it)
4. Save → Render redeploys. Check **Logs** for `✅ Logged in as …` and `✅ Command /bypass terdaftar`.

> **Do NOT use a "Background Worker"** on Render — it is paid. A2 is built to run as a
> **Web Service** (it opens an HTTP port + `/api/health`), which is free and keeps the bot alive.

### Vercel (website only — no bot)
1. Push to GitHub → import at https://vercel.com.
2. Deploy. `index.html` is static; `api/bypass.js` becomes `/api/bypass`.

> The Discord bot is a long-running process → run it on Render/Railway/a VPS (or your own machine), not on Vercel.

---

## Caveats

- Bypassing ad-gated links can violate those services' Terms of Service and deprives creators of ad revenue. Use responsibly and at your own risk.
- The free methods rely on each service's public endpoints; if a service changes its API, that specific handler may need updating.
- Never expose secrets in the frontend.
