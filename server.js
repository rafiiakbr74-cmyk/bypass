// server.js
// Run with:  npm start   (or npm run dev)
// Starts the A2 website + API, and ALSO the Discord bot if DISCORD_TOKEN is set.
// PORT is read from process.env.PORT (Render sets it) or defaults to 3000.
import 'dotenv/config';
import { startWebServer, startKeepAlive } from './lib/app.js';

const PORT = process.env.PORT || 3000;

startWebServer(PORT);
startKeepAlive();

// Start the Discord bot in the SAME process (if a token is configured).
if (process.env.DISCORD_TOKEN) {
  import('./bot/bot.js')
    .then(({ startBot }) => startBot())
    .catch((e) => console.error('❌ Bot error:', e.message));
} else {
  console.log('ℹ️  DISCORD_TOKEN kosong — jalan mode web aja (bot tidak aktif).');
}
