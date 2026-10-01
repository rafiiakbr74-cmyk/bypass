# A2 — TODO

## 1. Pertahankan project asli (done)
- [x] Struktur api/ lib/ bot/ dipertahankan (tidak di-flatten)
- [x] Engine freebypass.js TIDAK diubah
- [x] Fitur existing dipertahankan

## 2. package.json (done)
- [x] type: module, engines node >=18
- [x] scripts persis: start/dev/bot/bot:deploy/bot:invite
- [x] deps: discord.js, dotenv, express
- [x] package-lock.json ada

## 3. Render Web Service (done)
- [x] Build Command: npm install
- [x] Start Command: npm run bot
- [x] bot/index.js buka PORT + /api/health (biar Web Service gratis tetap hidup)
- [x] render.yaml startCommand: npm run bot
- [x] keep-alive self-ping (RENDER_EXTERNAL_URL)

## 4. Environment Variables (done)
- [x] .env.example template KOSONG: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, BOT_AVATAR_URL, IZEN_API_KEY, IZEN_API_BASE, PORT
- [x] Tidak ada credential hardcoded
- [x] Bot baca process.env.DISCORD_TOKEN + DISCORD_CLIENT_ID

## 5. Discord bot (done)
- [x] /bypass dipertahankan
- [x] Error jelas kalau DISCORD_TOKEN kosong (tidak crash)
- [x] Tidak print token/API key ke console
- [x] Auto-register command saat start

## 6. Command deployment (done)
- [x] bot:deploy -> bot/deploy-commands.js
- [x] bot:invite -> bot/invite.js
- [x] Import path benar

## 7. Server (done)
- [x] server.js + endpoint dipertahankan (dipindah ke lib/app.js, dipakai server.js)
- [x] PORT = process.env.PORT || 3000
- [x] Tidak nunggu input terminal

## 8. Security (done)
- [x] .gitignore: .env, .env.*, node_modules/, *.log
- [x] !.env.example (tetap ke-track)
- [x] Tidak ada token/secret/password di source

## 9. FITUR COPY /bypass (done)
- [x] Tombol 📋 Copy di pesan hasil /bypass (discord.js v14 ButtonBuilder)
- [x] Mekanisme jujur: ephemeral + code block (long-press -> Copy)
- [x] Hasil yang di-copy SAMA PERSIS dengan yang ditampilkan
- [x] Bukan tombol palsu (tidak klaim "Copied!" tanpa copy)
- [x] Engine bypass TIDAK diubah

## 10. Validasi final (done)
- [x] Semua import path OK (diuji)
- [x] npm start OK, npm run bot OK (bind port + health)
- [x] npm run bot:deploy / bot:invite OK
- [x] Token invalid -> error jelas, tidak crash, web tetap jalan
- [x] Copy extraction mengembalikan hasil identik

## 11. Package & deliver (done)
- [x] Repackage a2.zip (struktur folder tetap terbaca)
- [x] PANDUAN.md + README.md diperbarui
- [x] Kirim ke user
