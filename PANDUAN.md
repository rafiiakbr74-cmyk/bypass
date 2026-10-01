# A2 — Panduan Deploy (Khusus HP Android, TANPA CLI) 📱🚀

Bot Discord **A2** dengan **satu command: `/bypass`** + tombol **📋 Copy**, plus website A2.
Engine bypass-nya **100% gratis, self-hosted, tanpa API key**.

> **Kamu cuma butuh HP Android + browser.**
> GAK perlu install Node.js, npm, Git, GitHub CLI, Termux, flyctl, atau tool apa pun.
> **Render** yang install dependency & jalanin project-nya.
> Alur: **Upload ke GitHub (lewat browser) → Render Web Service → Isi Environment Variables → Deploy.**

---

## 0. Jawaban jujur: "Bisa 100% bypass key Delta?"

**Tidak bisa 100% gratis.**

| Bagian | Bisa gratis? | Kenapa |
|---|---|---|
| **LootLabs / Loot-Link** (`loot-link.com`, `lootlabs.gg`, ...) | ✅ **BISA** | Payload base64, bisa di-decode |
| **Linkvertise biasa** | ✅ **BISA** | Ada endpoint GraphQL publik |
| **AdF.ly / ouo.io / shortener** | ✅ **BISA** | Redirect bisa diikutin |
| **Platoboost** (`auth.platorelay.com/a?d=...`) ← dipakai Delta sekarang | ❌ **GAK BISA** | SPA + JS di-obfuscate + anti-bot |
| **Linkvertise premium-only** | ❌ GAK BISA | Ada "WaitTask" nunggu 1 jam |
| **Work.ink / Sub2Unlock / Rekonise** | ❌ GAK BISA | Wajib solve captcha / social task |

> Kalau key Delta kamu keluar link **LootLabs** → bot A2 bisa bypass.
> Kalau keluar **Platoboost** → **gak ada tool gratis** yang bisa (memang anti-bypass).
> Yang "katanya 100%" itu API **berbayar** (izen.lol dll). A2 bisa dipasang itu sebagai
> fallback **opsional** (bagian 6) — tapi default-nya tetap 100% gratis.

---

## 1. Yang kamu butuhin (semua dari HP)

- **Browser** (Chrome/Edge/Firefox)
- Akun **Discord**
- Akun **GitHub** → https://github.com/join (gratis)
- Akun **Render** → https://render.com (daftar pakai akun GitHub, gratis)

---

## 2. Bikin Bot Discord (Developer Portal) — dari HP

1. Buka https://discord.com/developers/applications → **New Application** → nama **A2** → **Create**.
2. Tab **Bot** → **Reset Token** → **Copy**. → ini **`DISCORD_TOKEN`** (RAHASIA!).
   - Scroll ke **Privileged Gateway Intents** — **gak perlu** diaktifin.
3. Tab **General Information** → Copy **Application ID** → ini **`DISCORD_CLIENT_ID`**.
4. (Opsional) Tab **Bot** → **App Icon** → upload logo `bot/avatar.png` (logo "A2" udah disiapin).

> ⚠️ File `auth2_discord.txt` yang kamu upload isinya **Client Secret**. Itu **TIDAK dipakai**
> buat jalanin bot (yang dipakai cuma **Bot Token**). Karena udah ke-share, **segera Reset**
> di *General Information → Client Secret → Reset Secret*.

---

## 3. Upload project ke GitHub — LEWAT BROWSER (tanpa Git)

1. Buka https://github.com/new → **Repository name:** `a2` → **Create repository**.
2. Klik **Add file → Upload files** (atau "uploading an existing file").
3. **Extract dulu `a2.zip`** di HP (pakai File Manager / ZArchiver).
   Upload **SEMUA isi folder `a2`** ke GitHub:
   - **JANGAN upload `node_modules`** (kalau ada) — Render yang bikin.
   - Pastikan struktur tetap: ada folder `lib/`, `bot/`, `api/`, dan file
     `package.json`, `package-lock.json`, `server.js`, `index.html`, `render.yaml`.
4. **Commit changes**.

> 💡 Tips Android: kalau upload lewat browser HP susah, pakai **GitHub app** (Play Store),
> atau aktifin **"Desktop site"** di Chrome.

---

## 4. Buat Web Service di Render (GRATIS)

1. Buka https://dashboard.render.com → **New +** → **Web Service**.
2. Pilih repo **a2** → **Connect**.
3. Isi:
   - **Name:** `a2`
   - **Region:** (yang deket, mis. Singapore)
   - **Branch:** `main`
   - **Language/Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run bot`
   - **Instance Type:** **Free**
   - **Health Check Path:** `/api/health`
4. Klik **Create Web Service**.

> ⚠️ **JANGAN pilih "Background Worker"** — di Render free tier itu **berbayar**.
> Project A2 sengaja dibikin sebagai **Web Service** (bot + website jadi satu, buka port
> + `/api/health`) supaya bisa **gratis** dan tetap hidup.

---

## 5. Isi Environment Variables di Render (satu per satu)

Di dashboard Render → service **a2** → tab **Environment** → **Add Environment Variable**:

**WAJIB:**

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | Bot Token kamu (tab Bot) |
| `DISCORD_CLIENT_ID` | Application ID kamu |

**OPSIONAL:**

| Key | Value | Fungsi |
|---|---|---|
| `DISCORD_GUILD_ID` | ID server kamu | Biar `/bypass` muncul **langsung** (kalau kosong: global, ~1 jam) |
| `BOT_AVATAR_URL` | URL gambar | Ganti avatar bot saat startup |
| `IZEN_API_KEY` | key izen.lol | Fallback berbayar (biar tetap gratis: **kosongin**) |
| `IZEN_API_BASE` | `https://api.izen.lol` | Base URL fallback berbayar |

> `PORT` **gak perlu diisi** — Render nyediain otomatis.

**Cara dapetin `DISCORD_GUILD_ID`:** Discord → **Settings → Advanced → Developer Mode ON** →
klik kanan server → **Copy Server ID**.

Klik **Save Changes** → Render **redeploy otomatis**.

> ✅ Command `/bypass` **didaftarkan OTOMATIS** oleh bot saat start.
> Kamu **gak perlu** jalanin `npm run bot:deploy` di Render.

---

## 6. Deploy & cek

1. Tunggu deploy selesai. Buka tab **Logs**.
2. Kalau muncul:
   ```
   ✅ A2 web jalan di port 10000
   ✅ Logged in as A2#xxxx
   ✅ Command /bypass terdaftar di server xxxxx (langsung muncul)
   ```
   → **BERHASIL**. 🎉

> 🔁 **Anti-tidur:** Render free tier tidur kalau gak ada trafik ~15 menit. A2 udah ada
> **self-ping otomatis** (pakai `RENDER_EXTERNAL_URL`). Kalau masih suka tidur, tambah
> **pinger gratis** dari HP: https://uptimerobot.com atau https://cron-job.org → monitor
> ke `https://a2-xxxx.onrender.com/api/health`, interval 5 menit.

---

## 7. Undang bot & tes `/bypass`

**Undang bot** — buka link ini di browser HP (Client ID kamu udah diisiin):
```
https://discord.com/api/oauth2/authorize?client_id=1537994622972723240&permissions=19456&scope=bot%20applications.commands
```
Pilih server → **Authorize** (izin cuma: View Channels, Send Messages, Embed Links).

**Tes di Discord:**
```
/bypass url:https://loot-link.com/s?xxxxxxxx
```
Bot bales **embed** berisi link yang udah ke-unlock + tombol **📋 Copy**.

---

## 8. Tombol 📋 Copy (cara kerjanya — jujur)

Setelah `/bypass` berhasil, muncul tombol **📋 Copy** di pesan hasil.

**Kenyataan teknisnya (biar jujur):** bot Discord **TIDAK bisa** nulis langsung ke
clipboard HP kamu — Discord **tidak menyediakan API** untuk itu. Jadi tombolnya bekerja
sebagai **helper copy paling dekat & jujur**:

1. Tekan tombol **📋 Copy**.
2. Muncul pesan (cuma kamu yang lihat / *ephemeral*) berisi hasilnya dalam **code block**.
3. **Tekan & tahan (long-press)** teks itu → pilih **Copy**. ✅

Hasil yang di-copy **sama persis** dengan yang ditampilkan. Ini pakai mekanisme
**Discord-native** (code block + long-press) yang paling nyaman di **Discord mobile**.
Gak ada klaim palsu "sudah tercopy otomatis".

---

## 9. Yang bisa & gak bisa di-bypass

**✅ GRATIS:** LootLabs / Loot-Link / Loot-Dest · Linkvertise · AdF.ly / AdFoc.us ·
ouo.io / ouo.press · 1000+ shortener biasa (tinyurl, is.gd, bit.ly, ...)

**❌ GAK BISA GRATIS:** Work.ink / Workink · Sub2Unlock / Sub4Unlock · Rekonise ·
Lockr.social · Linkvertise premium-only · apa pun di balik Cloudflare Turnstile /
reCAPTCHA · **Platoboost** (`auth.platorelay.com`).

---

## 10. Troubleshooting (dari HP)

| Masalah | Solusi |
|---|---|
| Deploy gagal / "build failed" | Pastikan `package.json` ada di **root** repo. Build Command = `npm install` |
| Log: `DISCORD_TOKEN tidak ada` | Belum diisi di Render → **Environment**. Nama harus persis `DISCORD_TOKEN` |
| Command `/bypass` gak muncul | Isi `DISCORD_GUILD_ID` → Save (redeploy). Restart app Discord |
| Bot online tapi gak bales | Cek log; pastikan bot punya izin **Send Messages** + **Embed Links** |
| Render "sleep" | Buka URL website `https://a2-xxxx.onrender.com` buat bangunin, atau pakai pinger |
| Bypass gagal terus | Link-nya Platoboost / captcha-gated (lihat bagian 9) |
| Mau update kode | Edit file di web GitHub → Commit → Render auto-redeploy |

---

## 11. Struktur file (yang harus ada di GitHub)

```
a2/
  index.html            Website A2 (1 file)
  server.js             Entry: website + API + bot   (npm start)
  render.yaml           Blueprint Render (opsional)
  api/bypass.js         Serverless function (Vercel, opsional)
  lib/
    freebypass.js       *** Engine bypass GRATIS (inti) ***
    bypass.js           Entry utama (gratis dulu, izen opsional)
    app.js              Express app (dipakai server.js & bot/index.js)
  bot/
    index.js            Entry bot + web   (npm run bot) ← Start Command Render
    bot.js              Logika bot + /bypass + tombol Copy + auto-register
    deploy-commands.js  Daftarin command manual (opsional)
    invite.js           Cetak link undangan bot
    avatar.png          Logo A2 (512x512)
  PANDUAN.md            File ini
  README.md             Dokumentasi teknis (English)
  package.json
  package-lock.json
  .env.example
```

---

## 12. Ringkasan alur (buat kamu yang cuma pakai HP)

```
1. Bikin bot di Discord Developer Portal  →  copy BOT TOKEN + APPLICATION ID
2. Upload project ke GitHub (lewat browser)  →  Commit
3. Render: New + → Web Service  →  pilih repo a2
4. Build Command: npm install     Start Command: npm run bot
5. Render → Environment  →  isi DISCORD_TOKEN + DISCORD_CLIENT_ID (+ GUILD_ID)  →  Save
6. Tunggu log: "✅ Logged in as A2" + "✅ Command /bypass terdaftar"
7. Buka link undangan bot  →  Authorize ke server kamu
8. Di Discord:  /bypass url:https://loot-link.com/s?xxxx  →  tekan 📋 Copy  →  beres! 🔗⚡
```

Selamat! Bot **A2** kamu siap dipakai dari HP, tanpa install apa pun. 🎉
