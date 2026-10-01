// lib/app.js
// Shared Express app factory.
// Used by BOTH entry points so the website + API work no matter how you start:
//   • server.js      -> npm start   (website + bot)
//   • bot/index.js   -> npm run bot (bot + website, so Render Web Service has a port)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bypassUrl } from './bypass.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// index.html lives in the project root (one level up from /lib).
const ROOT = path.join(__dirname, '..');

export function createApp() {
  const app = express();

  app.use(express.json());

  // --- API ---
  app.post('/api/bypass', async (req, res) => {
    try {
      const { url, refresh } = req.body || {};
      const out = await bypassUrl(url, { refresh: !!refresh });
      res.json(out);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, code: e.code });
    }
  });

  // Health check (Render uses this to know the service is alive).
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'A2', ts: Date.now() }));
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'A2', ts: Date.now() }));

  // --- Frontend (single self-contained file) ---
  app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));

  return app;
}

// Starts the web server on the given port (defaults to process.env.PORT || 3000).
export function startWebServer(port = process.env.PORT || 3000) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`✅ A2 web jalan di port ${port}`);
  });
}

// Optional keep-alive self-ping (prevents Render FREE tier from sleeping).
export function startKeepAlive() {
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (!selfUrl) return;
  const pingUrl = selfUrl.replace(/\/$/, '') + '/api/health';
  setInterval(() => {
    fetch(pingUrl).catch(() => {});
  }, 10 * 60 * 1000); // every 10 minutes
  console.log(`🔁 Keep-alive aktif (self-ping ${pingUrl} tiap 10 menit).`);
}
