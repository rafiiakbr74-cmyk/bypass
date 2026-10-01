// bot/index.js
// Run with:  npm run bot     (this is the Render Start Command)
//
// Starts the Discord bot AND a small web server.
// Why a web server here? Render's FREE tier only offers "Web Services", which
// MUST bind an HTTP port and answer a health check. Binding the port keeps the
// bot alive for free. The website + API are served too (bonus).
import 'dotenv/config';
import { startWebServer, startKeepAlive } from '../lib/app.js';
import { startBot } from './bot.js';

const PORT = process.env.PORT || 3000;

startWebServer(PORT);
startKeepAlive();

// Start the Discord bot (reads DISCORD_TOKEN from the environment).
startBot();
