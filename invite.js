// bot/invite.js
// Prints the OAuth2 invite URL for the bot.
//   node bot/invite.js
import 'dotenv/config';

const clientId = process.env.DISCORD_CLIENT_ID;
if (!clientId) {
  console.error('❌ Missing DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

// Minimal permissions a slash-command bot needs:
//   View Channels (1024) + Send Messages (2048) + Embed Links (16384) = 19456
const permissions = '19456';
const scopes = 'bot applications.commands';

const url =
  `https://discord.com/api/oauth2/authorize?client_id=${clientId}` +
  `&permissions=${permissions}&scope=${encodeURIComponent(scopes)}`;

console.log('\n🔗 Invite your bot with this URL:\n');
console.log(url + '\n');
console.log('Permissions: View Channels, Send Messages, Embed Links');
